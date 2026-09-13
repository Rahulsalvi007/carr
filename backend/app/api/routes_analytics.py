from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database import crud

router = APIRouter(prefix="", tags=["Analytics"])

@router.get("/analytics")
def get_analytics(
    days: int = Query(7, ge=1, le=365, description="Number of days to aggregate"),
    db: Session = Depends(get_db)
):
    """
    Returns high-level statistics, vehicle distributions, helmet compliance,
    violation counts, and hourly trends for dashboard charts.
    """
    summary = crud.get_analytics_summary(db=db, days=days)
    return summary
