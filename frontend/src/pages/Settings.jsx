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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 m-0">AI Thresholds & Model Settings</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Fine-tune computer vision confidence scores, cooldowns, and model weight configurations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-medium border border-zinc-300 transition-colors shadow-sm"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-all"
          >
            {isSaving ? <RotateCcw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{saveSuccess ? 'Saved' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
          <CheckCircle size={16} />
          <span>Configuration updated in the active AI computer vision pipeline in real time.</span>
        </div>
      )}

      {/* Threshold Sliders Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Sliders */}
        <div className="pro-card rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-zinc-600" />
            <h3 className="font-bold text-sm text-zinc-950">Confidence Gate Thresholds</h3>
          </div>
          <p className="text-xs text-zinc-500">
            Detections below these thresholds are marked as uncertain or suppressed to prevent false alerts.
          </p>

          <div className="space-y-4">
            {/* Vehicle Threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900">Vehicle Detection Threshold</span>
                <span className="font-mono text-zinc-950 font-bold">{Math.round(vehicleThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.95"
                step="0.05"
                value={vehicleThresh}
                onChange={(e) => setVehicleThresh(parseFloat(e.target.value))}
                className="w-full accent-zinc-950 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-500 block">Candidate filter for cars, bikes, buses, and trucks.</span>
            </div>

            {/* Helmet Threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900">Helmet Safety Threshold</span>
                <span className="font-mono text-zinc-950 font-bold">{Math.round(helmetThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={helmetThresh}
                onChange={(e) => setHelmetThresh(parseFloat(e.target.value))}
                className="w-full accent-zinc-950 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-500 block">Registers infraction when confidence crosses this threshold.</span>
            </div>

            {/* Plate Threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900">Number Plate Localization</span>
                <span className="font-mono text-zinc-950 font-bold">{Math.round(plateThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={plateThresh}
                onChange={(e) => setPlateThresh(parseFloat(e.target.value))}
                className="w-full accent-zinc-950 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-500 block">Confidence required to crop and isolate license plate region.</span>
            </div>

            {/* OCR Threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900">OCR Character Recognition</span>
                <span className="font-mono text-zinc-950 font-bold">{Math.round(ocrThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.05"
                value={ocrThresh}
                onChange={(e) => setOcrThresh(parseFloat(e.target.value))}
                className="w-full accent-zinc-950 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-500 block">If OCR confidence is below this, plate displays as "Uncertain".</span>
            </div>

            {/* EV Threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900">Electric Vehicle (EV) Threshold</span>
                <span className="font-mono text-zinc-950 font-bold">{Math.round(evThresh * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={evThresh}
                onChange={(e) => setEvThresh(parseFloat(e.target.value))}
                className="w-full accent-zinc-950 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-500 block">Strict gating for green plate EV verification.</span>
            </div>

            {/* Cooldown */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900">Violation Cooldown Period</span>
                <span className="font-mono text-zinc-950 font-bold">{cooldownSec}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={cooldownSec}
                onChange={(e) => setCooldownSec(parseInt(e.target.value))}
                className="w-full accent-zinc-950 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-500 block">Suppresses duplicate alerts for the same tracked vehicle ID.</span>
            </div>
          </div>
        </div>

        {/* System & Model Weights Status */}
        <div className="pro-card rounded-xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-zinc-600" />
              <h3 className="font-bold text-sm text-zinc-950">Model Architecture</h3>
            </div>
            <p className="text-xs text-zinc-500">
              Fine-tuned weights in the model directories take precedence over heuristic detectors.
            </p>

            <div className="space-y-2.5">
              {/* YOLO Vehicle */}
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-950 block">Vehicle Detector</span>
                  <span className="text-[11px] font-mono text-zinc-500">yolov8n.pt</span>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Active
                </span>
              </div>

              {/* Custom Helmet Model */}
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-950 block">Helmet Classifier</span>
                  <span className="text-[11px] font-mono text-zinc-500">backend/models/helmet/best.pt</span>
                </div>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                  config?.models?.custom_helmet_model?.loaded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                }`}>
                  {config?.models?.custom_helmet_model?.loaded ? 'Custom Weights' : 'Vision Heuristics Engine'}
                </span>
              </div>

              {/* Custom Plate Model */}
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-950 block">License Plate Detector</span>
                  <span className="text-[11px] font-mono text-zinc-500">backend/models/plate/best.pt</span>
                </div>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                  config?.models?.custom_plate_model?.loaded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                }`}>
                  {config?.models?.custom_plate_model?.loaded ? 'Custom Weights' : 'Morphological Engine'}
                </span>
              </div>

              {/* Hardware Acceleration */}
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-950 block">Hardware Device</span>
                  <span className="text-[11px] font-mono text-zinc-500">PyTorch {config?.system?.torch_version}</span>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 font-semibold border border-zinc-300">
                  {config?.system?.device || 'CPU'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
            <span className="font-bold text-zinc-900 block">Custom YOLO Weights:</span>
            <p className="text-[11px] leading-relaxed">
              Place fine-tuned <code>best.pt</code> into <code>backend/models/helmet/</code> or <code>backend/models/plate/</code> to override the default heuristic pipelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
