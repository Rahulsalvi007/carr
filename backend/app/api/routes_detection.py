import os
import cv2
import uuid
import time
from typing import Optional, Dict, Any, List
import numpy as np
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database import crud
from backend.app.config import settings
from backend.app.ai.pipeline import AIPipeline

router = APIRouter(prefix="", tags=["Detection"])

# Global singleton AI pipeline instance
pipeline_instance = None

def get_pipeline():
    global pipeline_instance
    if pipeline_instance is None:
        pipeline_instance = AIPipeline()
    return pipeline_instance

@router.post("/detect/image")
async def detect_image(
    file: UploadFile = File(...),
    detection_mode: str = Query("combined", description="Detection mode: combined, objects, or traffic"),
    object_threshold: Optional[float] = Query(None, description="Confidence threshold for general objects"),
    category: Optional[str] = Query(None, description="Filter specific category (e.g. People, Electronics, Animals)"),
    db: Session = Depends(get_db),
    pipeline: AIPipeline = Depends(get_pipeline)
):
    """
    Analyzes an uploaded image for vehicles, license plates, helmets, EVs, safety violations,
    and 80-class general objects (People, Animals, Electronics, Daily Objects, Traffic).
    Returns structured detections, object categories, and base64-annotated image.
    """
    is_valid_image = (
        (file.content_type and file.content_type.startswith("image/")) or
        (file.filename and file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff')))
    )
    if not is_valid_image:
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (JPEG, PNG, etc.)")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image file.")

    # Save original image to uploads
    orig_filename = f"img_{int(time.time())}_{uuid.uuid4().hex[:6]}.jpg"
    orig_filepath = settings.UPLOADS_PATH / orig_filename
    cv2.imwrite(str(orig_filepath), image)

    # Process frame through dedicated vehicle vision pipeline
    start_time = time.time()
    result = pipeline.process_frame(
        image,
        persist_tracking=False
    )
    inference_ms = round((time.time() - start_time) * 1000, 1)

    # Persist detected vehicles, plates, helmet checks, and violations to DB
    for v in result["vehicles"]:
        veh_record = crud.get_or_create_vehicle(
            db=db,
            track_id=None,
            vehicle_type=v["vehicle_type"],
            confidence=v["confidence"],
            power_type=v["power_type"],
            power_type_confidence=v["power_type_confidence"],
            plate_number=v["plate_info"].get("plate_number") if v["plate_info"].get("detected") else None
        )

        # Log Detection Record
        crud.log_detection(
            db=db,
            vehicle_id=veh_record.id,
            vehicle_type=v["vehicle_type"],
            confidence=v["confidence"],
            bbox=v["bbox"],
            source_type="IMAGE"
        )

        # Log Plate
        p_info = v["plate_info"]
        if p_info.get("detected"):
            crud.log_number_plate(
                db=db,
                vehicle_id=veh_record.id,
                plate_number=p_info.get("plate_number", "Uncertain"),
                ocr_confidence=p_info.get("ocr_confidence", 0.0),
                raw_text=p_info.get("raw_text")
            )

        # Log Helmet
        h_info = v["helmet_info"]
        if h_info and h_info.get("rider_detected"):
            crud.log_helmet_detection(
                db=db,
                vehicle_id=veh_record.id,
                helmet_status=h_info.get("helmet_status"),
                confidence=h_info.get("confidence")
            )

    # Persist Violations
    created_violations = []
    for viol in result["violations"]:
        v_rec = crud.create_violation(
            db=db,
            violation_type=viol["violation_type"],
            vehicle_type=viol["vehicle_type"],
            confidence=viol["confidence"],
            snapshot_path=viol["snapshot_path"],
            plate_number=viol.get("plate_number"),
            notes=viol.get("notes")
        )
        created_violations.append({
            "id": v_rec.id,
            "violation_type": v_rec.violation_type,
            "vehicle_type": v_rec.vehicle_type,
            "confidence": v_rec.confidence,
            "snapshot_url": f"/api/snapshots/{v_rec.snapshot_path}" if v_rec.snapshot_path else None,
            "notes": v_rec.notes,
            "timestamp": v_rec.timestamp.isoformat()
        })

    annotated_b64 = pipeline.frame_to_base64(result["annotated_frame"])

    return {
        "status": "success",
        "inference_ms": inference_ms,
        "counts": result["counts"],
        "objects": result.get("objects", []),
        "object_counts": result.get("object_counts", {}),
        "vehicles": [
            {
                "vehicle_type": v["vehicle_type"],
                "confidence": v["confidence"],
                "bbox": v["bbox"],
                "power_type": v["power_type"],
                "power_type_confidence": v["power_type_confidence"],
                "plate": v["plate_info"],
                "helmet": v["helmet_info"],
                "has_violation": v["has_violation"]
            }
            for v in result["vehicles"]
        ],
        "violations": created_violations,
        "annotated_image": f"data:image/jpeg;base64,{annotated_b64}"
    }

