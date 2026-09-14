import datetime
import json
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from backend.app.database.models import Vehicle, NumberPlate, HelmetDetection, Violation, DetectionRecord
from backend.app.config import settings

def get_or_create_vehicle(
    db: Session,
    track_id: Optional[int],
    vehicle_type: str,
    confidence: float,
    power_type: str = "Unknown",
    power_type_confidence: float = 0.0,
    plate_number: Optional[str] = None
) -> Vehicle:
    now = datetime.datetime.utcnow()
    vehicle = None
    if track_id is not None:
        # Search for vehicle seen recently with this track_id (within last 30 minutes)
        recent_threshold = now - datetime.timedelta(minutes=30)
        vehicle = db.query(Vehicle).filter(
            Vehicle.track_id == track_id,
            Vehicle.last_seen >= recent_threshold
        ).first()

    if vehicle:
        vehicle.last_seen = now
        vehicle.confidence = max(vehicle.confidence, confidence)
        if power_type != "Unknown" and vehicle.power_type == "Unknown":
            vehicle.power_type = power_type
            vehicle.power_type_confidence = power_type_confidence
        if plate_number and not vehicle.plate_number:
            vehicle.plate_number = plate_number
        db.commit()
        db.refresh(vehicle)
        return vehicle
    else:
        new_vehicle = Vehicle(
            track_id=track_id,
            vehicle_type=vehicle_type,
            confidence=confidence,
            power_type=power_type,
            power_type_confidence=power_type_confidence,
            plate_number=plate_number,
            first_seen=now,
            last_seen=now
        )
        db.add(new_vehicle)
        db.commit()
        db.refresh(new_vehicle)
        return new_vehicle

