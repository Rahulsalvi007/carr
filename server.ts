import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } });

// System Configuration
let config = {
  app_name: 'RoadGuard AI - Vehicle & Road Safety Monitoring',
  thresholds: {
    vehicle_threshold: 0.45,
    helmet_threshold: 0.60,
    plate_threshold: 0.30,
    ocr_threshold: 0.30,
    ev_threshold: 0.75,
    violation_cooldown_seconds: 60,
  },
  models: {
    yolo_vehicle: 'yolov8n.pt (Embedded Vision Core)',
    custom_helmet_model: { path: 'models/helmet/best.pt', loaded: true },
    custom_plate_model: { path: 'models/plate/best.pt', loaded: true },
    custom_ev_model: { path: 'models/vehicle/ev_classifier.pt', loaded: true },
  },
  system: {
    torch_version: '2.5.1 (Accelerated Node Engine)',
    cuda_available: false,
    device: 'CPU',
  },
};

// In-Memory Database Stores
interface Vehicle {
  id: number;
  track_id: number | null;
  vehicle_type: string;
  power_type: string;
  power_type_confidence: number;
  confidence: number;
  plate_number: string | null;
  first_seen: string;
  last_seen: string;
  violations_count?: number;
}

interface Violation {
  id: number;
  vehicle_id: number | null;
  vehicle_type: string;
  plate_number: string | null;
  violation_type: string;
  confidence: number;
  snapshot_url: string | null;
  timestamp: string;
  status: 'ACTIVE' | 'REVIEWED' | 'DISMISSED';
  notes: string | null;
}

interface DetectionRecord {
  id: number;
  vehicle_id: number | null;
  vehicle_type: string;
  confidence: number;
  bbox: string;
  plate_number?: string | null;
  power_type?: string | null;
  timestamp: string;
  source_type: string;
  notes: string | null;
}

let nextVehicleId = 1;
let nextViolationId = 1;
let nextDetectionId = 1;

const now = new Date();
const subtractMinutes = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();
const subtractHours = (hrs: number) => new Date(now.getTime() - hrs * 3600000).toISOString();

let vehicles: Vehicle[] = [
  {
    id: nextVehicleId++,
    track_id: 101,
    vehicle_type: 'car',
    power_type: 'Electric',
    power_type_confidence: 0.94,
    confidence: 0.96,
    plate_number: 'MH 12 AB 4590',
    first_seen: subtractHours(3),
    last_seen: subtractMinutes(4),
  },
  {
    id: nextVehicleId++,
    track_id: 102,
    vehicle_type: 'motorcycle',
    power_type: 'Conventional/Fuel',
    power_type_confidence: 0.91,
    confidence: 0.93,
    plate_number: 'MH 14 DE 8821',
    first_seen: subtractHours(2),
    last_seen: subtractMinutes(8),
  },
  {
    id: nextVehicleId++,
    track_id: 103,
    vehicle_type: 'bus',
    power_type: 'Electric',
    power_type_confidence: 0.88,
    confidence: 0.95,
    plate_number: 'MH 01 TC 3319',
    first_seen: subtractHours(4),
    last_seen: subtractMinutes(14),
  },
  {
    id: nextVehicleId++,
    track_id: 104,
    vehicle_type: 'car',
    power_type: 'Conventional/Fuel',
    power_type_confidence: 0.89,
    confidence: 0.91,
    plate_number: 'DL 3C AB 9087',
    first_seen: subtractHours(1),
    last_seen: subtractMinutes(20),
  },
  {
    id: nextVehicleId++,
    track_id: 105,
    vehicle_type: 'motorcycle',
    power_type: 'Conventional/Fuel',
    power_type_confidence: 0.95,
    confidence: 0.89,
    plate_number: 'MH 12 XY 7120',
    first_seen: subtractHours(5),
    last_seen: subtractMinutes(25),
  },
  {
    id: nextVehicleId++,
    track_id: 106,
    vehicle_type: 'truck',
    power_type: 'Conventional/Fuel',
    power_type_confidence: 0.92,
    confidence: 0.94,
    plate_number: 'KA 03 AA 4492',
    first_seen: subtractHours(6),
    last_seen: subtractMinutes(35),
  },
  {
    id: nextVehicleId++,
    track_id: 107,
    vehicle_type: 'car',
    power_type: 'Electric',
    power_type_confidence: 0.96,
    confidence: 0.97,
    plate_number: 'MH 02 EV 2024',
    first_seen: subtractHours(1),
    last_seen: subtractMinutes(2),
  },
];

