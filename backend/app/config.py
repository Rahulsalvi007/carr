import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "backend" / "storage"
MODELS_DIR = BASE_DIR / "backend" / "models"

class Settings(BaseSettings):
    APP_NAME: str = "RoadGuard AI - Vehicle & Road Safety Monitoring"
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    
    # Database URL: default SQLite, or PostgreSQL via env
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'traffic_monitoring.db'}"
    
    # Storage directories
    STORAGE_PATH: Path = STORAGE_DIR
    VIOLATIONS_PATH: Path = STORAGE_DIR / "violations"
    UPLOADS_PATH: Path = STORAGE_DIR / "uploads"
    OUTPUTS_PATH: Path = STORAGE_DIR / "outputs"
    
    # Model Weights Paths
    YOLO_VEHICLE_MODEL: str = "yolov8n.pt"
    HELMET_MODEL_PATH: Path = MODELS_DIR / "helmet" / "best.pt"
    PLATE_MODEL_PATH: Path = MODELS_DIR / "plate" / "best.pt"
    EV_MODEL_PATH: Path = MODELS_DIR / "vehicle" / "ev_classifier.pt"
    
    # AI Confidence Thresholds (configurable at runtime via API)
    VEHICLE_THRESHOLD: float = 0.45
    HELMET_THRESHOLD: float = 0.60
    PLATE_THRESHOLD: float = 0.30
    OCR_THRESHOLD: float = 0.30
    EV_THRESHOLD: float = 0.75
    
    # Violation Deduplication Cooldown (seconds)
    VIOLATION_COOLDOWN_SECONDS: int = 60
    
    # Max image dimensions for live streaming optimization
    STREAM_MAX_WIDTH: int = 1280
    STREAM_JPEG_QUALITY: int = 80

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()

# Ensure directories exist
for p in [settings.STORAGE_PATH, settings.VIOLATIONS_PATH, settings.UPLOADS_PATH, settings.OUTPUTS_PATH,
          MODELS_DIR / "vehicle", MODELS_DIR / "helmet", MODELS_DIR / "plate"]:
    p.mkdir(parents=True, exist_ok=True)
