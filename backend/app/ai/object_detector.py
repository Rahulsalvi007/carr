import cv2
import numpy as np
import torch
import os
from typing import List, Dict, Any, Tuple, Optional
from ultralytics import YOLO
from backend.app.config import settings

# 80 COCO Classes categorized into Smart Categories
COCO_SMART_CATEGORIES = {
    # 1. PEOPLE
    "person": "People",

    # 2. VEHICLES
    "bicycle": "Vehicles",
    "car": "Vehicles",
    "motorcycle": "Vehicles",
    "airplane": "Vehicles",
    "bus": "Vehicles",
    "train": "Vehicles",
    "truck": "Vehicles",
    "boat": "Vehicles",

    # 3. ANIMALS
    "bird": "Animals",
    "cat": "Animals",
    "dog": "Animals",
    "horse": "Animals",
    "sheep": "Animals",
    "cow": "Animals",
    "elephant": "Animals",
    "bear": "Animals",
    "zebra": "Animals",
    "giraffe": "Animals",

    # 4. ELECTRONICS
    "tv": "Electronics",
    "laptop": "Electronics",
    "mouse": "Electronics",
    "remote": "Electronics",
    "keyboard": "Electronics",
    "cell phone": "Electronics",
    "microwave": "Electronics",
    "oven": "Electronics",
    "toaster": "Electronics",
    "refrigerator": "Electronics",

    # 5. DAILY OBJECTS
    "chair": "Daily Objects",
    "couch": "Daily Objects",
    "dining table": "Daily Objects",
    "backpack": "Daily Objects",
    "umbrella": "Daily Objects",
    "handbag": "Daily Objects",
    "tie": "Daily Objects",
    "suitcase": "Daily Objects",
    "bottle": "Daily Objects",
    "wine glass": "Daily Objects",
    "cup": "Daily Objects",
    "fork": "Daily Objects",
    "knife": "Daily Objects",
    "spoon": "Daily Objects",
    "bowl": "Daily Objects",
    "book": "Daily Objects",
    "clock": "Daily Objects",
    "vase": "Daily Objects",
    "scissors": "Daily Objects",

    # 6. TRAFFIC
    "traffic light": "Traffic",
    "fire hydrant": "Traffic",
    "stop sign": "Traffic",
    "parking meter": "Traffic",
    "bench": "Traffic",
}

# Category display colors (BGR for OpenCV drawing)
CATEGORY_COLORS_BGR = {
    "People": (129, 236, 16),       # Vivid Green
    "Vehicles": (240, 160, 14),     # Electric Sky Blue
    "Animals": (11, 158, 245),      # Amber / Orange
    "Electronics": (247, 85, 168),  # Vibrant Purple / Violet
    "Daily Objects": (166, 184, 20),# Teal / Cyan
    "Traffic": (63, 63, 244),       # Bright Red / Crimson
    "Other": (150, 150, 150)        # Silver / Gray
}

# Category hex colors for frontend UI badges
CATEGORY_COLORS_HEX = {
    "People": "#10B981",
    "Vehicles": "#0EA5E9",
    "Animals": "#F59E0B",
    "Electronics": "#A855F7",
    "Daily Objects": "#14B8A6",
    "Traffic": "#F43F5E",
    "Other": "#71717A"
}

# Friendly display names
FRIENDLY_NAMES = {
    "cell phone": "Mobile Phone",
    "couch": "Sofa",
    "tv": "TV / Monitor",
    "traffic light": "Traffic Light",
    "stop sign": "Stop Sign",
    "parking meter": "Parking Meter",
    "dining table": "Table",
    "fire hydrant": "Fire Hydrant"
}