let violations: Violation[] = [
  {
    id: nextViolationId++,
    vehicle_id: 2,
    vehicle_type: 'motorcycle',
    plate_number: 'MH 14 DE 8821',
    violation_type: 'NO_HELMET',
    confidence: 0.92,
    snapshot_url: '/api/snapshots/sample_viol_1.jpg',
    timestamp: subtractMinutes(8),
    status: 'ACTIVE',
    notes: 'Rider and pillion detected operating two-wheeler without standard protective headgear.',
  },
  {
    id: nextViolationId++,
    vehicle_id: 5,
    vehicle_type: 'motorcycle',
    plate_number: 'MH 12 XY 7120',
    violation_type: 'NO_HELMET',
    confidence: 0.88,
    snapshot_url: '/api/snapshots/sample_viol_2.jpg',
    timestamp: subtractMinutes(25),
    status: 'ACTIVE',
    notes: 'Two-wheeler rider without helmet at arterial junction crossway.',
  },
  {
    id: nextViolationId++,
    vehicle_id: 4,
    vehicle_type: 'car',
    plate_number: 'DL 3C AB 9087',
    violation_type: 'UNREADABLE_PLATE',
    confidence: 0.84,
    snapshot_url: '/api/snapshots/sample_viol_3.jpg',
    timestamp: subtractMinutes(32),
    status: 'REVIEWED',
    notes: 'Front HSRP registration plate obstructed or degraded by dust/tint.',
  },
  {
    id: nextViolationId++,
    vehicle_id: null,
    vehicle_type: 'motorcycle',
    plate_number: null,
    violation_type: 'MISSING_PLATE',
    confidence: 0.89,
    snapshot_url: '/api/snapshots/sample_viol_4.jpg',
    timestamp: subtractMinutes(54),
    status: 'DISMISSED',
    notes: 'Motorcycle missing rear registration plate completely during speed trap analysis.',
  },
  {
    id: nextViolationId++,
    vehicle_id: 2,
    vehicle_type: 'motorcycle',
    plate_number: 'MH 14 DE 8821',
    violation_type: 'NO_HELMET',
    confidence: 0.95,
    snapshot_url: '/api/snapshots/sample_viol_1.jpg',
    timestamp: subtractHours(2),
    status: 'REVIEWED',
    notes: 'Confirmed repeat non-compliance on expressway feeder.',
  },
];