@router.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    frame_skip: int = Query(2, ge=1, le=10, description="Process every Nth frame for performance"),
    detection_mode: str = Query("combined", description="Detection mode: combined, objects, or traffic"),
    object_threshold: Optional[float] = Query(None, description="Confidence threshold for general objects"),
    category: Optional[str] = Query(None, description="Filter specific category"),
    db: Session = Depends(get_db),
    pipeline: AIPipeline = Depends(get_pipeline)
):
    """
    Processes an uploaded video file frame-by-frame.
    Generates annotated output video, logs all tracked vehicles, violations,
    and general objects, and returns comprehensive statistics and output video path.
    """
    video_ext = os.path.splitext(file.filename)[1] or ".mp4"
    temp_in_filename = f"upload_{int(time.time())}_{uuid.uuid4().hex[:6]}{video_ext}"
    temp_in_path = settings.UPLOADS_PATH / temp_in_filename

    # Save uploaded file
    contents = await file.read()
    with open(temp_in_path, "wb") as f:
        f.write(contents)

    cap = cv2.VideoCapture(str(temp_in_path))
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Unable to open video file. Invalid or corrupted codec.")

    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    orig_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    out_filename = f"annotated_{int(time.time())}_{uuid.uuid4().hex[:6]}.mp4"
    out_filepath = settings.OUTPUTS_PATH / out_filename

    # Video writer with mp4v codec
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out_fps = max(1.0, orig_fps / float(frame_skip))
    out_writer = cv2.VideoWriter(str(out_filepath), fourcc, out_fps, (orig_w, orig_h))

    frame_idx = 0
    processed_count = 0
    start_time = time.time()
    total_violations_found = 0
    unique_tracked_vehicles = set()
    total_object_detections = 0
    aggregate_object_counts = {}

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % frame_skip != 0:
                continue

            processed_count += 1
            result = pipeline.process_frame(
                frame,
                frame_id=frame_idx,
                persist_tracking=True
            )

            # Count general objects
            for obj_item in result.get("objects", []):
                lbl = obj_item.get("label", "unknown")
                aggregate_object_counts[lbl] = aggregate_object_counts.get(lbl, 0) + 1
                total_object_detections += 1

            # Persist to database
            for v in result["vehicles"]:
                track_id = v.get("track_id")
                if track_id:
                    unique_tracked_vehicles.add(track_id)

                veh_record = crud.get_or_create_vehicle(
                    db=db,
                    track_id=track_id,
                    vehicle_type=v["vehicle_type"],
                    confidence=v["confidence"],
                    power_type=v["power_type"],
                    power_type_confidence=v["power_type_confidence"],
                    plate_number=v["plate_info"].get("plate_number") if v["plate_info"].get("detected") else None
                )

                crud.log_detection(
                    db=db,
                    vehicle_id=veh_record.id,
                    vehicle_type=v["vehicle_type"],
                    confidence=v["confidence"],
                    bbox=v["bbox"],
                    frame_id=frame_idx,
                    source_type="VIDEO"
                )

                p_info = v["plate_info"]
                if p_info.get("detected"):
                    crud.log_number_plate(
                        db=db,
                        vehicle_id=veh_record.id,
                        plate_number=p_info.get("plate_number", "Uncertain"),
                        ocr_confidence=p_info.get("ocr_confidence", 0.0),
                        raw_text=p_info.get("raw_text")
                    )

                h_info = v["helmet_info"]
                if h_info and h_info.get("rider_detected"):
                    crud.log_helmet_detection(
                        db=db,
                        vehicle_id=veh_record.id,
                        helmet_status=h_info.get("helmet_status"),
                        confidence=h_info.get("confidence")
                    )

            for viol in result["violations"]:
                total_violations_found += 1
                crud.create_violation(
                    db=db,
                    violation_type=viol["violation_type"],
                    vehicle_type=viol["vehicle_type"],
                    confidence=viol["confidence"],
                    snapshot_path=viol["snapshot_path"],
                    plate_number=viol.get("plate_number"),
                    notes=viol.get("notes")
                )

            out_writer.write(result["annotated_frame"])

    finally:
        cap.release()
        out_writer.release()
        try:
            if temp_in_path.exists():
                temp_in_path.unlink()
        except Exception:
            pass

    duration_sec = round(time.time() - start_time, 2)
    avg_fps = round(processed_count / duration_sec, 1) if duration_sec > 0 else 0

    return {
        "status": "success",
        "total_frames_analyzed": processed_count,
        "processing_time_sec": duration_sec,
        "processing_fps": avg_fps,
        "unique_vehicles_tracked": len(unique_tracked_vehicles),
        "total_violations_recorded": total_violations_found,
        "total_objects_detected": total_object_detections,
        "object_counts": aggregate_object_counts,
        "output_video_url": f"/api/download/video/{out_filename}",
        "filename": out_filename
    }

