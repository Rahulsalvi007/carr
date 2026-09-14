from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.database.connection import get_db
from backend.app.database import crud

router = APIRouter(prefix="", tags=["Vehicles & Detections"])

class DetectionUpdateRequest(BaseModel):
    vehicle_type: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    source_type: Optional[str] = None
    notes: Optional[str] = None

class BulkDeleteRequest(BaseModel):
    ids: List[int]

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
        plate = r.vehicle.plate_number if r.vehicle else None
        power = r.vehicle.power_type if r.vehicle else None
        data.append({
            "id": r.id,
            "vehicle_id": r.vehicle_id,
            "vehicle_type": r.vehicle_type,
            "confidence": r.confidence,
            "bbox": r.bbox_json,
            "plate_number": plate,
            "power_type": power,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "source_type": r.source_type,
            "notes": r.notes
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "detections": data
    }

@router.delete("/detections/clear")
def clear_all_detections(
    vehicle_type: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    count = crud.clear_all_detections(db=db, vehicle_type=vehicle_type, source_type=source_type)
    return {
        "status": "success",
        "deleted_count": count,
        "message": f"Cleared {count} detection records"
    }

@router.post("/detections/bulk-delete")
def bulk_delete_detections(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db)
):
    count = crud.bulk_delete_detections(db=db, ids=payload.ids)
    return {
        "status": "success",
        "deleted_count": count,
        "message": f"{count} detection records deleted successfully"
    }

@router.get("/detections/{id}")
def get_detection(
    id: int,
    db: Session = Depends(get_db)
):
    rec = crud.get_detection_by_id(db=db, detection_id=id)
    if not rec:
        raise HTTPException(status_code=404, detail="Detection record not found")
    return {
        "id": rec.id,
        "vehicle_id": rec.vehicle_id,
        "vehicle_type": rec.vehicle_type,
        "confidence": rec.confidence,
        "bbox": rec.bbox_json,
        "timestamp": rec.timestamp.isoformat() if rec.timestamp else None,
        "source_type": rec.source_type,
        "notes": rec.notes
    }

@router.patch("/detections/{id}")
def update_detection(
    id: int,
    payload: DetectionUpdateRequest,
    db: Session = Depends(get_db)
):
    rec = crud.update_detection(
        db=db,
        detection_id=id,
        vehicle_type=payload.vehicle_type,
        confidence=payload.confidence,
        source_type=payload.source_type,
        notes=payload.notes
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Detection record not found")
    return {
        "status": "success",
        "message": f"Detection record #{id} updated successfully",
        "detection": {
            "id": rec.id,
            "vehicle_id": rec.vehicle_id,
            "vehicle_type": rec.vehicle_type,
            "confidence": rec.confidence,
            "bbox": rec.bbox_json,
            "timestamp": rec.timestamp.isoformat() if rec.timestamp else None,
            "source_type": rec.source_type,
            "notes": rec.notes
        }
    }

@router.delete("/detections/{id}")
def delete_detection(
    id: int,
    db: Session = Depends(get_db)
):
    success = crud.delete_detection(db=db, detection_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Detection record not found")
    return {
        "status": "success",
        "message": f"Detection record #{id} deleted successfully"
    }
