import cv2
import numpy as np
import base64
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Tuple, Optional
from backend.app.config import settings
from backend.app.ai.vehicle_detector import VehicleDetector
from backend.app.ai.plate_detector import PlateDetector
from backend.app.ai.ocr_engine import OCREngine
from backend.app.ai.helmet_detector import HelmetDetector
from backend.app.ai.ev_classifier import EVClassifier
from backend.app.ai.violation_engine import ViolationEngine

class AIPipeline:
    """
    Master Road Safety & Vehicle Monitoring Pipeline.
    Integrates vehicle tracking, plate localization, OCR, helmet checking,
    EV classification, and violation generation.
    """
    def __init__(self):
        print("[AIPipeline] Initializing AI models and engines...")
        self.vehicle_detector = VehicleDetector()
        self.plate_detector = PlateDetector()
        self.ocr_engine = OCREngine()
        self.helmet_detector = HelmetDetector()
        self.ev_classifier = EVClassifier()
        self.violation_engine = ViolationEngine()
        self._vehicle_cache = {}  # track_id -> cached results
        self._plate_cache = {}    # plate_key -> cached OCR results
        self._ocr_executor = ThreadPoolExecutor(max_workers=1)
        self._ocr_future = None
        self._ocr_target_key = None
        self._frame_count = 0

    def update_thresholds(
        self,
        vehicle_thresh: Optional[float] = None,
        helmet_thresh: Optional[float] = None,
        plate_thresh: Optional[float] = None,
        ocr_thresh: Optional[float] = None,
        ev_thresh: Optional[float] = None,
        cooldown: Optional[int] = None
    ):
        if vehicle_thresh is not None:
            self.vehicle_detector.set_threshold(vehicle_thresh)
            settings.VEHICLE_THRESHOLD = vehicle_thresh
        if helmet_thresh is not None:
            self.helmet_detector.set_threshold(helmet_thresh)
            settings.HELMET_THRESHOLD = helmet_thresh
        if plate_thresh is not None:
            self.plate_detector.set_threshold(plate_thresh)
            settings.PLATE_THRESHOLD = plate_thresh
        if ocr_thresh is not None:
            self.ocr_engine.set_threshold(ocr_thresh)
            settings.OCR_THRESHOLD = ocr_thresh
        if ev_thresh is not None:
            self.ev_classifier.set_threshold(ev_thresh)
            settings.EV_THRESHOLD = ev_thresh
        if cooldown is not None:
            self.violation_engine.set_cooldown(cooldown)
            settings.VIOLATION_COOLDOWN_SECONDS = cooldown

    def process_frame(
        self,
        frame: np.ndarray,
        frame_id: Optional[int] = None,
        persist_tracking: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Executes dedicated vehicle and road safety computer vision pipeline on a single frame.
        Detects cars, motorcycles/bikes, buses, trucks, license plates, helmets, EVs, and violations.
        """
        if frame is None or frame.size == 0:
            return {
                "vehicles": [],
                "violations": [],
                "objects": [],
                "object_counts": {"total_objects": 0, "categories": {}, "breakdown": {}},
                "annotated_frame": frame,
                "counts": {
                    "total_vehicles": 0, "cars": 0, "bikes": 0, "buses": 0, "trucks": 0, "evs": 0, "violations_in_frame": 0
                }
            }

        # Harvest background OCR results if finished
        if self._ocr_future is not None and self._ocr_future.done():
            try:
                res_text, res_conf, res_raw = self._ocr_future.result()
                if self._ocr_target_key:
                    is_valid_num = res_text not in ["Uncertain", "Reading...", "Not Detected", ""]
                    ttl = 60.0 if is_valid_num else 2.5
                    self._plate_cache[self._ocr_target_key] = {
                        "plate_number": res_text,
                        "ocr_confidence": res_conf,
                        "raw_text": res_raw,
                        "timestamp": time.time(),
                        "ttl": ttl
                    }
            except Exception as e:
                print(f"[AIPipeline] Background OCR error: {e}")
            finally:
                self._ocr_future = None
                self._ocr_target_key = None

        # Periodically purge old plates and tracks from cache
        if self._frame_count % 150 == 0:
            now_t = time.time()
            self._plate_cache = {k: v for k, v in self._plate_cache.items() if (now_t - v.get("timestamp", 0)) < 30.0}
            self._vehicle_cache = {k: v for k, v in self._vehicle_cache.items() if (self._frame_count - v.get("last_seen", 0)) < 150}

        annotated = frame.copy()
        
        # Step 1: Detect vehicles and riders/persons (Fast YOLOv8)
        vehicles, persons = self.vehicle_detector.detect_and_track(frame, persist=persist_tracking)

        processed_vehicles = []
        all_violations = []

        cars_count = 0
        bikes_count = 0
        buses_count = 0
        trucks_count = 0
        evs_count = 0

        for v in vehicles:
            v_type = v["label"].lower()
            v_bbox = v["bbox"]
            v_crop = v["crop"]
            track_id = v["track_id"]

            if "car" in v_type:
                cars_count += 1
            elif "motorcycle" in v_type or "bicycle" in v_type:
                bikes_count += 1
            elif "bus" in v_type:
                buses_count += 1
            elif "truck" in v_type:
                trucks_count += 1

            # Plate cache key based on track_id or spatial position
            plate_key = str(track_id) if track_id is not None else f"{v_type}_{int(v_bbox[0]/50)}_{int(v_bbox[1]/50)}"

            # Step 2: High-speed Number Plate Detection
            plate_detected, plate_bbox, plate_crop, plate_conf = self.plate_detector.detect_plate(v_crop, v_bbox)
            plate_info = {
                "detected": plate_detected,
                "bbox": plate_bbox,
                "confidence": plate_conf,
                "plate_number": "Not Detected",
                "ocr_confidence": 0.0,
                "raw_text": ""
            }

            if plate_detected and plate_crop is not None:
                if not persist_tracking:
                    # Synchronous OCR for single image uploads / offline testing
                    res_text, res_conf, res_raw = self.ocr_engine.recognize_plate(plate_crop)
                    plate_info["plate_number"] = res_text
                    plate_info["ocr_confidence"] = res_conf
                    plate_info["raw_text"] = res_raw
                else:
                    cached_p = self._plate_cache.get(plate_key)
                    now_t = time.time()
                    is_valid_cache = (
                        cached_p is not None and
                        (now_t - cached_p.get("timestamp", 0)) < cached_p.get("ttl", 30.0)
                    )

                    if is_valid_cache and cached_p.get("plate_number") not in ["Uncertain", "Reading...", "Not Detected", ""]:
                        plate_info["plate_number"] = cached_p["plate_number"]
                        plate_info["ocr_confidence"] = cached_p["ocr_confidence"]
                        plate_info["raw_text"] = cached_p.get("raw_text", "")
                    else:
                        if is_valid_cache and cached_p.get("plate_number") == "Uncertain":
                            plate_info["plate_number"] = "Scanning..."
                        else:
                            plate_info["plate_number"] = "Reading..."
                        plate_info["ocr_confidence"] = 0.5

                        # Non-blocking async OCR: dispatch to background thread without stalling live video
                        if self._ocr_future is None:
                            self._ocr_target_key = plate_key
                            self._ocr_future = self._ocr_executor.submit(
                                self.ocr_engine.recognize_plate, plate_crop.copy()
                            )

            # Step 3: Helmet Detection (for motorcycles/bikes)
            helmet_info = None
            if "motorcycle" in v_type or "bicycle" in v_type:
                helmet_info = self.helmet_detector.check_helmet(frame, v_bbox, persons)

            # Step 4: EV vs Conventional Fuel Classification
            power_type, power_conf = self.ev_classifier.classify_power_type(v_crop, plate_crop)

            if power_type == "Electric":
                evs_count += 1

            # Step 6: Rule Violation Engine
            violations = self.violation_engine.evaluate_vehicle(
                vehicle=v,
                full_frame=frame,
                helmet_info=helmet_info,
                plate_info=plate_info
            )
            all_violations.extend(violations)

            # Assemble vehicle record
            vehicle_summary = {
                "track_id": track_id,
                "vehicle_type": v["label"],
                "confidence": v["confidence"],
                "bbox": v_bbox,
                "plate_info": plate_info,
                "helmet_info": helmet_info,
                "power_type": power_type,
                "power_type_confidence": power_conf,
                "has_violation": len(violations) > 0 or (helmet_info and helmet_info.get("is_violation", False))
            }
            processed_vehicles.append(vehicle_summary)

        # Step 7: Render Visual HUD annotations for detected vehicles
        for vehicle_summary in processed_vehicles:
            self._draw_vehicle_hud(annotated, vehicle_summary)

        return {
            "vehicles": processed_vehicles,
            "violations": all_violations,
            "objects": [],
            "object_counts": {"total_objects": 0, "categories": {}, "breakdown": {}},
            "annotated_frame": annotated,
            "counts": {
                "total_vehicles": len(vehicles),
                "cars": cars_count,
                "bikes": bikes_count,
                "buses": buses_count,
                "trucks": trucks_count,
                "evs": evs_count,
                "violations_in_frame": len(all_violations)
            }
        }

    def _draw_vehicle_hud(self, img: np.ndarray, veh: Dict[str, Any]):
        """
        Renders clean, professional HUD bounding boxes and badges on the image.
        """
        x1, y1, x2, y2 = veh["bbox"]
        has_viol = veh["has_violation"]

        # Color scheme: Red if violation, Cyan if EV, Emerald green if safe
        if has_viol:
            box_color = (40, 40, 235) # BGR Red
        elif veh["power_type"] == "Electric":
            box_color = (230, 180, 20) # BGR Cyan/Blue
        else:
            box_color = (60, 200, 60) # BGR Green

        # Draw vehicle bounding box with rounded corner ticks
        cv2.rectangle(img, (x1, y1), (x2, y2), box_color, 2)
        corner_len = min(20, (x2 - x1) // 4, (y2 - y1) // 4)
        cv2.line(img, (x1, y1), (x1 + corner_len, y1), box_color, 4)
        cv2.line(img, (x1, y1), (x1, y1 + corner_len), box_color, 4)
        cv2.line(img, (x2, y1), (x2 - corner_len, y1), box_color, 4)
        cv2.line(img, (x2, y1), (x2, y1 + corner_len), box_color, 4)
        cv2.line(img, (x1, y2), (x1 + corner_len, y2), box_color, 4)
        cv2.line(img, (x1, y2), (x1, y2 - corner_len), box_color, 4)
        cv2.line(img, (x2, y2), (x2 - corner_len, y2), box_color, 4)
        cv2.line(img, (x2, y2), (x2, y2 - corner_len), box_color, 4)

        # Draw Plate bounding box if detected
        p_info = veh.get("plate_info")
        if p_info and p_info.get("detected") and p_info.get("bbox"):
            px1, py1, px2, py2 = p_info["bbox"]
            cv2.rectangle(img, (px1, py1), (px2, py2), (0, 215, 255), 2)

        # Format label strings
        track_tag = f"#{veh['track_id']} " if veh['track_id'] else ""
        main_label = f"{track_tag}{veh['vehicle_type']} {int(veh['confidence'] * 100)}%"

        details = []
        if p_info and p_info.get("detected"):
            p_num = p_info.get("plate_number")
            p_conf = int(p_info.get("ocr_confidence", 0) * 100)
            details.append(f"Plate: {p_num} ({p_conf}%)" if p_num != "Not Detected" else "Plate detected")
        elif "car" in veh["vehicle_type"].lower():
            details.append("Plate: None")

        h_info = veh.get("helmet_info")
        if h_info and h_info.get("rider_detected"):
            h_stat = h_info.get("helmet_status")
            h_conf = int(h_info.get("confidence", 0) * 100)
            if h_stat == "YES":
                details.append(f"Helmet: OK ({h_conf}%)")
            elif h_stat == "NO":
                details.append(f"Helmet: NO ({h_conf}%)")
            else:
                details.append("Helmet: Unknown")

        if veh.get("power_type") == "Electric":
            details.append(f"EV ({int(veh.get('power_type_confidence', 0)*100)}%)")

        # Top Badge Banner
        detail_str = " | ".join(details)
        display_text = f"{main_label}  [{detail_str}]" if details else main_label

        (tw, th), _ = cv2.getTextSize(display_text, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
        badge_y1 = max(0, y1 - th - 10)
        badge_y2 = y1
        badge_x2 = min(img.shape[1], x1 + tw + 12)

        cv2.rectangle(img, (x1, badge_y1), (badge_x2, badge_y2), (20, 24, 30), -1)
        cv2.rectangle(img, (x1, badge_y1), (badge_x2, badge_y2), box_color, 1)
        cv2.putText(
            img,
            display_text,
            (x1 + 6, badge_y2 - 6),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )

    def frame_to_base64(self, frame: np.ndarray, quality: int = 80) -> str:
        """Encodes frame to base64 JPEG for web streaming/preview."""
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        _, buffer = cv2.imencode('.jpg', frame, encode_param)
        return base64.b64encode(buffer).decode('utf-8')