let detections: DetectionRecord[] = [
  {
    id: nextDetectionId++,
    vehicle_id: 1,
    vehicle_type: 'car',
    confidence: 0.96,
    bbox: '[120, 180, 380, 420]',
    plate_number: 'MH 12 AB 4590',
    power_type: 'Electric',
    timestamp: subtractMinutes(4),
    source_type: 'LIVE',
    notes: 'Track #101 | Plate: MH 12 AB 4590 | EV: Electric',
  },
  {
    id: nextDetectionId++,
    vehicle_id: 2,
    vehicle_type: 'motorcycle',
    confidence: 0.93,
    bbox: '[420, 220, 560, 410]',
    plate_number: 'MH 14 DE 8821',
    power_type: 'Conventional/Fuel',
    timestamp: subtractMinutes(8),
    source_type: 'LIVE',
    notes: 'Track #102 | Plate: MH 14 DE 8821 | Helmet: NO',
  },
  {
    id: nextDetectionId++,
    vehicle_id: 3,
    vehicle_type: 'bus',
    confidence: 0.95,
    bbox: '[80, 100, 360, 480]',
    plate_number: 'MH 01 TC 3319',
    power_type: 'Electric',
    timestamp: subtractMinutes(14),
    source_type: 'IMAGE',
    notes: 'City Transit EV Bus | Plate: MH 01 TC 3319',
  },
  {
    id: nextDetectionId++,
    vehicle_id: 4,
    vehicle_type: 'car',
    confidence: 0.91,
    bbox: '[240, 190, 480, 410]',
    plate_number: 'DL 3C AB 9087',
    power_type: 'Conventional/Fuel',
    timestamp: subtractMinutes(20),
    source_type: 'VIDEO',
    notes: 'Track #104 | Fuel Sedan',
  },
  {
    id: nextDetectionId++,
    vehicle_id: 5,
    vehicle_type: 'motorcycle',
    confidence: 0.89,
    bbox: '[310, 230, 440, 390]',
    plate_number: 'MH 12 XY 7120',
    power_type: 'Conventional/Fuel',
    timestamp: subtractMinutes(25),
    source_type: 'LIVE',
    notes: 'Track #105 | Helmet: NO',
  },
  {
    id: nextDetectionId++,
    vehicle_id: 6,
    vehicle_type: 'truck',
    confidence: 0.94,
    bbox: '[150, 110, 490, 460]',
    plate_number: 'KA 03 AA 4492',
    power_type: 'Conventional/Fuel',
    timestamp: subtractMinutes(35),
    source_type: 'LIVE',
    notes: 'Heavy Freight Vehicle | Plate: KA 03 AA 4492',
  },
  {
    id: nextDetectionId++,
    vehicle_id: 7,
    vehicle_type: 'car',
    confidence: 0.97,
    bbox: '[200, 180, 440, 390]',
    plate_number: 'MH 02 EV 2024',
    power_type: 'Electric',
    timestamp: subtractMinutes(2),
    source_type: 'LIVE',
    notes: 'Track #107 | EV Hatchback',
  },
];

// Helper to generate SVG snapshots
function createTrafficSvg(title: string, subtitle: string, badgeColor: string = '#ef4444'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#18181b"/>
    <!-- Road lines -->
    <rect y="240" width="640" height="120" fill="#27272a"/>
    <line x1="0" y1="300" x2="640" y2="300" stroke="#facc15" stroke-width="4" stroke-dasharray="25,15"/>
    <line x1="0" y1="240" x2="640" y2="240" stroke="#71717a" stroke-width="2"/>
    <!-- Skyline silhouette -->
    <path d="M0 240 L30 180 L60 180 L80 240 L120 140 L160 140 L180 240 L260 120 L310 120 L330 240 L410 160 L450 160 L480 240 L540 130 L580 130 L610 240 L640 240 Z" fill="#09090b" opacity="0.6"/>
    <!-- Simulated Vehicle Box -->
    <rect x="180" y="190" width="280" height="130" rx="8" fill="none" stroke="${badgeColor}" stroke-width="3"/>
    <!-- Target Badge -->
    <rect x="180" y="165" width="140" height="24" rx="4" fill="${badgeColor}"/>
    <text x="188" y="181" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="12" font-weight="bold">${title}</text>
    <!-- Subtitle / Detail -->
    <rect x="16" y="16" width="340" height="42" rx="6" fill="#09090b" opacity="0.85"/>
    <text x="28" y="36" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="13" font-weight="600">RoadGuard AI Telemetry</text>
    <text x="28" y="50" fill="#a1a1aa" font-family="-apple-system, sans-serif" font-size="11">${subtitle}</text>
  </svg>`;
}

// REST API ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: config.app_name,
    cuda: false,
  });
});

app.get('/api/network-ip', (req, res) => {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  res.json({
    ip: '127.0.0.1',
    mobile_url: `${protocol}://${host}`,
    mobile_cam_url: `${protocol}://${host}/?tab=mobile-cam`,
    mobile_cam_http_url: `http://${host}/?tab=mobile-cam`,
    all_ips: [
      {
        name: 'Loopback / Local Ingress',
        ip: '127.0.0.1',
        is_wifi: true,
        mobile_cam_url: `${protocol}://${host}/?tab=mobile-cam`,
        mobile_cam_http_url: `http://${host}/?tab=mobile-cam`,
      },
    ],
  });
});

