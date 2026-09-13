from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.database.connection import get_db
from backend.app.database import crud

router = APIRouter(prefix="", tags=["Vehicles & Detections"])

@router.get("/vehicles")
def list_vehicles(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    vehicles, total = crud.get_vehicles(db=db, skip=skip, limit=limit)
    
    data = []
    for v in vehicles:
        data.append({
            "id": v.id,
            "track_id": v.track_id,
            "vehicle_type": v.vehicle_type,
            "power_type": v.power_type,
            "power_type_confidence": v.power_type_confidence,
            "confidence": v.confidence,
            "plate_number": v.plate_number,
            "first_seen": v.first_seen.isoformat() if v.first_seen else None,
            "last_seen": v.last_seen.isoformat() if v.last_seen else None,
            "violations_count": len(v.violations) if v.violations else 0
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "vehicles": data
    }

@router.get("/detections")
def list_detections(
    vehicle_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    records, total = crud.get_detections_history(
        db=db,
        vehicle_type=vehicle_type,
        skip=skip,
        limit=limit
    )

    data = []
    for r in records:
        data.append({
            "id": r.id,
            "vehicle_id": r.vehicle_id,
            "vehicle_type": r.vehicle_type,
            "confidence": r.confidence,
            "bbox": r.bbox_json,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "source_type": r.source_type
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "detections": data
    }
