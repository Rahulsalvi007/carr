import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle,
  Save,
  RotateCcw,
  Cpu,
  FolderOpen,
  Info,
  Shield,
  Layers
} from 'lucide-react';
import { getConfig, updateConfig } from '../services/api';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Threshold States
  const [vehicleThresh, setVehicleThresh] = useState(0.50);
  const [helmetThresh, setHelmetThresh] = useState(0.70);
  const [plateThresh, setPlateThresh] = useState(0.65);
  const [ocrThresh, setOcrThresh] = useState(0.75);
  const [evThresh, setEvThresh] = useState(0.80);
  const [cooldownSec, setCooldownSec] = useState(60);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await getConfig();
      setConfig(res.data);
      const t = res.data.thresholds || {};
      if (t.vehicle_threshold !== undefined) setVehicleThresh(t.vehicle_threshold);
      if (t.helmet_threshold !== undefined) setHelmetThresh(t.helmet_threshold);
      if (t.plate_threshold !== undefined) setPlateThresh(t.plate_threshold);
      if (t.ocr_threshold !== undefined) setOcrThresh(t.ocr_threshold);
      if (t.ev_threshold !== undefined) setEvThresh(t.ev_threshold);
      if (t.violation_cooldown_seconds !== undefined) setCooldownSec(t.violation_cooldown_seconds);
    } catch (err) {
      console.error("Error fetching config", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateConfig({
        vehicle_threshold: parseFloat(vehicleThresh),
        helmet_threshold: parseFloat(helmetThresh),
        plate_threshold: parseFloat(plateThresh),
        ocr_threshold: parseFloat(ocrThresh),
        ev_threshold: parseFloat(evThresh),
        violation_cooldown_seconds: parseInt(cooldownSec)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(`Error saving configuration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setVehicleThresh(0.50);
    setHelmetThresh(0.70);
    setPlateThresh(0.65);
    setOcrThresh(0.75);
    setEvThresh(0.80);
    setCooldownSec(60);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">AI Thresholds & Model Settings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Fine-tune computer vision confidence scores, cooldowns, and model weight configurations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
          >
            {isSaving ? <RotateCcw size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{saveSuccess ? 'Saved Successfully!' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-400">
          <CheckCircle size={18} />
          <span>Configuration updated in the active AI computer vision pipeline in real time.</span>
        </div>
      )}

      {/* Threshold Sliders Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Sliders */}
        <div className="cyber-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2.5">
            <Sliders size={20} className="text-blue-400" />
            <h3 className="font-bold text-base text-white">Confidence Gate Thresholds</h3>
          </div>
          <p className="text-xs text-slate-400">
            Detections below these thresholds are marked as <em>Uncertain</em> or suppressed to prevent false alerts.
          </p>

          <div className="space-y-5">
            {/* Vehicle Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Vehicle Detection Threshold</span>
                <span className="font-mono text-blue-400 font-bold">{Math.round(vehicleThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.95"
                step="0.05"
                value={vehicleThresh}
                onChange={(e) => setVehicleThresh(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block">YOLO candidate filter for cars, bikes, buses, and trucks.</span>
            </div>

            {/* Helmet Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Helmet Safety Threshold</span>
                <span className="font-mono text-rose-400 font-bold">{Math.round(helmetThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={helmetThresh}
                onChange={(e) => setHelmetThresh(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block">Only registers violation when confidence crosses this threshold.</span>
            </div>

            {/* Plate Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Number Plate Localization</span>
                <span className="font-mono text-emerald-400 font-bold">{Math.round(plateThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={plateThresh}
                onChange={(e) => setPlateThresh(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block">Confidence required to crop and isolate license plate region.</span>
            </div>

            {/* OCR Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">OCR Character Recognition</span>
                <span className="font-mono text-amber-400 font-bold">{Math.round(ocrThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.05"
                value={ocrThresh}
                onChange={(e) => setOcrThresh(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block">If OCR confidence is below this, plate displays as "Uncertain".</span>
            </div>

            {/* EV Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Electric Vehicle (EV) Threshold</span>
                <span className="font-mono text-cyan-400 font-bold">{Math.round(evThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={evThresh}
                onChange={(e) => setEvThresh(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block">Strict gating for green plate / EV identification without guessing.</span>
            </div>

            {/* Cooldown */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Violation Cooldown Period</span>
                <span className="font-mono text-purple-400 font-bold">{cooldownSec}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={cooldownSec}
                onChange={(e) => setCooldownSec(parseInt(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block">Prevents duplicate infraction spam for the same tracked vehicle ID.</span>
            </div>
          </div>
        </div>

        {/* System & Model Weights Status */}
        <div className="cyber-card rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Cpu size={20} className="text-indigo-400" />
              <h3 className="font-bold text-base text-white">Model Weights Architecture</h3>
            </div>
            <p className="text-xs text-slate-400">
              The system features a dual-stage architecture. If custom fine-tuned weights are present in these folders, they take precedence over heuristic detectors.
            </p>

            <div className="space-y-3">
              {/* YOLO Vehicle */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Vehicle Detector</span>
                  <span className="text-[11px] font-mono text-slate-400">yolov8n.pt</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  Active (Official)
                </span>
              </div>

              {/* Custom Helmet Model */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Custom Helmet Weights</span>
                  <span className="text-[11px] font-mono text-slate-400">backend/models/helmet/best.pt</span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  config?.models?.custom_helmet_model?.loaded
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {config?.models?.custom_helmet_model?.loaded ? 'Custom Loaded' : 'Vision Heuristics Engine'}
                </span>
              </div>

              {/* Custom Plate Model */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Custom Number Plate Weights</span>
                  <span className="text-[11px] font-mono text-slate-400">backend/models/plate/best.pt</span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  config?.models?.custom_plate_model?.loaded
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {config?.models?.custom_plate_model?.loaded ? 'Custom Loaded' : 'Morphological Sobel Engine'}
                </span>
              </div>

              {/* Hardware Acceleration */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Hardware Acceleration</span>
                  <span className="text-[11px] font-mono text-slate-400">PyTorch {config?.system?.torch_version}</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                  {config?.system?.device || 'CPU'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <span className="font-bold text-slate-300 block">How to Drop In Custom YOLO Models:</span>
            <p>
              To train custom YOLO models, train on Roboflow/COCO format and place your resulting <code>best.pt</code> file into <code>backend/models/helmet/best.pt</code> or <code>backend/models/plate/best.pt</code>. The system detects them on launch automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
