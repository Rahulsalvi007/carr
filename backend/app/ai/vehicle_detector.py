import cv2
import os
import torch
import numpy as np
from typing import List, Dict, Any, Tuple
from ultralytics import YOLO
from backend.app.config import settings

try:
    torch.set_num_threads(os.cpu_count() or 4)
except Exception:
    pass

# COCO Class mapping for relevant road objects
COCO_CLASSES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}

VEHICLE_CLASSES = {"car", "motorcycle", "bus", "truck", "bicycle"}

class VehicleDetector:
    def __init__(self, model_name: str = settings.YOLO_VEHICLE_MODEL):
        print(f"[VehicleDetector] Initializing YOLO model: {model_name}")
        self.model = YOLO(model_name)
        self.confidence_threshold = settings.VEHICLE_THRESHOLD

    def set_threshold(self, threshold: float):
        self.confidence_threshold = float(threshold)

    def detect_and_track(self, frame: np.ndarray, persist: bool = True) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Runs YOLO object detection and ByteTrack tracking.
        Returns:
            vehicles: List of detected vehicles with track IDs, bounding boxes, confidence, class name
            persons: List of detected persons (riders/pedestrians) with track IDs, bounding boxes, confidence
        """
        if frame is None or frame.size == 0:
            return [], []

        h, w = frame.shape[:2]

        try:
            if persist:
                results = self.model.track(
                    source=frame,
                    persist=True,
                    classes=list(COCO_CLASSES.keys()),
                    conf=self.confidence_threshold,
                    tracker="bytetrack.yaml",
                    imgsz=320,
                    verbose=False
                )
            else:
                results = self.model.predict(
                    source=frame,
                    classes=list(COCO_CLASSES.keys()),
                    conf=self.confidence_threshold,
                    imgsz=320,
                    verbose=False
                )
        except Exception as e:
            # Fallback to simple predict if tracker encounters issue
            print(f"[VehicleDetector] Tracking exception: {e}, falling back to predict")
            results = self.model.predict(
                source=frame,
                classes=list(COCO_CLASSES.keys()),
                conf=self.confidence_threshold,
                imgsz=320,
                verbose=False
            )

        vehicles = []
        persons = []

        if not results or len(results) == 0:
            return vehicles, persons

        res = results[0]
        boxes = res.boxes

        if boxes is None or len(boxes) == 0:
            return vehicles, persons

        for idx, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].cpu().numpy().astype(int)
            x1, y1, x2, y2 = max(0, xyxy[0]), max(0, xyxy[1]), min(w, xyxy[2]), min(h, xyxy[3])

            track_id = None
            if box.id is not None:
                track_id = int(box.id[0].item())
            else:
                # generate a transient identifier based on position index
                track_id = idx + 1

            label = COCO_CLASSES.get(cls_id, "unknown")

            item = {
                "track_id": track_id,
                "label": label.capitalize(),
                "confidence": round(conf, 3),
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "crop": frame[y1:y2, x1:x2] if (y2 > y1 and x2 > x1) else None
            }

            if label in VEHICLE_CLASSES:
                vehicles.append(item)
            elif label == "person":
                persons.append(item)

        return vehicles, persons