@router.get("/download/video/{filename}")
async def download_video(filename: str):
    file_path = settings.OUTPUTS_PATH / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Processed video file not found.")
    return FileResponse(path=str(file_path), media_type="video/mp4", filename=filename)

@router.get("/detect/demo/{sample_name}")
async def detect_demo(
    sample_name: str,
    detection_mode: str = Query("combined", description="Detection mode: combined, objects, or traffic"),
    object_threshold: Optional[float] = Query(None, description="Confidence threshold for general objects"),
    category: Optional[str] = Query(None, description="Filter specific category"),
    db: Session = Depends(get_db),
    pipeline: AIPipeline = Depends(get_pipeline)
):
    """
    Runs full AI detection on bundled sample images (bus_traffic.jpg, car_traffic.jpg, motorcycle_rider.jpg).
    Allows instant 1-click testing without manual file selection.
    """
    from pathlib import Path
    clean_name = sample_name
    for ext in [".jpg", ".jpeg", ".png"]:
        if clean_name.lower().endswith(ext):
            clean_name = clean_name[:-len(ext)]
            break
    sample_file = Path(__file__).resolve().parent.parent.parent.parent / "sample_media" / f"{clean_name}.jpg"
    if not sample_file.exists():
        raise HTTPException(status_code=404, detail=f"Demo sample '{sample_name}' not found.")

    image = cv2.imread(str(sample_file))
    if image is None:
        raise HTTPException(status_code=500, detail="Could not read sample image file.")

    start_time = time.time()
    result = pipeline.process_frame(
        image,
        persist_tracking=False,
        detection_mode=detection_mode,
        object_threshold=object_threshold,
        category_filter=category
    )
    inference_ms = round((time.time() - start_time) * 1000, 1)

    for v in result["vehicles"]:
        veh_record = crud.get_or_create_vehicle(
            db=db,
            track_id=None,
            vehicle_type=v["vehicle_type"],
            confidence=v["confidence"],
            power_type=v["power_type"],
            power_type_confidence=v["power_type_confidence"],
            plate_number=v["plate_info"].get("plate_number") if v["plate_info"].get("detected") else None
        )

        crud.log_detection(
            db=db,
            vehicle_id=veh_record.id,
            vehicle_type=v["vehicle_type"],
            confidence=v["confidence"],
            bbox=v["bbox"],
            source_type="IMAGE"
        )

        p_info = v["plate_info"]
        if p_info.get("detected"):
            crud.log_number_plate(
                db=db,
                vehicle_id=veh_record.id,
                plate_number=p_info.get("plate_number", "Uncertain"),
                ocr_confidence=p_info.get("ocr_confidence", 0.0),
                raw_text=p_info.get("raw_text")
            )

        h_info = v["helmet_info"]
        if h_info and h_info.get("rider_detected"):
            crud.log_helmet_detection(
                db=db,
                vehicle_id=veh_record.id,
                helmet_status=h_info.get("helmet_status"),
                confidence=h_info.get("confidence")
            )

    created_violations = []
    for viol in result["violations"]:
        v_rec = crud.create_violation(
            db=db,
            violation_type=viol["violation_type"],
            vehicle_type=viol["vehicle_type"],
            confidence=viol["confidence"],
            snapshot_path=viol["snapshot_path"],
            plate_number=viol.get("plate_number"),
            notes=viol.get("notes")
        )
        created_violations.append({
            "id": v_rec.id,
            "violation_type": v_rec.violation_type,
            "vehicle_type": v_rec.vehicle_type,
            "confidence": v_rec.confidence,
            "snapshot_url": f"/api/snapshots/{v_rec.snapshot_path}" if v_rec.snapshot_path else None,
            "notes": v_rec.notes,
            "timestamp": v_rec.timestamp.isoformat()
        })

    annotated_b64 = pipeline.frame_to_base64(result["annotated_frame"])

    return {
        "status": "success",
        "sample": sample_name,
        "inference_ms": inference_ms,
        "counts": result["counts"],
        "objects": result.get("objects", []),
        "object_counts": result.get("object_counts", {}),
        "vehicles": [
            {
                "vehicle_type": v["vehicle_type"],
                "confidence": v["confidence"],
                "bbox": v["bbox"],
                "power_type": v["power_type"],
                "power_type_confidence": v["power_type_confidence"],
                "plate": v["plate_info"],
                "helmet": v["helmet_info"],
                "has_violation": v["has_violation"]
            }
            for v in result["vehicles"]
        ],
        "violations": created_violations,
        "annotated_image": f"data:image/jpeg;base64,{annotated_b64}"
    }