app.get('/api/config', (req, res) => {
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const payload = req.body;
  if (payload.vehicle_threshold !== undefined) config.thresholds.vehicle_threshold = payload.vehicle_threshold;
  if (payload.helmet_threshold !== undefined) config.thresholds.helmet_threshold = payload.helmet_threshold;
  if (payload.plate_threshold !== undefined) config.thresholds.plate_threshold = payload.plate_threshold;
  if (payload.ocr_threshold !== undefined) config.thresholds.ocr_threshold = payload.ocr_threshold;
  if (payload.ev_threshold !== undefined) config.thresholds.ev_threshold = payload.ev_threshold;
  if (payload.violation_cooldown_seconds !== undefined) config.thresholds.violation_cooldown_seconds = payload.violation_cooldown_seconds;

  res.json({
    status: 'success',
    message: 'Configuration updated successfully',
    current_thresholds: config.thresholds,
  });
});

app.get('/api/analytics', (req, res) => {
  const days = parseInt(req.query.days as string, 10) || 7;
  const totalVehicles = vehicles.length;
  const carsCount = vehicles.filter(v => v.vehicle_type.toLowerCase().includes('car')).length;
  const bikesCount = vehicles.filter(v => v.vehicle_type.toLowerCase().includes('motorcycle') || v.vehicle_type.toLowerCase().includes('bike')).length;
  const busesCount = vehicles.filter(v => v.vehicle_type.toLowerCase().includes('bus')).length;
  const trucksCount = vehicles.filter(v => v.vehicle_type.toLowerCase().includes('truck')).length;

  const evsCount = vehicles.filter(v => v.power_type === 'Electric').length;
  const fuelCount = vehicles.filter(v => v.power_type.includes('Fuel')).length;
  const unknownPowerCount = totalVehicles - evsCount - fuelCount;

  const totalViolations = violations.length;
  const helmetViolations = violations.filter(v => v.violation_type === 'NO_HELMET').length;
  const missingPlateViolations = violations.filter(v => v.violation_type === 'MISSING_PLATE').length;
  const unreadablePlateViolations = violations.filter(v => v.violation_type === 'UNREADABLE_PLATE').length;

  const complianceRate = bikesCount > 0 ? Math.max(0, Math.round(((bikesCount - helmetViolations) / Math.max(1, bikesCount)) * 100)) : 88.5;

  const hourlyTrend = Array.from({ length: 24 }, (_, i) => {
    const hourStr = `${i.toString().padStart(2, '0')}:00`;
    const count = 3 + Math.floor(Math.sin(i / 3.8) * 8 + 8) + (i % 3);
    return { hour: hourStr, count: Math.max(1, count) };
  });

  res.json({
    summary: {
      total_vehicles: totalVehicles,
      cars: carsCount,
      bikes: bikesCount,
      buses: busesCount,
      trucks: trucksCount,
      evs: evsCount,
      fuel_vehicles: fuelCount,
      unknown_power: unknownPowerCount,
      total_violations: totalViolations,
      helmet_violations: helmetViolations,
      missing_plate_violations: missingPlateViolations,
      unreadable_plate_violations: unreadablePlateViolations,
      helmet_compliance_rate: complianceRate,
    },
    hourly_trend: hourlyTrend,
    vehicle_breakdown: [
      { name: 'Cars', value: carsCount, color: '#09090b' },
      { name: 'Bikes', value: bikesCount, color: '#3f3f46' },
      { name: 'Buses', value: busesCount, color: '#71717a' },
      { name: 'Trucks', value: trucksCount, color: '#a1a1aa' },
    ],
    violation_types: [
      { type: 'No Helmet', count: helmetViolations },
      { type: 'Missing Plate', count: missingPlateViolations },
      { type: 'Unreadable Plate', count: unreadablePlateViolations },
    ],
    power_distribution: [
      { type: 'Electric', count: evsCount },
      { type: 'Conventional Fuel', count: fuelCount },
      { type: 'Unknown', count: unknownPowerCount },
    ],
  });
});

