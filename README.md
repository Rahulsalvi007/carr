# RoadGuard AI: Vehicle & Road Safety Monitoring System 🚦🚗🏍️

An enterprise-grade, real-time computer vision and road-safety intelligence system built with **FastAPI**, **YOLOv8**, **ByteTrack**, **OpenCV**, **EasyOCR**, **SQLite/PostgreSQL**, and a modern **React 19 + Vite + Tailwind CSS** dashboard.

---

## 🌟 Key Capabilities

1. **Multi-Class Vehicle Detection & ByteTrack Tracking**:
   - Detects Cars, Motorcycles/Bikes, Buses, Trucks, and Bicycles simultaneously.
   - Preserves persistent `track_id` across video frames to prevent duplicate counting.
2. **License Plate Localization & OCR Engine**:
   - Multi-stage detection: Evaluates custom YOLO plate weights or falls back to robust OpenCV morphological Sobel edge and aspect-ratio filtering.
   - Preprocesses crops via bilateral filtering, CLAHE contrast enhancement, and unsharp masking.
   - Recognizes alphanumeric text using EasyOCR and validates Indian state codes and international formats.
   - Strict confidence thresholding: never invents fake numbers; marks low-confidence crops as `Uncertain`.
3. **Motorcycle Rider Association & Helmet Violation Detection**:
   - Spatially links detected riders to their corresponding motorcycles.
   - Crops head regions and verifies helmet compliance via smooth dome geometry, skin-tone ratio, and custom YOLO weights.
   - Confidently flags safety infractions only when crossing configured confidence gates.
4. **Electric Vehicle (EV) vs Fuel Classification**:
   - Detects mandated high-visibility green registration plates (HSV colorimetry) and front/rear cues.
   - Gated to `Unknown` when visual evidence is insufficient to avoid false claims.
5. **Smart Violation Rule Engine & Cooldown Manager**:
   - Rules: `NO_HELMET`, `MISSING_PLATE`, `UNREADABLE_PLATE`.
   - Prevents alert spam through vehicle ID tracking and cooldown timeouts.
   - Automatically crops, annotates, and saves high-resolution violation snapshots.
6. **Wireless Smartphone Surveillance Mode**:
   - *Any smartphone can be instantly converted into a wireless AI surveillance camera.*
   - Simply open `http://<laptop-ip>:5173` on your mobile browser; the phone streams rear-camera frames to the backend AI pipeline in real time.
7. **Interactive Web Dashboard**:
   - Live Canvas HUD with bounding box overlays, color-coded badges, and telemetry (FPS, inference ms).
   - Media Uploader for instant image analysis and frame-by-frame video processing with downloadable annotated MP4 output.
   - Audit history table with search, filters, pagination, and one-click CSV report export.
   - Real-time Analytics powered by Recharts (hourly traffic flow, vehicle distributions, compliance gauge).

---

## 🏗️ Architecture & Pipeline Flow

```text
Camera / Phone Feed / Image / Video
               ↓
    OpenCV Video Preprocessing
               ↓
  YOLOv8 Detection + ByteTrack Tracker
       ↙                     ↘
Cars / Buses / Trucks       Motorcycles / Bikes
       ↓                             ↓
Plate Localization ROI       Rider Association & Head Crop
       ↓                             ↓
CLAHE & OpenCV Sharpen       Helmet Classifier (YES/NO/Unknown)
       ↓                             ↓
EasyOCR Text Recognition             │
       ↓                             │
EV vs Conventional Classifier        │
       ↘                             ↙
          Violation Rule Engine
       (Cooldown Deduplication Filter)
               ↓
        SQLite / PostgreSQL
               ↓
     WebSockets / REST API
               ↓
      React Vite Dashboard
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup

```bash
# Clone or navigate to project directory
cd "c:\Users\DELL\3D Objects\Traffic"

# Activate the existing virtual environment (or create one)
.\.venv\Scripts\activate

# Run backend API server
python backend/run.py
```
The backend starts at: **`http://localhost:8000`**  
Interactive Swagger API documentation: **`http://localhost:8000/docs`**

### 2. Frontend Setup

Open a second terminal:

```bash
cd "c:\Users\DELL\3D Objects\Traffic\frontend"

# Install dependencies (already installed)
npm install

# Start Vite development server
npm run dev
```
The dashboard will open at: **`http://localhost:5173`**

---

## 📱 How to Use a Smartphone as a Wireless AI Camera

1. Ensure your smartphone and laptop are connected to the **same Wi-Fi network**.
2. Find your laptop's local IP address (e.g. `192.168.1.15`).
3. On your phone's browser (Chrome, Safari, Brave), navigate to:
   ```text
   http://192.168.1.15:5173
   ```
4. Click **Connect Phone Cam** or open the **Phone Camera** tab.
5. Tap **Activate Camera on This Device** and grant camera permission.
6. The phone begins streaming live frames to your laptop backend. The laptop processes YOLO tracking, helmet checking, and plate recognition in real time.

---

## ⚙️ AI Confidence Thresholds & Configuration

All thresholds can be adjusted in real time from the **Settings & Models** page or via `.env`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `VEHICLE_THRESHOLD` | `0.50` | Minimum confidence for vehicle detection |
| `HELMET_THRESHOLD` | `0.70` | Strict confidence required before flagging a helmet violation |
| `PLATE_THRESHOLD` | `0.65` | Confidence required to isolate license plate |
| `OCR_THRESHOLD` | `0.75` | Minimum confidence for OCR characters; lower shows `Uncertain` |
| `EV_THRESHOLD` | `0.80` | Confidence gate for Electric Vehicle classification |
| `VIOLATION_COOLDOWN_SECONDS` | `60` | Cooldown period to suppress duplicate infraction records |

---

## 🎯 Adding Custom YOLO Weights

The system is engineered with pluggable weights. If you train custom YOLO models on Roboflow or custom traffic datasets:

- **Custom Helmet Model**: Place `best.pt` in `backend/models/helmet/best.pt`
- **Custom License Plate Model**: Place `best.pt` in `backend/models/plate/best.pt`
- **Custom EV Classifier**: Place `best.pt` in `backend/models/vehicle/ev_classifier.pt`

If custom weights are absent, the system seamlessly uses intelligent computer vision heuristics (OpenCV morphology + EasyOCR + colorimetry), ensuring 100% operation immediately out-of-the-box!

---

## 🧪 Running Automated Tests

Run the automated test suite verifying OCR, EV classification, helmet detection, and violation deduplication:

```bash
.\.venv\Scripts\python.exe -m pytest tests/test_pipeline.py -v
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/detect/image` | Analyzes image; returns detections + base64 annotated preview + violations |
| `POST` | `/api/detect/video` | Processes video frame-by-frame; generates downloadable annotated MP4 |
| `GET` | `/api/violations` | List logged violations with filters and snapshot URLs |
| `PATCH` | `/api/violations/{id}/status` | Updates status (`ACTIVE`, `REVIEWED`, `DISMISSED`) |
| `GET` | `/api/analytics` | Aggregated traffic volume, helmet compliance, and vehicle types |
| `GET` | `/api/vehicles` | List uniquely tracked vehicles with first/last seen timestamps |
| `GET` | `/api/config` | View thresholds and model status |
| `POST` | `/api/config` | Dynamically update AI thresholds |
| `WS` | `/ws/live` | WebSocket endpoint for real-time live camera streaming and HUD overlay |

---

## 📄 License
MIT License. Suitable for college capstones, research portfolios, and hackathon demonstrations.
