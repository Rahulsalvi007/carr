import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from ultralytics import YOLO
from backend.app.config import settings

class PlateDetector:
    """
    Detects and localizes number plates inside or near a detected vehicle.
    Dual-stage support:
      1. Uses fine-tuned custom YOLO plate model if models/plate/best.pt exists.
      2. High-performance OpenCV morphological/contour edge detector fallback.
    """
    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or settings.PLATE_MODEL_PATH
        self.yolo_plate_model = None
        self.confidence_threshold = settings.PLATE_THRESHOLD

        if self.model_path.exists():
            try:
                print(f"[PlateDetector] Loading custom plate model from: {self.model_path}")
                self.yolo_plate_model = YOLO(str(self.model_path))
            except Exception as e:
                print(f"[PlateDetector] Warning: could not load custom plate model ({e}), using OpenCV fallback.")

    def set_threshold(self, threshold: float):
        self.confidence_threshold = float(threshold)

    def detect_plate(self, vehicle_crop: np.ndarray, vehicle_bbox: list) -> Tuple[bool, Optional[list], Optional[np.ndarray], float]:
        """
        Locates number plate within the vehicle image crop.
        Returns:
            (plate_detected, plate_bbox_in_full_frame, plate_crop, confidence)
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return False, None, None, 0.0

        vh, vw = vehicle_crop.shape[:2]
        vx1, vy1, vx2, vy2 = vehicle_bbox

        # Strategy 1: Custom YOLO plate model if loaded
        if self.yolo_plate_model is not None:
            try:
                results = self.yolo_plate_model.predict(
                    source=vehicle_crop,
                    conf=self.confidence_threshold,
                    verbose=False
                )
                if results and len(results[0].boxes) > 0:
                    best_box = results[0].boxes[0]
                    conf = float(best_box.conf[0].item())
                    xyxy = best_box.xyxy[0].cpu().numpy().astype(int)
                    px1, py1, px2, py2 = max(0, xyxy[0]), max(0, xyxy[1]), min(vw, xyxy[2]), min(vh, xyxy[3])
                    plate_crop = vehicle_crop[py1:py2, px1:px2]
                    global_bbox = [vx1 + px1, vy1 + py1, vx1 + px2, vy1 + py2]
                    return True, global_bbox, plate_crop, round(conf, 3)
            except Exception as e:
                print(f"[PlateDetector] Model inference error: {e}")

        # Strategy 2: High-accuracy Multi-Method Plate Candidate Extractor
        # Search across lower 75% of the vehicle where license plates reside
        search_y_start = int(vh * 0.25)
        roi = vehicle_crop[search_y_start:vh, 0:vw]
        if roi.size == 0:
            return False, None, None, 0.0

        roi_h, roi_w = roi.shape[:2]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi

        # Method 2A: Tophat & Blackhat morphology (highlights text on light and dark plates)
        rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 5))
        blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, rect_kernel)
        tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, rect_kernel)
        combined_hat = cv2.add(blackhat, tophat)
        _, thresh_hat = cv2.threshold(combined_hat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 5))
        closed_hat = cv2.morphologyEx(thresh_hat, cv2.MORPH_CLOSE, close_kernel)
        cnts_hat, _ = cv2.findContours(closed_hat, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Method 2B: Adaptive thresholding on blurred ROI
        blurred = cv2.bilateralFilter(gray, 7, 50, 50)
        grad_x = cv2.Sobel(blurred, cv2.CV_16S, 1, 0, ksize=3)
        abs_grad_x = cv2.convertScaleAbs(grad_x)
        closed_grad = cv2.morphologyEx(abs_grad_x, cv2.MORPH_CLOSE, close_kernel)
        _, thresh_grad = cv2.threshold(closed_grad, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        cnts_grad, _ = cv2.findContours(thresh_grad, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Method 2C: Plate color luminance thresholding (white / yellow / green plates)
        if len(roi.shape) == 3:
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            v_channel = hsv[:, :, 2]
            _, bright_thresh = cv2.threshold(v_channel, 175, 255, cv2.THRESH_BINARY)
            closed_bright = cv2.morphologyEx(bright_thresh, cv2.MORPH_CLOSE, close_kernel)
            cnts_color, _ = cv2.findContours(closed_bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        else:
            cnts_color = []

        all_contours = list(cnts_hat) + list(cnts_grad) + list(cnts_color)

        best_candidate = None
        best_score = 0.0

        for cnt in all_contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w < 16 or h < 8:
                continue

            aspect_ratio = float(w) / float(h)
            rel_w = float(w) / float(roi_w)
            rel_h = float(h) / float(roi_h)

            # Standard 1-line plate: AR ~2.0 - 5.5; 2-line plate (motorcycle/taxi): AR ~1.1 - 2.0
            if 1.05 <= aspect_ratio <= 6.0 and 0.06 <= rel_w <= 0.88 and 0.03 <= rel_h <= 0.65:
                center_x = x + w / 2.0
                dist_from_center = abs(center_x - roi_w / 2.0) / (roi_w / 2.0)
                # Plate aspect score
                ar_score = 1.0 - abs(aspect_ratio - 3.2) / 4.0
                # Score combines horizontal centrality and realistic aspect ratio
                score = max(0.1, 0.5 * ar_score + 0.5 * (1.0 - 0.4 * dist_from_center))

                if score > best_score:
                    best_score = score
                    best_candidate = (x, y, w, h)

        if best_candidate and best_score >= self.confidence_threshold:
            x, y, w, h = best_candidate
            # Add generous 10% horizontal and 15% vertical padding to prevent character truncation
            pad_x = max(2, int(w * 0.10))
            pad_y = max(2, int(h * 0.15))
            px1 = max(0, x - pad_x)
            py1 = max(0, (search_y_start + y) - pad_y)
            px2 = min(vw, x + w + pad_x)
            py2 = min(vh, search_y_start + y + h + pad_y)

            plate_crop = vehicle_crop[py1:py2, px1:px2]
            global_bbox = [vx1 + px1, vy1 + py1, vx1 + px2, vy1 + py2]
            return True, global_bbox, plate_crop, round(float(best_score), 3)

        # Method 2D: Fallback - Central bumper candidate
        # If the vehicle is decently sized, supply the central bumper zone directly to OCR
        if vw >= 60 and vh >= 40:
            fb_w = int(vw * 0.60)
            fb_h = int(vh * 0.38)
            fb_x1 = int((vw - fb_w) / 2)
            fb_y1 = int(vh * 0.52)
            fb_x2 = fb_x1 + fb_w
            fb_y2 = min(vh, fb_y1 + fb_h)

            plate_crop = vehicle_crop[fb_y1:fb_y2, fb_x1:fb_x2]
            global_bbox = [vx1 + fb_x1, vy1 + fb_y1, vx1 + fb_x2, vy1 + fb_y2]
            return True, global_bbox, plate_crop, 0.40

        return False, None, None, 0.0