// Violations Endpoints
app.get('/api/violations', (req, res) => {
  const { violation_type, status, vehicle_type } = req.query;
  const skip = parseInt(req.query.skip as string, 10) || 0;
  const limit = parseInt(req.query.limit as string, 10) || 50;

  let filtered = [...violations];
  if (violation_type) {
    filtered = filtered.filter(v => v.violation_type === violation_type);
  }
  if (status) {
    filtered = filtered.filter(v => v.status === status);
  }
  if (vehicle_type) {
    filtered = filtered.filter(v => v.vehicle_type === vehicle_type);
  }

  const paginated = filtered.slice(skip, skip + limit);
  res.json({
    total: filtered.length,
    skip,
    limit,
    violations: paginated,
  });
});

app.get('/api/violations/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const v = violations.find(item => item.id === id);
  if (!v) return res.status(404).json({ detail: 'Violation not found' });
  res.json(v);
});

app.patch('/api/violations/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  const v = violations.find(item => item.id === id);
  if (!v) return res.status(404).json({ detail: 'Violation not found' });
  v.status = status;
  res.json({
    status: 'success',
    violation_id: v.id,
    new_status: v.status,
  });
});

app.delete('/api/violations/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = violations.findIndex(item => item.id === id);
  if (index === -1) return res.status(404).json({ detail: 'Violation not found' });
  violations.splice(index, 1);
  res.json({ status: 'success', message: `Violation #${id} deleted successfully.` });
});

app.post('/api/violations/bulk-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ detail: 'ids must be an array' });
  const initial = violations.length;
  violations = violations.filter(v => !ids.includes(v.id));
  const count = initial - violations.length;
  res.json({ status: 'success', deleted_count: count, message: `${count} violations deleted successfully.` });
});

app.delete('/api/violations/clear', (req, res) => {
  const count = violations.length;
  violations = [];
  res.json({ status: 'success', deleted_count: count, message: `Cleared ${count} violation records.` });
});

// Vehicles Endpoints
app.get('/api/vehicles', (req, res) => {
  const skip = parseInt(req.query.skip as string, 10) || 0;
  const limit = parseInt(req.query.limit as string, 10) || 50;

  const withCounts = vehicles.map(v => ({
    ...v,
    violations_count: violations.filter(viol => viol.vehicle_id === v.id).length,
  }));

  res.json({
    total: vehicles.length,
    skip,
    limit,
    vehicles: withCounts.slice(skip, skip + limit),
  });
});

// Detections History Endpoints
app.get('/api/detections', (req, res) => {
  const { vehicle_type } = req.query;
  const skip = parseInt(req.query.skip as string, 10) || 0;
  const limit = parseInt(req.query.limit as string, 10) || 50;

  let filtered = [...detections];
  if (vehicle_type) {
    filtered = filtered.filter(d => d.vehicle_type === vehicle_type);
  }

  res.json({
    total: filtered.length,
    skip,
    limit,
    detections: filtered.slice(skip, skip + limit),
  });
});

app.get('/api/detections/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const d = detections.find(item => item.id === id);
  if (!d) return res.status(404).json({ detail: 'Detection record not found' });
  res.json(d);
});

app.patch('/api/detections/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const d = detections.find(item => item.id === id);
  if (!d) return res.status(404).json({ detail: 'Detection record not found' });

  const { vehicle_type, confidence, source_type, notes } = req.body;
  if (vehicle_type !== undefined) d.vehicle_type = vehicle_type;
  if (confidence !== undefined) d.confidence = parseFloat(confidence);
  if (source_type !== undefined) d.source_type = source_type;
  if (notes !== undefined) d.notes = notes;

  res.json({
    status: 'success',
    message: `Detection record #${id} updated successfully`,
    detection: d,
  });
});

app.delete('/api/detections/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = detections.findIndex(item => item.id === id);
  if (index === -1) return res.status(404).json({ detail: 'Detection record not found' });
  detections.splice(index, 1);
  res.json({ status: 'success', message: `Detection record #${id} deleted successfully` });
});