class GeneralObjectDetector:
    """
    High-performance general object detection engine covering all 80 COCO classes.
    Organizes detected objects into People, Vehicles, Animals, Electronics,
    Daily Objects, Traffic, and Other.
    """
    def __init__(self, model_name: str = settings.YOLO_VEHICLE_MODEL):
        print(f"[GeneralObjectDetector] Initializing 80-Class Object Detection Model: {model_name}")
        self.model = YOLO(model_name)
        self.default_threshold = 0.45

    def get_category(self, class_name: str) -> str:
        return COCO_SMART_CATEGORIES.get(class_name.lower(), "Other")

    def get_friendly_name(self, class_name: str) -> str:
        lower = class_name.lower()
        if lower in FRIENDLY_NAMES:
            return FRIENDLY_NAMES[lower]
        return class_name.title()

    def detect(
        self,
        frame: np.ndarray,
        confidence_threshold: Optional[float] = None,
        filter_category: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Performs general object detection on a single frame.
        Returns:
            objects: List of structured object dictionaries
            counts: Dynamic summary counts by category and breakdown
        """
        if frame is None or frame.size == 0:
            return [], self._empty_counts()

        h, w = frame.shape[:2]
        conf = float(confidence_threshold) if confidence_threshold is not None else self.default_threshold

        try:
            results = self.model.predict(
                source=frame,
                conf=conf,
                imgsz=480,
                verbose=False
            )
        except Exception as e:
            print(f"[GeneralObjectDetector] Detection error: {e}")
            return [], self._empty_counts()

        if not results or len(results) == 0:
            return [], self._empty_counts()

        res = results[0]
        boxes = res.boxes
        if boxes is None or len(boxes) == 0:
            return [], self._empty_counts()

        detected_objects = []
        category_counts = {
            "People": 0,
            "Vehicles": 0,
            "Animals": 0,
            "Electronics": 0,
            "Daily Objects": 0,
            "Traffic": 0,
            "Other": 0
        }
        item_breakdown = {}

        for idx, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            class_name = self.model.names.get(cls_id, f"obj_{cls_id}").lower()
            confidence = round(float(box.conf[0].item()) * 100, 1)
            category = self.get_category(class_name)
            label = self.get_friendly_name(class_name)

            if filter_category and filter_category.upper() != "ALL" and category.upper() != filter_category.upper():
                continue

            xyxy = box.xyxy[0].cpu().numpy().astype(int)
            x1, y1, x2, y2 = max(0, xyxy[0]), max(0, xyxy[1]), min(w, xyxy[2]), min(h, xyxy[3])
            w_box = x2 - x1
            h_box = y2 - y1

            # Skip tiny degenerate boxes
            if w_box < 10 or h_box < 10:
                continue

            track_id = None
            if box.id is not None:
                track_id = int(box.id[0].item())

            obj_record = {
                "id": f"obj_{idx + 1}_{class_name}",
                "detection_id": f"obj_{idx + 1}_{class_name}",
                "name": class_name,
                "label": label,
                "category": category,
                "confidence": confidence,
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "box_dimensions": {"width": int(w_box), "height": int(h_box)},
                "track_id": track_id,
                "color_hex": CATEGORY_COLORS_HEX.get(category, "#71717A")
            }
            detected_objects.append(obj_record)

            # Update category counts
            category_counts[category] = category_counts.get(category, 0) + 1
            # Update item breakdown
            item_breakdown[label] = item_breakdown.get(label, 0) + 1

        summary_counts = {
            "total_objects": len(detected_objects),
            "categories": category_counts,
            "breakdown": item_breakdown
        }

        return detected_objects, summary_counts

    def render_bounding_boxes(
        self,
        frame: np.ndarray,
        objects: List[Dict[str, Any]],
        highlight_category: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> np.ndarray:
        """
        Renders crystal-clear, high-contrast bounding boxes with category-colored badges and drop shadows.
        """
        if frame is None or len(objects) == 0:
            return frame

        annotated = frame.copy()
        query = search_query.strip().lower() if search_query else None

        for obj in objects:
            category = obj["category"]
            label = obj["label"]
            conf = obj["confidence"]
            x1, y1, x2, y2 = obj["bbox"]

            # Filter check
            if highlight_category and highlight_category.upper() != "ALL" and category.upper() != highlight_category.upper():
                continue
            if query and query not in label.lower() and query not in category.lower():
                continue

            color = CATEGORY_COLORS_BGR.get(category, (180, 180, 180))

            # Draw outer glow / shadow box
            cv2.rectangle(annotated, (x1 - 1, y1 - 1), (x2 + 1, y2 + 1), (0, 0, 0), 3, cv2.LINE_AA)
            # Draw main bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

            # Draw corner accents for high-tech HUD look
            corner_len = min(18, (x2 - x1) // 3, (y2 - y1) // 3)
            if corner_len > 4:
                # Top-left
                cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), color, 3, cv2.LINE_AA)
                cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), color, 3, cv2.LINE_AA)
                # Top-right
                cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), color, 3, cv2.LINE_AA)
                cv2.line(annotated, (x2, y1), (x2, y1 + corner_len), color, 3, cv2.LINE_AA)
                # Bottom-left
                cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), color, 3, cv2.LINE_AA)
                cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), color, 3, cv2.LINE_AA)
                # Bottom-right
                cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), color, 3, cv2.LINE_AA)
                cv2.line(annotated, (x2, y2), (x2, y2 - corner_len), color, 3, cv2.LINE_AA)

            # Badge Label text
            badge_text = f"{label} {int(conf)}%"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.45
            font_thickness = 1
            (text_w, text_h), baseline = cv2.getTextSize(badge_text, font, font_scale, font_thickness)

            # Position badge above box, or inside top if near image boundary
            badge_y1 = max(0, y1 - text_h - 8)
            badge_y2 = badge_y1 + text_h + 8
            badge_x2 = min(annotated.shape[1], x1 + text_w + 12)

            # Filled dark background pill
            cv2.rectangle(annotated, (x1, badge_y1), (badge_x2, badge_y2), (10, 10, 15), -1)
            # Left category color indicator stripe
            cv2.rectangle(annotated, (x1, badge_y1), (x1 + 4, badge_y2), color, -1)
            # Crisp white text with sub-pixel alignment
            cv2.putText(
                annotated,
                badge_text,
                (x1 + 8, badge_y2 - 5),
                font,
                font_scale,
                (255, 255, 255),
                font_thickness,
                cv2.LINE_AA
            )

        return annotated

    def _empty_counts(self) -> Dict[str, Any]:
        return {
            "total_objects": 0,
            "categories": {
                "People": 0,
                "Vehicles": 0,
                "Animals": 0,
                "Electronics": 0,
                "Daily Objects": 0,
                "Traffic": 0,
                "Other": 0
            },
            "breakdown": {}
        }
