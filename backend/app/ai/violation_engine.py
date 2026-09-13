import os
import time
import uuid
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, List
from backend.app.config import settings

class ViolationEngine:
    """
    Traffic and road safety rule evaluation engine with deduplication and cooldowns.
    Supported Violations:
      1. NO_HELMET: Motorcycle rider operating without a helmet.
      2. MISSING_PLATE: Vehicle operating with no visible number plate.
      3. UNREADABLE_PLATE: License plate obscured, smudged, or unreadable.
    """
    def __init__(self, cooldown_seconds: int = settings.VIOLATION_COOLDOWN_SECONDS):
        self.cooldown_seconds = cooldown_seconds
        # Cooldown cache: (track_id, violation_type) -> last_triggered_timestamp
        self._cooldown_cache: Dict[tuple, float] = {}

    def set_cooldown(self, seconds: int):
        self.cooldown_seconds = int(seconds)

    def _is_in_cooldown(self, track_id: Optional[int], violation_type: str) -> bool:
        if track_id is None:
            return False
        key = (track_id, violation_type)
        now = time.time()
        if key in self._cooldown_cache:
            elapsed = now - self._cooldown_cache[key]
            if elapsed < self.cooldown_seconds:
                return True
        self._cooldown_cache[key] = now
        return False

    def save_violation_snapshot(
        self,
        full_frame: np.ndarray,
        bbox: list,
        violation_type: str,
        label_text: str
    ) -> str:
        """
        Extracts annotated snapshot of violation and saves to disk.
        Returns:
            Relative file path or filename
        """
        h, w = full_frame.shape[:2]
        x1, y1, x2, y2 = bbox

        # Expand bounding box slightly for context
        pad_x = int((x2 - x1) * 0.25)
        pad_y = int((y2 - y1) * 0.25)
        sx1 = max(0, x1 - pad_x)
        sy1 = max(0, y1 - pad_y)
        sx2 = min(w, x2 + pad_x)
        sy2 = min(h, y2 + pad_y)

        snapshot = full_frame[sy1:sy2, sx1:sx2].copy()
        if snapshot.size == 0:
            snapshot = full_frame.copy()

        # Draw red warning border and label banner
        sh, sw = snapshot.shape[:2]
        cv2.rectangle(snapshot, (0, 0), (sw - 1, sh - 1), (0, 0, 255), 4)
        
        # Banner overlay
        banner_h = 32
        cv2.rectangle(snapshot, (0, 0), (sw, banner_h), (0, 0, 200), -1)
        cv2.putText(
            snapshot,
            f"VIOLATION: {violation_type.replace('_', ' ')}",
            (8, 22),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2,
            cv2.LINE_AA
        )

        filename = f"viol_{violation_type.lower()}_{int(time.time())}_{uuid.uuid4().hex[:6]}.jpg"
        filepath = settings.VIOLATIONS_PATH / filename
        cv2.imwrite(str(filepath), snapshot)

        return filename

    def evaluate_vehicle(
        self,
        vehicle: Dict[str, Any],
        full_frame: np.ndarray,
        helmet_info: Optional[Dict[str, Any]] = None,
        plate_info: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluates safety rules against a single detected vehicle.
        Returns list of new violation objects (suppressing duplicates within cooldown).
        """
        violations = []
        track_id = vehicle.get("track_id")
        v_type = vehicle.get("label", "").lower()
        v_bbox = vehicle.get("bbox", [])

        # Rule 1: Motorcycle No Helmet Violation
        if "motorcycle" in v_type and helmet_info:
            if helmet_info.get("is_violation") and helmet_info.get("helmet_status") == "NO":
                h_conf = helmet_info.get("confidence", 0.0)
                if h_conf >= settings.HELMET_THRESHOLD:
                    if not self._is_in_cooldown(track_id, "NO_HELMET"):
                        snapshot_fn = self.save_violation_snapshot(
                            full_frame, v_bbox, "NO_HELMET", f"Rider without Helmet ({int(h_conf * 100)}%)"
                        )
                        violations.append({
                            "violation_type": "NO_HELMET",
                            "vehicle_type": vehicle.get("label"),
                            "track_id": track_id,
                            "confidence": h_conf,
                            "snapshot_path": snapshot_fn,
                            "plate_number": plate_info.get("plate_number") if plate_info else None,
                            "notes": f"Motorcycle rider detected without safety helmet (Confidence: {int(h_conf*100)}%)"
                        })

        # Rule 2: Missing Number Plate Violation (for 4-wheelers and large vehicles)
        # Vehicles with sufficiently large bounding box (prominently visible)
        vw = v_bbox[2] - v_bbox[0] if len(v_bbox) == 4 else 0
        vh = v_bbox[3] - v_bbox[1] if len(v_bbox) == 4 else 0
        frame_h, frame_w = full_frame.shape[:2]

        is_large_enough = (vw > frame_w * 0.15) and (vh > frame_h * 0.15)
        if v_type in ["car", "bus", "truck"] and is_large_enough and vehicle.get("confidence", 0) >= 0.65:
            plate_detected = plate_info.get("detected", False) if plate_info else False
            if not plate_detected:
                if not self._is_in_cooldown(track_id, "MISSING_PLATE"):
                    snapshot_fn = self.save_violation_snapshot(
                        full_frame, v_bbox, "MISSING_PLATE", f"No Visible Number Plate ({int(vehicle.get('confidence') * 100)}%)"
                    )
                    violations.append({
                        "violation_type": "MISSING_PLATE",
                        "vehicle_type": vehicle.get("label"),
                        "track_id": track_id,
                        "confidence": vehicle.get("confidence"),
                        "snapshot_path": snapshot_fn,
                        "plate_number": "MISSING",
                        "notes": "Vehicle detected in surveillance view without a visible number plate"
                    })

        # Rule 3: Unreadable / Smudged Number Plate
        if plate_info and plate_info.get("detected"):
            plate_num = plate_info.get("plate_number")
            ocr_conf = plate_info.get("ocr_confidence", 0.0)
            if plate_num == "Uncertain" and ocr_conf < 0.40 and ocr_conf > 0.10:
                if not self._is_in_cooldown(track_id, "UNREADABLE_PLATE"):
                    snapshot_fn = self.save_violation_snapshot(
                        full_frame, v_bbox, "UNREADABLE_PLATE", "Plate Unreadable"
                    )
                    violations.append({
                        "violation_type": "UNREADABLE_PLATE",
                        "vehicle_type": vehicle.get("label"),
                        "track_id": track_id,
                        "confidence": 0.75,
                        "snapshot_path": snapshot_fn,
                        "plate_number": "Uncertain",
                        "notes": "Plate was localized but characters are smudged, obstructed, or unreadable"
                    })

        return violations