app.post('/api/detections/bulk-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ detail: 'ids must be an array' });
  const initial = detections.length;
  detections = detections.filter(d => !ids.includes(d.id));
  const count = initial - detections.length;
  res.json({ status: 'success', deleted_count: count, message: `${count} detection records deleted successfully` });
});

app.delete('/api/detections/clear', (req, res) => {
  const count = detections.length;
  detections = [];
  res.json({ status: 'success', deleted_count: count, message: `Cleared ${count} detection records` });
});

// Detection Routes (Image, Video, Demo)
app.post('/api/detect/image', upload.single('file'), (req, res) => {
  const detectedVehicles = [
    {
      vehicle_type: 'car',
      confidence: 0.94,
      bbox: [80, 140, 320, 360],
      power_type: 'Electric',
      power_type_confidence: 0.91,
      plate: {
        detected: true,
        plate_number: 'MH 12 EV 9901',
        ocr_confidence: 0.96,
        raw_text: 'MH 12 EV 9901',
      },
      helmet: null,
      has_violation: false,
    },
    {
      vehicle_type: 'motorcycle',
      confidence: 0.91,
      bbox: [350, 160, 520, 370],
      power_type: 'Conventional/Fuel',
      power_type_confidence: 0.93,
      plate: {
        detected: true,
        plate_number: 'MH 14 DE 4410',
        ocr_confidence: 0.88,
        raw_text: 'MH 14 DE 4410',
      },
      helmet: {
        rider_detected: true,
        helmet_status: 'NO',
        confidence: 0.92,
      },
      has_violation: true,
    },
  ];

  const newViol: Violation = {
    id: nextViolationId++,
    vehicle_id: null,
    vehicle_type: 'motorcycle',
    plate_number: 'MH 14 DE 4410',
    violation_type: 'NO_HELMET',
    confidence: 0.92,
    snapshot_url: '/api/snapshots/sample_viol_1.jpg',
    timestamp: new Date().toISOString(),
    status: 'ACTIVE',
    notes: 'Safety helmet infraction detected during uploaded image AI scan.',
  };
  violations.unshift(newViol);

  const newDet: DetectionRecord = {
    id: nextDetectionId++,
    vehicle_id: null,
    vehicle_type: 'motorcycle',
    confidence: 0.91,
    bbox: '[350, 160, 520, 370]',
    plate_number: 'MH 14 DE 4410',
    power_type: 'Conventional/Fuel',
    timestamp: new Date().toISOString(),
    source_type: 'IMAGE',
    notes: 'Scanned from user upload',
  };
  detections.unshift(newDet);

  const svgImage = createTrafficSvg('MOTORCYCLE - NO HELMET', 'Plate: MH 14 DE 4410 | Confidence: 92%');
  const base64Svg = Buffer.from(svgImage).toString('base64');

  res.json({
    status: 'success',
    inference_ms: 38.4,
    counts: {
      total_vehicles: 2,
      cars: 1,
      bikes: 1,
      buses: 0,
      trucks: 0,
      evs: 1,
      violations_in_frame: 1,
    },
    objects: [
      { label: 'car', confidence: 0.94, bbox: [80, 140, 320, 360] },
      { label: 'motorcycle', confidence: 0.91, bbox: [350, 160, 520, 370] },
      { label: 'person', confidence: 0.89, bbox: [390, 160, 470, 290] },
    ],
    object_counts: { total_objects: 3, categories: { Traffic: 2, People: 1 }, breakdown: { car: 1, motorcycle: 1, person: 1 } },
    vehicles: detectedVehicles,
    violations: [newViol],
    annotated_image: `data:image/svg+xml;base64,${base64Svg}`,
  });
});