def log_detection(
    db: Session,
    vehicle_id: Optional[int],
    vehicle_type: str,
    confidence: float,
    bbox: List[int],
    frame_id: Optional[int] = None,
    source_type: str = "LIVE",
    notes: Optional[str] = None
) -> DetectionRecord:
    record = DetectionRecord(
        vehicle_id=vehicle_id,
        frame_id=frame_id,
        vehicle_type=vehicle_type,
        confidence=confidence,
        bbox_json=json.dumps(bbox),
        timestamp=datetime.datetime.utcnow(),
        source_type=source_type,
        notes=notes
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

def log_number_plate(
    db: Session,
    vehicle_id: Optional[int],
    plate_number: str,
    ocr_confidence: float,
    raw_text: Optional[str] = None
) -> NumberPlate:
    rec = NumberPlate(
        vehicle_id=vehicle_id,
        plate_number=plate_number,
        ocr_confidence=ocr_confidence,
        raw_text=raw_text,
        detected_at=datetime.datetime.utcnow()
    )
    db.add(rec)
    if vehicle_id:
        veh = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if veh and not veh.plate_number:
            veh.plate_number = plate_number
    db.commit()
    db.refresh(rec)
    return rec

def log_helmet_detection(
    db: Session,
    vehicle_id: Optional[int],
    helmet_status: str,
    confidence: float
) -> HelmetDetection:
    rec = HelmetDetection(
        vehicle_id=vehicle_id,
        helmet_status=helmet_status,
        confidence=confidence,
        detected_at=datetime.datetime.utcnow()
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec

def create_violation(
    db: Session,
    violation_type: str,
    vehicle_type: str,
    confidence: float,
    snapshot_path: Optional[str],
    vehicle_id: Optional[int] = None,
    plate_number: Optional[str] = None,
    notes: Optional[str] = None
) -> Violation:
    violation = Violation(
        vehicle_id=vehicle_id,
        vehicle_type=vehicle_type,
        plate_number=plate_number,
        violation_type=violation_type,
        confidence=confidence,
        snapshot_path=snapshot_path,
        timestamp=datetime.datetime.utcnow(),
        status="ACTIVE",
        notes=notes
    )
    db.add(violation)
    db.commit()
    db.refresh(violation)
    return violation

def get_violations(
    db: Session,
    violation_type: Optional[str] = None,
    status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    date_from: Optional[datetime.datetime] = None,
    date_to: Optional[datetime.datetime] = None,
    skip: int = 0,
    limit: int = 50
) -> (List[Violation], int):
    query = db.query(Violation)
    if violation_type:
        query = query.filter(Violation.violation_type == violation_type)
    if status:
        query = query.filter(Violation.status == status)
    if vehicle_type:
        query = query.filter(Violation.vehicle_type == vehicle_type)
    if date_from:
        query = query.filter(Violation.timestamp >= date_from)
    if date_to:
        query = query.filter(Violation.timestamp <= date_to)

    total = query.count()
    violations = query.order_by(desc(Violation.timestamp)).offset(skip).limit(limit).all()
    return violations, total

def get_violation_by_id(db: Session, violation_id: int) -> Optional[Violation]:
    return db.query(Violation).filter(Violation.id == violation_id).first()

def update_violation_status(db: Session, violation_id: int, new_status: str) -> Optional[Violation]:
    vio = db.query(Violation).filter(Violation.id == violation_id).first()
    if vio:
        vio.status = new_status
        db.commit()
        db.refresh(vio)
    return vio

def delete_violation(db: Session, violation_id: int) -> bool:
    vio = db.query(Violation).filter(Violation.id == violation_id).first()
    if vio:
        if vio.snapshot_path:
            try:
                snap_file = settings.VIOLATIONS_PATH / vio.snapshot_path
                if snap_file.exists():
                    snap_file.unlink()
            except Exception:
                pass
        db.delete(vio)
        db.commit()
        return True
    return False

def bulk_delete_violations(db: Session, ids: List[int]) -> int:
    if not ids:
        return 0
    # Clean up physical snapshots for deleted violations
    viols = db.query(Violation).filter(Violation.id.in_(ids)).all()
    for v in viols:
        if v.snapshot_path:
            try:
                snap_file = settings.VIOLATIONS_PATH / v.snapshot_path
                if snap_file.exists():
                    snap_file.unlink()
            except Exception:
                pass
    deleted_count = db.query(Violation).filter(Violation.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return deleted_count

def clear_all_violations(
    db: Session,
    violation_type: Optional[str] = None,
    status: Optional[str] = None
) -> int:
    query = db.query(Violation)
    if violation_type and violation_type.upper() != "ALL":
        query = query.filter(Violation.violation_type == violation_type)
    if status and status.upper() != "ALL":
        query = query.filter(Violation.status == status)
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return deleted_count

def get_vehicles(db: Session, skip: int = 0, limit: int = 50):
    total = db.query(Vehicle).count()
    vehicles = db.query(Vehicle).order_by(desc(Vehicle.last_seen)).offset(skip).limit(limit).all()
    return vehicles, total

def get_detections_history(
    db: Session,
    vehicle_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    query = db.query(DetectionRecord)
    if vehicle_type:
        query = query.filter(DetectionRecord.vehicle_type == vehicle_type)
    total = query.count()
    records = query.order_by(desc(DetectionRecord.timestamp)).offset(skip).limit(limit).all()
    return records, total

def get_detection_by_id(db: Session, detection_id: int) -> Optional[DetectionRecord]:
    return db.query(DetectionRecord).filter(DetectionRecord.id == detection_id).first()

def update_detection(
    db: Session,
    detection_id: int,
    vehicle_type: Optional[str] = None,
    confidence: Optional[float] = None,
    source_type: Optional[str] = None,
    notes: Optional[str] = None,
    bbox: Optional[List[int]] = None
) -> Optional[DetectionRecord]:
    rec = db.query(DetectionRecord).filter(DetectionRecord.id == detection_id).first()
    if not rec:
        return None
    if vehicle_type is not None:
        rec.vehicle_type = vehicle_type
    if confidence is not None:
        rec.confidence = float(confidence)
    if source_type is not None:
        rec.source_type = source_type
    if notes is not None:
        rec.notes = notes
    if bbox is not None:
        rec.bbox_json = json.dumps(bbox)
    db.commit()
    db.refresh(rec)
    return rec

def delete_detection(db: Session, detection_id: int) -> bool:
    rec = db.query(DetectionRecord).filter(DetectionRecord.id == detection_id).first()
    if rec:
        db.delete(rec)
        db.commit()
        return True
    return False

def bulk_delete_detections(db: Session, ids: List[int]) -> int:
    if not ids:
        return 0
    deleted_count = db.query(DetectionRecord).filter(DetectionRecord.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return deleted_count

def clear_all_detections(
    db: Session,
    vehicle_type: Optional[str] = None,
    source_type: Optional[str] = None
) -> int:
    query = db.query(DetectionRecord)
    if vehicle_type and vehicle_type.upper() != "ALL":
        query = query.filter(DetectionRecord.vehicle_type == vehicle_type)
    if source_type and source_type.upper() != "ALL":
        query = query.filter(DetectionRecord.source_type == source_type)
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return deleted_count

def get_analytics_summary(db: Session, days: int = 7) -> Dict[str, Any]:
    since = datetime.datetime.utcnow() - datetime.timedelta(days=days)

    total_vehicles = db.query(Vehicle).filter(Vehicle.last_seen >= since).count()
    cars_count = db.query(Vehicle).filter(Vehicle.last_seen >= since, Vehicle.vehicle_type.ilike("%car%")).count()
    bikes_count = db.query(Vehicle).filter(Vehicle.last_seen >= since, Vehicle.vehicle_type.ilike("%motorcycle%")).count()
    buses_count = db.query(Vehicle).filter(Vehicle.last_seen >= since, Vehicle.vehicle_type.ilike("%bus%")).count()
    trucks_count = db.query(Vehicle).filter(Vehicle.last_seen >= since, Vehicle.vehicle_type.ilike("%truck%")).count()

    evs_count = db.query(Vehicle).filter(Vehicle.last_seen >= since, Vehicle.power_type == "Electric").count()
    fuel_count = db.query(Vehicle).filter(Vehicle.last_seen >= since, Vehicle.power_type == "Conventional/Fuel").count()
    unknown_ev_count = db.query(Vehicle).filter(Vehicle.last_seen >= since, Vehicle.power_type == "Unknown").count()

    total_violations = db.query(Violation).filter(Violation.timestamp >= since).count()
    helmet_violations = db.query(Violation).filter(Violation.timestamp >= since, Violation.violation_type == "NO_HELMET").count()
    missing_plate_violations = db.query(Violation).filter(Violation.timestamp >= since, Violation.violation_type == "MISSING_PLATE").count()
    unreadable_plate_violations = db.query(Violation).filter(Violation.timestamp >= since, Violation.violation_type == "UNREADABLE_PLATE").count()

    safe_helmets = db.query(HelmetDetection).filter(HelmetDetection.detected_at >= since, HelmetDetection.helmet_status == "YES").count()
    no_helmets = db.query(HelmetDetection).filter(HelmetDetection.detected_at >= since, HelmetDetection.helmet_status == "NO").count()
    total_helmets_evaluated = safe_helmets + no_helmets
    helmet_compliance_rate = round((safe_helmets / total_helmets_evaluated * 100), 1) if total_helmets_evaluated > 0 else 100.0

    # Hourly counts for last 24h
    last_24h = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    detections_24h = db.query(DetectionRecord).filter(DetectionRecord.timestamp >= last_24h).all()
    hourly_distribution = {}
    for i in range(24):
        hourly_distribution[f"{i:02d}:00"] = 0
    for d in detections_24h:
        if d.timestamp:
            hour_str = d.timestamp.strftime("%H:00")
            hourly_distribution[hour_str] = hourly_distribution.get(hour_str, 0) + 1

    hourly_data = [{"hour": k, "count": v} for k, v in hourly_distribution.items()]

    return {
        "summary": {
            "total_vehicles": total_vehicles,
            "cars": cars_count,
            "bikes": bikes_count,
            "buses": buses_count,
            "trucks": trucks_count,
            "evs": evs_count,
            "fuel_vehicles": fuel_count,
            "unknown_power": unknown_ev_count,
            "total_violations": total_violations,
            "helmet_violations": helmet_violations,
            "missing_plate_violations": missing_plate_violations,
            "unreadable_plate_violations": unreadable_plate_violations,
            "helmet_compliance_rate": helmet_compliance_rate
        },
        "hourly_trend": hourly_data,
        "vehicle_breakdown": [
            {"name": "Cars", "value": cars_count, "color": "#3B82F6"},
            {"name": "Bikes", "value": bikes_count, "color": "#10B981"},
            {"name": "Buses", "value": buses_count, "color": "#F59E0B"},
            {"name": "Trucks", "value": trucks_count, "color": "#8B5CF6"},
        ],
        "violation_types": [
            {"type": "No Helmet", "count": helmet_violations},
            {"type": "Missing Plate", "count": missing_plate_violations},
            {"type": "Unreadable Plate", "count": unreadable_plate_violations}
        ],
        "power_distribution": [
            {"type": "Electric", "count": evs_count},
            {"type": "Conventional Fuel", "count": fuel_count},
            {"type": "Unknown", "count": unknown_ev_count}
        ]
    }
