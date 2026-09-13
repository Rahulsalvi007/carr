import cv2
import numpy as np
import pytest
from pathlib import Path

from backend.app.ai.vehicle_detector import VehicleDetector
from backend.app.ai.plate_detector import PlateDetector
from backend.app.ai.ocr_engine import OCREngine
from backend.app.ai.helmet_detector import HelmetDetector
from backend.app.ai.ev_classifier import EVClassifier
from backend.app.ai.violation_engine import ViolationEngine
from backend.app.ai.pipeline import AIPipeline

@pytest.fixture
def sample_image():
    sample_path = Path(__file__).resolve().parent.parent / "sample_media" / "sample_traffic.jpg"
    assert sample_path.exists(), "Sample traffic image does not exist!"
    img = cv2.imread(str(sample_path))
    assert img is not None, "Failed to read sample image"
    return img

def test_ocr_engine():
    ocr = OCREngine()
    
    # Create test plate crop with text "DL01AB1234"
    plate_img = np.full((70, 240, 3), 255, dtype=np.uint8)
    cv2.putText(plate_img, "DL01AB1234", (15, 48), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 3)

    text, conf, raw = ocr.recognize_plate(plate_img)
    assert isinstance(text, str)
    assert isinstance(conf, float)
    print(f"OCR result: {text}, conf: {conf}")

def test_ev_classifier():
    ev_clf = EVClassifier()
    
    # Conventional white plate crop
    white_plate = np.full((60, 200, 3), 250, dtype=np.uint8)
    car_crop = np.full((200, 200, 3), 128, dtype=np.uint8)
    power_type, conf = ev_clf.classify_power_type(car_crop, white_plate)
    assert power_type in ["Electric", "Conventional/Fuel", "Unknown"]
    
    # Green plate crop (RGB green -> BGR: [40, 180, 50])
    green_plate = np.zeros((60, 200, 3), dtype=np.uint8)
    green_plate[:, :] = [40, 180, 50]
    power_type_green, conf_green = ev_clf.classify_power_type(car_crop, green_plate)
    assert power_type_green == "Electric"
    assert conf_green >= 0.75

def test_helmet_detector():
    hd = HelmetDetector()
    frame = np.zeros((500, 500, 3), dtype=np.uint8)
    
    bike_bbox = [100, 200, 250, 450]
    # Person overlapping bike
    persons = [{
        "track_id": 1,
        "label": "person",
        "confidence": 0.88,
        "bbox": [120, 120, 230, 380]
    }]
    
    res = hd.check_helmet(frame, bike_bbox, persons)
    assert res["rider_detected"] is True
    assert res["helmet_status"] in ["YES", "NO", "UNKNOWN"]
    assert "confidence" in res

def test_violation_engine():
    ve = ViolationEngine(cooldown_seconds=10)
    frame = np.zeros((400, 400, 3), dtype=np.uint8)
    
    vehicle = {
        "track_id": 99,
        "label": "Motorcycle",
        "confidence": 0.92,
        "bbox": [50, 100, 200, 350]
    }
    
    helmet_viol = {
        "rider_detected": True,
        "helmet_status": "NO",
        "confidence": 0.90,
        "is_violation": True
    }
    
    viols = ve.evaluate_vehicle(vehicle, frame, helmet_info=helmet_viol)
    assert len(viols) == 1
    assert viols[0]["violation_type"] == "NO_HELMET"
    assert viols[0]["track_id"] == 99

    # Test cooldown: duplicate evaluation for same vehicle should yield 0 violations
    dup_viols = ve.evaluate_vehicle(vehicle, frame, helmet_info=helmet_viol)
    assert len(dup_viols) == 0, "Violation deduplication cooldown failed to suppress duplicate"

def test_full_pipeline(sample_image):
    pipeline = AIPipeline()
    result = pipeline.process_frame(sample_image, persist_tracking=False)
    
    assert "vehicles" in result
    assert "violations" in result
    assert "annotated_frame" in result
    assert "counts" in result
    assert result["annotated_frame"].shape == sample_image.shape
    print(f"Pipeline processed successfully. Counts: {result['counts']}")
