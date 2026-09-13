import re
import cv2
import numpy as np
from typing import Tuple, Optional
import easyocr
from backend.app.config import settings

# Common Indian State/UT Codes for validation
INDIAN_STATE_CODES = {
    "AN", "AP", "AR", "AS", "BR", "CH", "CG", "DN", "DD", "DL",
    "GA", "GJ", "HR", "HP", "JK", "JH", "KA", "KL", "LA", "LD",
    "MP", "MH", "MN", "ML", "MZ", "NL", "OD", "PY", "PB", "RJ",
    "SK", "TN", "TS", "TR", "UP", "UK", "WB", "BH"
}

# Regex pattern for standard Indian Vehicle Plates:
# e.g., RJ14CA1234, DL01AB9876, MH12A1234, BH22AA1234A
INDIAN_PLATE_REGEX = re.compile(r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{3,4}$')
GENERAL_PLATE_REGEX = re.compile(r'^[A-Z0-9]{5,12}$')

class OCREngine:
    def __init__(self):
        print("[OCREngine] Initializing EasyOCR Reader (English)...")
        # Initialize easyocr with English; gpu=False by default for universal compatibility
        self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        self.confidence_threshold = settings.OCR_THRESHOLD

    def set_threshold(self, threshold: float):
        self.confidence_threshold = float(threshold)

    def preprocess_plate(self, plate_img: np.ndarray) -> np.ndarray:
        """
        Applies advanced OpenCV enhancement pipeline:
        1. High-resolution scaling to optimal OCR height (110px)
        2. Bilateral filter edge-preserving smoothing
        3. CLAHE adaptive contrast boost
        4. Laplacian unsharp masking
        """
        if plate_img is None or plate_img.size == 0:
            return plate_img

        h, w = plate_img.shape[:2]
        # Optimal EasyOCR text height is ~110px
        target_h = max(110, int(h * 2.2)) if h < 60 else max(90, h)
        scale = target_h / float(h) if h > 0 else 1.0
        target_w = max(int(w * scale), 200)
        resized = cv2.resize(plate_img, (target_w, target_h), interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY) if len(resized.shape) == 3 else resized

        # Noise reduction preserving edges
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        # CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        contrast_boost = clahe.apply(denoised)

        # Sharpening kernel
        kernel_sharp = np.array([[0, -1, 0],
                                 [-1, 5, -1],
                                 [0, -1, 0]])
        sharpened = cv2.filter2D(contrast_boost, -1, kernel_sharp)

        return sharpened

    def clean_text(self, raw_text: str) -> str:
        """
        Cleans OCR text:
        - Uppercases
        - Removes special symbols, spaces, hyphens
        - Normalizes common OCR confusions in Indian plate formats
        """
        if not raw_text:
            return ""

        # Remove non-alphanumeric characters
        cleaned = re.sub(r'[^A-Za-z0-9]', '', raw_text).upper()

        # Common OCR substitution heuristics for Indian plates:
        # Example: 'O' or 'D' in place of '0', 'I' or 'L' in place of '1', 'B' in place of '8'
        # If text is at least 6 characters, normalize state code and number segments
        if len(cleaned) >= 6:
            chars = list(cleaned)
            # First two characters are State code (letters)
            state_sub = {'0': 'O', '1': 'I', '8': 'B', '5': 'S', '2': 'Z'}
            if chars[0] in state_sub:
                chars[0] = state_sub[chars[0]]
            if chars[1] in state_sub:
                chars[1] = state_sub[chars[1]]

            # Last 4 characters are usually digits (e.g. 1234)
            digit_sub = {'O': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6'}
            for i in range(max(2, len(chars) - 4), len(chars)):
                if chars[i] in digit_sub:
                    chars[i] = digit_sub[chars[i]]

            cleaned = "".join(chars)

        return cleaned

    def recognize_plate(self, plate_crop: np.ndarray) -> Tuple[str, float, str]:
        """
        Executes multi-pass OCR on license plate crop.
        Returns:
            (plate_number, confidence, raw_detected_string)
        """
        if plate_crop is None or plate_crop.size == 0:
            return "Uncertain", 0.0, ""

        h, w = plate_crop.shape[:2]
        preprocessed = self.preprocess_plate(plate_crop)

        results = []

        # Pass 1: Preprocessed sharpened grayscale
        try:
            results = self.reader.readtext(
                preprocessed,
                allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                detail=1,
                paragraph=False
            )
        except Exception as e:
            print(f"[OCREngine] Pass 1 error: {e}")

        # Pass 2: If Pass 1 empty, try upscaled color crop directly
        if not results:
            try:
                target_h = max(110, int(h * 2.2)) if h < 60 else max(90, h)
                scale = target_h / float(h) if h > 0 else 1.0
                crop_color = cv2.resize(plate_crop, (max(int(w * scale), 200), target_h), interpolation=cv2.INTER_CUBIC)
                results = self.reader.readtext(
                    crop_color,
                    allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    detail=1,
                    paragraph=False
                )
            except Exception as e:
                pass

        # Pass 3: If still empty, try Otsu binary thresholding
        if not results:
            try:
                _, thresh = cv2.threshold(preprocessed, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                results = self.reader.readtext(
                    thresh,
                    allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    detail=1,
                    paragraph=False
                )
            except Exception as e:
                pass

        if not results:
            return "Uncertain", 0.0, ""

        # Aggregate detected text fragments and calculate confidence
        text_fragments = []
        confidences = []

        for bbox, text, conf in results:
            cleaned = self.clean_text(text)
            if cleaned and len(cleaned) >= 2:
                text_fragments.append(cleaned)
                confidences.append(float(conf))

        if not text_fragments:
            return "Uncertain", 0.0, ""

        full_plate = "".join(text_fragments)
        avg_confidence = round(float(np.mean(confidences)), 3)

        # Validate against standard Indian / general license plate patterns
        is_indian_format = bool(INDIAN_PLATE_REGEX.match(full_plate))
        has_known_state = len(full_plate) >= 2 and full_plate[:2] in INDIAN_STATE_CODES

        if has_known_state:
            avg_confidence = min(0.99, avg_confidence + 0.25)
        elif is_indian_format:
            avg_confidence = min(0.99, avg_confidence + 0.18)

        # Valid plate condition: >= 3 alphanumeric characters
        if len(full_plate) >= 3 and (avg_confidence >= self.confidence_threshold or avg_confidence >= 0.04):
            return full_plate, avg_confidence, full_plate

        # If has known state code and at least 2 chars, accept
        if has_known_state and len(full_plate) >= 2:
            return full_plate, max(0.50, avg_confidence), full_plate

        if len(full_plate) >= 3:
            return full_plate, avg_confidence, full_plate

        return "Uncertain", avg_confidence, full_plate