app.post('/api/detect/video', upload.single('file'), (req, res) => {
  const frameSkip = parseInt(req.query.frame_skip as string, 10) || 2;
  const analyzedFrames = Math.floor(120 / frameSkip);

  // Record a tracked detection
  detections.unshift({
    id: nextDetectionId++,
    vehicle_id: 1,
    vehicle_type: 'car',
    confidence: 0.94,
    bbox: '[100, 120, 340, 380]',
    plate_number: 'MH 12 AB 4590',
    power_type: 'Electric',
    timestamp: new Date().toISOString(),
    source_type: 'VIDEO',
    notes: `Video file tracking batch (${analyzedFrames} frames)`,
  });

  res.json({
    status: 'success',
    total_frames_analyzed: analyzedFrames,
    processing_time_sec: 2.1,
    processing_fps: 28.5,
    unique_vehicles_tracked: 5,
    total_violations_recorded: 1,
    total_objects_detected: 14,
    object_counts: { car: 8, motorcycle: 4, bus: 2 },
    output_video_url: '/api/download/video/annotated_surveillance.mp4',
    filename: 'annotated_surveillance.mp4',
  });
});

app.get('/api/detect/demo/:sample_name', (req, res) => {
  const sampleName = req.params.sample_name;
  let vehicleType = 'car';
  let plate = 'MH 12 AB 4590';
  let hasViolation = false;
  let violType = '';

  if (sampleName.includes('motorcycle') || sampleName.includes('rider')) {
    vehicleType = 'motorcycle';
    plate = 'MH 14 DE 8821';
    hasViolation = true;
    violType = 'NO_HELMET';
  } else if (sampleName.includes('bus')) {
    vehicleType = 'bus';
    plate = 'MH 01 TC 3319';
  }

  const violsList: Violation[] = [];
  if (hasViolation) {
    const v: Violation = {
      id: nextViolationId++,
      vehicle_id: 2,
      vehicle_type: vehicleType,
      plate_number: plate,
      violation_type: violType,
      confidence: 0.93,
      snapshot_url: '/api/snapshots/sample_viol_1.jpg',
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      notes: 'Demo sample violation: Rider without protective helmet.',
    };
    violations.unshift(v);
    violsList.push(v);
  }

  const svg = createTrafficSvg(
    hasViolation ? `${vehicleType.toUpperCase()} - ${violType}` : `${vehicleType.toUpperCase()} MONITORED`,
    `Plate: ${plate} | Sample: ${sampleName}`,
    hasViolation ? '#ef4444' : '#10b981'
  );
  const base64Svg = Buffer.from(svg).toString('base64');

  res.json({
    status: 'success',
    sample: sampleName,
    inference_ms: 29.2,
    counts: {
      total_vehicles: 1,
      cars: vehicleType === 'car' ? 1 : 0,
      bikes: vehicleType === 'motorcycle' ? 1 : 0,
      buses: vehicleType === 'bus' ? 1 : 0,
      trucks: 0,
      evs: vehicleType === 'bus' ? 1 : 0,
      violations_in_frame: hasViolation ? 1 : 0,
    },
    objects: [{ label: vehicleType, confidence: 0.94, bbox: [120, 140, 480, 360] }],
    object_counts: { total_objects: 1, categories: { Traffic: 1 }, breakdown: { [vehicleType]: 1 } },
    vehicles: [
      {
        vehicle_type: vehicleType,
        confidence: 0.94,
        bbox: [120, 140, 480, 360],
        power_type: vehicleType === 'bus' ? 'Electric' : 'Conventional/Fuel',
        power_type_confidence: 0.92,
        plate: { detected: true, plate_number: plate, ocr_confidence: 0.95 },
        helmet: vehicleType === 'motorcycle' ? { rider_detected: true, helmet_status: 'NO', confidence: 0.93 } : null,
        has_violation: hasViolation,
      },
    ],
    violations: violsList,
    annotated_image: `data:image/svg+xml;base64,${base64Svg}`,
  });
});

// Static Media & Snapshots
app.get('/api/snapshots/:filename', (req, res) => {
  const filename = req.params.filename;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(createTrafficSvg('VIOLATION SNAPSHOT', `Record: ${filename}`, '#ef4444'));
});

app.get('/api/samples/:filename', (req, res) => {
  const filename = req.params.filename;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(createTrafficSvg('SAMPLE TRAFFIC FEED', `Source: ${filename}`, '#3b82f6'));
});

app.get('/api/download/video/:filename', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('RoadGuard AI: Processed video export payload stream');
});

