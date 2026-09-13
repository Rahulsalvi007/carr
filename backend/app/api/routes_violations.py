from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import datetime
from pydantic import BaseModel
from backend.app.database.connection import get_db
from backend.app.database import crud
from backend.app.config import settings

router = APIRouter(prefix="", tags=["Violations"])

class StatusUpdate(BaseModel):
    status: str

@router.get("/violations")
def list_violations(
    violation_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    vehicle_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    violations, total = crud.get_violations(
        db=db,
        violation_type=violation_type,
        status=status,
        vehicle_type=vehicle_type,
        skip=skip,
        limit=limit
    )

    data = []
    for v in violations:
        data.append({
            "id": v.id,
            "vehicle_id": v.vehicle_id,
            "vehicle_type": v.vehicle_type,
            "plate_number": v.plate_number,
            "violation_type": v.violation_type,
            "confidence": v.confidence,
            "snapshot_url": f"/api/snapshots/{v.snapshot_path}" if v.snapshot_path else None,
            "timestamp": v.timestamp.isoformat() if v.timestamp else None,
            "status": v.status,
            "notes": v.notes
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "violations": data
    }

@router.patch("/violations/{violation_id}/status")
def update_status(
    violation_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db)
):
    valid_statuses = {"ACTIVE", "REVIEWED", "DISMISSED"}
    if payload.status.upper() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    updated = crud.update_violation_status(db, violation_id, payload.status.upper())
    if not updated:
        raise HTTPException(status_code=404, detail="Violation not found.")

    return {
        "status": "success",
        "violation_id": updated.id,
        "new_status": updated.status
    }

@router.get("/snapshots/{filename}")
def serve_snapshot(filename: str):
    file_path = settings.VIOLATIONS_PATH / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Snapshot image not found.")
    return FileResponse(path=str(file_path), media_type="image/jpeg")
