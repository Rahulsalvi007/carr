import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from ultralytics import YOLO
from backend.app.config import settings

class HelmetDetector:
    """
    Analyzes motorcycle riders for helmet compliance.
    Pipeline:
      1. Associates detected persons with motorcycles based on spatial overlap.
      2. Crops rider head region (top 25% of rider bounding box).
      3. Uses custom YOLO helmet model if models/helmet/best.pt is provided.
      4. Falls back to multi-feature CV classification (elliptical contour, texture entropy, skin-tone ratio).
    """
    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or settings.HELMET_MODEL_PATH
        self.yolo_helmet_model = None
        self.confidence_threshold = settings.HELMET_THRESHOLD

        if self.model_path.exists():
            try:
                print(f"[HelmetDetector] Loading custom helmet model from: {self.model_path}")
                self.yolo_helmet_model = YOLO(str(self.model_path))
            except Exception as e:
                print(f"[HelmetDetector] Warning: could not load custom helmet model ({e}), using CV analyzer.")

    def set_threshold(self, threshold: float):
        self.confidence_threshold = float(threshold)

    def associate_rider_to_bike(self, bike_bbox: list, persons: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Finds the person riding this motorcycle based on bounding box geometry.
        Rider sits above/within the motorcycle boundaries.
        """
        bx1, by1, bx2, by2 = bike_bbox
        bike_w = bx2 - bx1
        bike_h = by2 - by1

        best_rider = None
        max_overlap = 0.0

        for p in persons:
            px1, py1, px2, py2 = p["bbox"]
            
            # Intersection coordinates
            ix1 = max(bx1, px1)
            iy1 = max(by1, py1)
            ix2 = min(bx2, px2)
            iy2 = min(by2, py2)

            if ix2 > ix1 and iy2 > iy1:
                intersection_area = (ix2 - ix1) * (iy2 - iy1)
                person_area = (px2 - px1) * (py2 - py1)
                overlap_ratio = intersection_area / float(person_area) if person_area > 0 else 0
                
                # Rider usually extends vertically above the bike's bottom half
                vertical_alignment = py1 <= by1 + (bike_h * 0.5)
                
                if overlap_ratio > 0.15 and vertical_alignment and overlap_ratio > max_overlap:
                    max_overlap = overlap_ratio
                    best_rider = p

        return best_rider

    def check_helmet(self, full_frame: np.ndarray, bike_bbox: list, persons: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluates helmet compliance for a motorcycle.
        Returns:
            {
                "rider_detected": bool,
                "helmet_status": "YES" | "NO" | "UNKNOWN",
                "confidence": float,
                "head_bbox": list or None,
                "is_violation": bool
            }
        """
        rider = self.associate_rider_to_bike(bike_bbox, persons)
        if not rider:
            return {
                "rider_detected": False,
                "helmet_status": "UNKNOWN",
                "confidence": 0.0,
                "head_bbox": None,
                "is_violation": False
            }

        px1, py1, px2, py2 = rider["bbox"]
        person_h = py2 - py1
        person_w = px2 - px1

        # Head region is top 25% of rider bounding box
        hy1 = max(0, py1)
        hy2 = min(full_frame.shape[0], py1 + int(person_h * 0.28))
        hx1 = max(0, px1 + int(person_w * 0.15))
        hx2 = min(full_frame.shape[1], px2 - int(person_w * 0.15))

        head_crop = full_frame[hy1:hy2, hx1:hx2]
        head_bbox = [hx1, hy1, hx2, hy2]

        if head_crop.size == 0 or head_crop.shape[0] < 15 or head_crop.shape[1] < 15:
            return {
                "rider_detected": True,
                "helmet_status": "UNKNOWN",
                "confidence": 0.40,
                "head_bbox": head_bbox,
                "is_violation": False
            }

        # Strategy 1: Fine-tuned YOLO helmet model if available
        if self.yolo_helmet_model is not None:
            try:
                results = self.yolo_helmet_model.predict(source=head_crop, conf=0.35, verbose=False)
                if results and len(results[0].boxes) > 0:
                    box = results[0].boxes[0]
                    cls_name = results[0].names[int(box.cls[0].item())].lower()
                    conf = float(box.conf[0].item())
                    if "helmet" in cls_name and "no" not in cls_name:
                        return {
                            "rider_detected": True,
                            "helmet_status": "YES",
                            "confidence": round(conf, 3),
                            "head_bbox": head_bbox,
                            "is_violation": False
                        }
                    else:
                        is_viol = conf >= self.confidence_threshold
                        return {
                            "rider_detected": True,
                            "helmet_status": "NO" if is_viol else "UNKNOWN",
                            "confidence": round(conf, 3),
                            "head_bbox": head_bbox,
                            "is_violation": is_viol
                        }
            except Exception as e:
                print(f"[HelmetDetector] Custom model error: {e}")

        # Strategy 2: Multi-feature CV analysis (Texture smoothness + Elliptical contour + Skin Hue ratio)
        hsv = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)
        
        # Detect human face/skin tones in head region (Hue 0-25, Sat 30-190, Val 50-255)
        skin_mask = cv2.inRange(hsv, np.array([0, 30, 60], dtype=np.uint8), np.array([25, 190, 255], dtype=np.uint8))
        skin_ratio = np.count_nonzero(skin_mask) / float(skin_mask.size)

        # Texture variance of top half of head (smooth helmet shell vs hair/skin)
        top_half = head_crop[0:int(head_crop.shape[0] * 0.6), :]
        if top_half.size > 0:
            gray_top = cv2.cvtColor(top_half, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray_top, cv2.CV_64F).var()
        else:
            laplacian_var = 100.0

        # Circularity & convex hull of top region
        gray_head = cv2.cvtColor(head_crop, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray_head, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        has_smooth_dome = False
        if contours:
            largest_cnt = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_cnt)
            perimeter = cv2.arcLength(largest_cnt, True)
            if perimeter > 0:
                circularity = 4 * np.pi * (area / (perimeter * perimeter))
                if circularity > 0.45:
                    has_smooth_dome = True

        # Decision scoring:
        # High skin exposure on head top and high hair texture indicates NO helmet
        # Smooth dome contour with low skin ratio on upper head indicates HELMET
        if skin_ratio < 0.18 and (has_smooth_dome or laplacian_var < 180):
            conf = min(0.96, 0.72 + (0.18 - skin_ratio) * 0.8)
            status = "YES" if conf >= self.confidence_threshold else "UNKNOWN"
            is_violation = False
        elif skin_ratio >= 0.28:
            conf = min(0.94, 0.68 + (skin_ratio - 0.25) * 0.9)
            is_violation = conf >= self.confidence_threshold
            status = "NO" if is_violation else "UNKNOWN"
        else:
            conf = 0.55
            status = "UNKNOWN"
            is_violation = False

        return {
            "rider_detected": True,
            "helmet_status": status,
            "confidence": round(conf, 3),
            "head_bbox": head_bbox,
            "is_violation": is_violation
        }
