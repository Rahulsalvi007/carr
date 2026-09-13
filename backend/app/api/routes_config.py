import torch
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from backend.app.config import settings
from backend.app.api.routes_detection import get_pipeline
from backend.app.ai.pipeline import AIPipeline

router = APIRouter(prefix="", tags=["Configuration & System"])

class ThresholdsUpdate(BaseModel):
    vehicle_threshold: Optional[float] = Field(None, ge=0.1, le=1.0)
    helmet_threshold: Optional[float] = Field(None, ge=0.1, le=1.0)
    plate_threshold: Optional[float] = Field(None, ge=0.1, le=1.0)
    ocr_threshold: Optional[float] = Field(None, ge=0.1, le=1.0)
    ev_threshold: Optional[float] = Field(None, ge=0.1, le=1.0)
    violation_cooldown_seconds: Optional[int] = Field(None, ge=1, le=600)

@router.get("/config")
def get_config():
    """
    Returns current configuration, thresholds, and model weight paths.
    """
    return {
        "app_name": settings.APP_NAME,
        "thresholds": {
            "vehicle_threshold": settings.VEHICLE_THRESHOLD,
            "helmet_threshold": settings.HELMET_THRESHOLD,
            "plate_threshold": settings.PLATE_THRESHOLD,
            "ocr_threshold": settings.OCR_THRESHOLD,
            "ev_threshold": settings.EV_THRESHOLD,
            "violation_cooldown_seconds": settings.VIOLATION_COOLDOWN_SECONDS
        },
        "models": {
            "yolo_vehicle": settings.YOLO_VEHICLE_MODEL,
            "custom_helmet_model": {
                "path": str(settings.HELMET_MODEL_PATH),
                "loaded": settings.HELMET_MODEL_PATH.exists()
            },
            "custom_plate_model": {
                "path": str(settings.PLATE_MODEL_PATH),
                "loaded": settings.PLATE_MODEL_PATH.exists()
            },
            "custom_ev_model": {
                "path": str(settings.EV_MODEL_PATH),
                "loaded": settings.EV_MODEL_PATH.exists()
            }
        },
        "system": {
            "torch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "device": "CUDA" if torch.cuda.is_available() else "CPU"
        }
    }

@router.post("/config")
def update_config(
    payload: ThresholdsUpdate,
    pipeline: AIPipeline = Depends(get_pipeline)
):
    """
    Dynamically updates AI confidence thresholds and cooldown timings.
    """
    pipeline.update_thresholds(
        vehicle_thresh=payload.vehicle_threshold,
        helmet_thresh=payload.helmet_threshold,
        plate_thresh=payload.plate_threshold,
        ocr_thresh=payload.ocr_threshold,
        ev_thresh=payload.ev_threshold,
        cooldown=payload.violation_cooldown_seconds
    )

    return {
        "status": "success",
        "message": "Configuration updated successfully",
        "current_thresholds": {
            "vehicle_threshold": settings.VEHICLE_THRESHOLD,
            "helmet_threshold": settings.HELMET_THRESHOLD,
            "plate_threshold": settings.PLATE_THRESHOLD,
            "ocr_threshold": settings.OCR_THRESHOLD,
            "ev_threshold": settings.EV_THRESHOLD,
            "violation_cooldown_seconds": settings.VIOLATION_COOLDOWN_SECONDS
        }
    }

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "service": settings.APP_NAME,
        "cuda": torch.cuda.is_available()
    }

@router.get("/network-ip")
def get_network_ip():
    import socket
    local_ip = "127.0.0.1"
    all_ips = []

    try:
        import psutil
        for iface, addrs in psutil.net_if_addrs().items():
            for a in addrs:
                if (a.family == socket.AF_INET and 
                    not a.address.startswith("127.") and 
                    not a.address.startswith("169.254.")):
                    is_wifi = any(k in iface.lower() for k in ["wi-fi", "wifi", "wlan", "wireless"])
                    all_ips.append({
                        "name": iface,
                        "ip": a.address,
                        "is_wifi": is_wifi,
                        "mobile_cam_url": f"https://{a.address}:5173/?tab=mobile-cam"
                    })
        # Sort so Wi-Fi interfaces come first
        all_ips.sort(key=lambda x: 0 if x.get("is_wifi") else 1)
    except Exception:
        pass

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        try:
            local_ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            pass

    # If local_ip is loopback or link-local, fallback to the top LAN IP
    if (local_ip.startswith("127.") or local_ip.startswith("169.254.")) and all_ips:
        local_ip = all_ips[0]["ip"]

    return {
        "ip": local_ip,
        "mobile_url": f"https://{local_ip}:5173",
        "mobile_cam_url": f"https://{local_ip}:5173/?tab=mobile-cam",
        "all_ips": all_ips
    }

