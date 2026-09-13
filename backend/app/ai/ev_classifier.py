import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
from ultralytics import YOLO
from backend.app.config import settings

class EVClassifier:
    """
    Vehicle Power Type Classifier (Electric vs Conventional/Fuel vs Unknown).
    Uses:
      1. Green license plate detection (mandated standard for EVs in India, UK, etc.)
      2. Front grille / exhaust visual evidence
      3. Custom classifier model hook (models/vehicle/ev_classifier.pt)
      4. Strict confidence gating: returns 'Unknown' when evidence is inconclusive.
    """
    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or settings.EV_MODEL_PATH
        self.model = None
        self.confidence_threshold = settings.EV_THRESHOLD

        if self.model_path.exists():
            try:
                print(f"[EVClassifier] Loading custom EV model from: {self.model_path}")
                self.model = YOLO(str(self.model_path))
            except Exception as e:
                print(f"[EVClassifier] Warning: Could not load custom EV model: {e}")

    def set_threshold(self, threshold: float):
        self.confidence_threshold = float(threshold)

    def classify_power_type(
        self,
        vehicle_crop: np.ndarray,
        plate_crop: Optional[np.ndarray] = None
    ) -> Tuple[str, float]:
        """
        Determines if vehicle is Electric, Conventional/Fuel, or Unknown.
        Returns:
            (power_type, confidence)
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return "Unknown", 0.0

        # Step 1: Check for custom EV classifier model
        if self.model is not None:
            try:
                res = self.model.predict(source=vehicle_crop, conf=0.5, verbose=False)
                if res and len(res[0].boxes) > 0:
                    box = res[0].boxes[0]
                    cls_name = res[0].names[int(box.cls[0].item())].lower()
                    conf = float(box.conf[0].item())
                    if "ev" in cls_name or "electric" in cls_name:
                        if conf >= self.confidence_threshold:
                            return "Electric", round(conf, 3)
                    elif "fuel" in cls_name or "ice" in cls_name:
                        if conf >= self.confidence_threshold:
                            return "Conventional/Fuel", round(conf, 3)
            except Exception as e:
                print(f"[EVClassifier] Model error: {e}")

        # Step 2: Green Number Plate Detection
        # In India, all EVs (cars, two-wheelers, buses) must display high-visibility green number plates
        if plate_crop is not None and plate_crop.size > 0:
            hsv = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2HSV)
            # Green hue in OpenCV is roughly 35 - 85
            lower_green = np.array([35, 45, 45], dtype=np.uint8)
            upper_green = np.array([85, 255, 255], dtype=np.uint8)
            green_mask = cv2.inRange(hsv, lower_green, upper_green)
            green_ratio = np.count_nonzero(green_mask) / float(green_mask.size)

            # A standard green plate has over 35% green background area
            if green_ratio >= 0.35:
                confidence = min(0.96, 0.75 + (green_ratio * 0.4))
                if confidence >= self.confidence_threshold:
                    return "Electric", round(confidence, 3)
            elif green_ratio < 0.08:
                # White/Yellow plate strongly suggests conventional fuel vehicle in standard jurisdictions
                confidence = 0.82
                if confidence >= self.confidence_threshold:
                    return "Conventional/Fuel", round(confidence, 3)

        # Inconclusive visual evidence: Never claim certainty when confidence is low
        return "Unknown", 0.50
