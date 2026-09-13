import cv2
import numpy as np
from pathlib import Path

SAMPLE_DIR = Path(__file__).resolve().parent
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

def generate_sample_traffic_image():
    """
    Generates realistic road scene with cars, motorcycles, and number plates.
    """
    # Create road background (asphalt gray)
    w, h = 1280, 720
    img = np.zeros((h, w, 3), dtype=np.uint8)
    
    # Sky
    img[0:240, :] = [210, 180, 140] # BGR light sky
    # Trees/Buildings horizon
    img[200:300, :] = [80, 110, 60]
    # Asphalt Road
    img[280:h, :] = [50, 50, 55]

    # Road lane markings
    for y in range(320, h, 80):
        cv2.line(img, (w // 2 - 10, y), (w // 2 - 10, y + 40), (255, 255, 255), 4)
        cv2.line(img, (w // 2 + 10, y), (w // 2 + 10, y + 40), (255, 255, 255), 4)

    # Road edges
    cv2.line(img, (120, 280), (20, h), (0, 200, 255), 3)
    cv2.line(img, (w - 120, 280), (w - 20, h), (0, 200, 255), 3)

    # Vehicle 1: Silver Sedan / Car (left lane)
    cx, cy, cw, ch = 280, 380, 240, 180
    cv2.rectangle(img, (cx, cy), (cx + cw, cy + ch), (180, 180, 185), -1) # Body
    cv2.rectangle(img, (cx + 20, cy - 60), (cx + cw - 20, cy), (160, 160, 165), -1) # Cabin/Roof
    # Rear windshield
    cv2.rectangle(img, (cx + 30, cy - 50), (cx + cw - 30, cy - 5), (60, 60, 70), -1)
    # Taillights
    cv2.rectangle(img, (cx + 10, cy + 30), (cx + 50, cy + 60), (20, 20, 220), -1)
    cv2.rectangle(img, (cx + cw - 50, cy + 30), (cx + cw - 10, cy + 60), (20, 20, 220), -1)
    # Tires
    cv2.rectangle(img, (cx + 15, cy + ch - 20), (cx + 55, cy + ch + 20), (20, 20, 20), -1)
    cv2.rectangle(img, (cx + cw - 55, cy + ch - 20), (cx + cw - 15, cy + ch + 20), (20, 20, 20), -1)

    # License plate (Standard White Plate: DL01AB1234)
    px1, py1, pw, ph = cx + 60, cy + 90, 120, 35
    cv2.rectangle(img, (px1, py1), (px1 + pw, py1 + ph), (255, 255, 255), -1)
    cv2.rectangle(img, (px1, py1), (px1 + pw, py1 + ph), (0, 0, 0), 2)
    cv2.putText(img, "DL01AB1234", (px1 + 8, py1 + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)

    # Vehicle 2: Electric SUV (right lane, with green license plate)
    ex, ey, ew, eh = 780, 360, 280, 210
    cv2.rectangle(img, (ex, ey), (ex + ew, ey + eh), (40, 90, 150), -1) # Blue SUV body
    cv2.rectangle(img, (ex + 30, ey - 70), (ex + ew - 30, ey), (35, 75, 125), -1) # Roof
    # Rear glass
    cv2.rectangle(img, (ex + 45, ey - 60), (ex + ew - 45, ey - 10), (40, 40, 50), -1)
    # Taillights
    cv2.rectangle(img, (ex + 15, ey + 30), (ex + 60, ey + 60), (30, 30, 240), -1)
    cv2.rectangle(img, (ex + ew - 60, ey + 30), (ex + ew - 15, ey + 60), (30, 30, 240), -1)
    # Tires
    cv2.rectangle(img, (ex + 20, ey + eh - 20), (ex + 65, ey + eh + 25), (20, 20, 20), -1)
    cv2.rectangle(img, (ex + ew - 65, ey + eh - 20), (ex + ew - 20, ey + eh + 25), (20, 20, 20), -1)

    # EV License plate (Indian EV Green Plate: RJ14EV9999)
    epx1, epy1, epw, eph = ex + 80, ey + 110, 120, 35
    cv2.rectangle(img, (epx1, epy1), (epx1 + epw, epy1 + eph), (40, 180, 50), -1) # Vivid Green
    cv2.rectangle(img, (epx1, epy1), (epx1 + epw, epy1 + eph), (0, 0, 0), 2)
    cv2.putText(img, "RJ14EV9999", (epx1 + 6, epy1 + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 2)

    # Vehicle 3: Motorcycle with rider without helmet (Center-right violation case)
    mx, my, mw, mh = 560, 420, 80, 140
    # Bike wheels & chassis
    cv2.circle(img, (mx + 20, my + mh), 22, (25, 25, 25), -1)
    cv2.circle(img, (mx + mw - 15, my + mh), 22, (25, 25, 25), -1)
    cv2.line(img, (mx + 20, my + mh), (mx + 40, my + 70), (200, 30, 30), 5)
    cv2.line(img, (mx + mw - 15, my + mh), (mx + 40, my + 70), (200, 30, 30), 5)
    cv2.rectangle(img, (mx + 30, my + 50), (mx + 60, my + 80), (220, 20, 20), -1)

    # Rider torso & arms
    cv2.rectangle(img, (mx + 25, my + 10), (mx + 55, my + 60), (30, 40, 100), -1) # Blue shirt
    # Rider head (skin color + black hair, NO HELMET)
    cv2.circle(img, (mx + 40, my - 5), 15, (140, 180, 225), -1) # Face skin tone
    cv2.ellipse(img, (mx + 40, my - 12), (14, 8), 0, 0, 180, (20, 20, 20), -1) # Hair on top

    out_file = SAMPLE_DIR / "sample_traffic.jpg"
    cv2.imwrite(str(out_file), img)
    print(f"Sample traffic image created at: {out_file}")

if __name__ == "__main__":
    generate_sample_traffic_image()