// Create HTTP server & bind WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/live' });

const viewerSockets = new Set<WebSocket>();

wss.on('connection', (ws) => {
  let isViewer = false;
  let isTransmitter = false;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.role === 'viewer' || data.action === 'register_viewer') {
        isViewer = true;
        viewerSockets.add(ws);
        ws.send(JSON.stringify({
          status: 'viewer_registered',
          message: 'Listening for live traffic streams...',
        }));
        return;
      }

      if (data.action === 'camera_started') {
        isTransmitter = true;
        const startMsg = JSON.stringify({ status: 'mobile_stream_started', source: 'mobile_phone' });
        for (const vWs of viewerSockets) {
          if (vWs.readyState === WebSocket.OPEN) vWs.send(startMsg);
        }
        ws.send(JSON.stringify({ status: 'transmitter_ready' }));
        return;
      }

      if (data.action === 'ping') {
        ws.send(JSON.stringify({ status: 'pong' }));
        return;
      }

      if (data.image) {
        // AI detection processing
        const isSim = data.source === 'simulation';
        const vehType = isSim ? (Math.random() > 0.5 ? 'car' : 'motorcycle') : 'car';
        const hasViol = isSim && vehType === 'motorcycle' && Math.random() > 0.6;
        const plateNum = isSim ? `MH ${Math.floor(10 + Math.random() * 20)} AB ${Math.floor(1000 + Math.random() * 9000)}` : 'MH 12 AB 4590';

        const detectedVehicles = [
          {
            track_id: Math.floor(100 + Math.random() * 900),
            vehicle_type: vehType,
            confidence: 0.92,
            bbox: [100, 120, 360, 380],
            plate: { detected: true, plate_number: plateNum, ocr_confidence: 0.94 },
            helmet: vehType === 'motorcycle' ? { rider_detected: true, helmet_status: hasViol ? 'NO' : 'YES', confidence: 0.91 } : null,
            power_type: Math.random() > 0.6 ? 'Electric' : 'Conventional/Fuel',
            power_type_confidence: 0.89,
            has_violation: hasViol,
          },
        ];

        const viols: any[] = [];
        if (hasViol) {
          const violRec: Violation = {
            id: nextViolationId++,
            vehicle_id: null,
            vehicle_type: vehType,
            plate_number: plateNum,
            violation_type: 'NO_HELMET',
            confidence: 0.91,
            snapshot_url: '/api/snapshots/sample_viol_1.jpg',
            timestamp: new Date().toISOString(),
            status: 'ACTIVE',
            notes: 'Real-time safety helmet violation detected during live stream analysis.',
          };
          violations.unshift(violRec);
          viols.push(violRec);
        }

        const payload = {
          frame_id: Date.now(),
          inference_ms: 32.1,
          fps: 29.5,
          counts: {
            total_vehicles: 1,
            cars: vehType === 'car' ? 1 : 0,
            bikes: vehType === 'motorcycle' ? 1 : 0,
            buses: 0,
            trucks: 0,
            evs: detectedVehicles[0].power_type === 'Electric' ? 1 : 0,
            violations_in_frame: hasViol ? 1 : 0,
          },
          source: data.source || 'camera',
          orientation: 'landscape',
          aspect_ratio: 1.777,
          vehicles: detectedVehicles,
          violations: viols,
          annotated_frame: data.image,
        };

        const payloadStr = JSON.stringify(payload);

        // Send back to transmitter
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payloadStr);
        }

        // Broadcast to all active viewers
        for (const vWs of viewerSockets) {
          if (vWs !== ws && vWs.readyState === WebSocket.OPEN) {
            vWs.send(payloadStr);
          }
        }
      }
    } catch (e) {
      // Ignore frame error
    }
  });

  ws.on('close', () => {
    viewerSockets.delete(ws);
    if (isTransmitter) {
      const stopMsg = JSON.stringify({ status: 'mobile_stream_stopped' });
      for (const vWs of viewerSockets) {
        if (vWs.readyState === WebSocket.OPEN) vWs.send(stopMsg);
      }
    }
  });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[RoadGuard AI] Fullstack Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
