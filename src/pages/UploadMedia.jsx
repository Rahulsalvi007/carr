import React, { useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Film,
  CheckCircle,
  AlertTriangle,
  Download,
  Car,
  Bike,
  Zap,
  RefreshCw,
  Eye
} from 'lucide-react';
import { detectImage, detectVideo } from '../services/api';
import Toast from '../components/Toast';

export default function UploadMedia() {
  const [activeTab, setActiveTab] = useState('image'); // image or video
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageResult, setImageResult] = useState(null);
  const [videoResult, setVideoResult] = useState(null);
  const [frameSkip, setFrameSkip] = useState(2);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageResult(null);
      setVideoResult(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageResult(null);
      setVideoResult(null);
    }
  };

  const processImage = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await detectImage(formData);
      setImageResult(res.data);
      showToast("Image analysis completed successfully", "success");
    } catch (err) {
      showToast(`Image processing error: ${err.response?.data?.detail || err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const processVideo = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await detectVideo(formData, frameSkip);
      setVideoResult(res.data);
      showToast("Video processing completed", "success");
    } catch (err) {
      showToast(`Video processing error: ${err.response?.data?.detail || err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const runDemoSample = async (sampleName) => {
    setIsProcessing(true);
    setImageResult(null);
    try {
      const res = await fetch(`/api/detect/demo/${sampleName}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setImageResult(data);
      showToast(`Analyzed sample: ${sampleName.replace(/_/g, ' ')}`, "success");
    } catch (err) {
      showToast(`Demo sample error: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Toast toast={toast} onClose={() => setToast(null)} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 m-0">Upload & Analyze Media</h1>
          <p className="text-xs text-zinc-500 mt-1">Batch inference for traffic surveillance images and video recordings</p>
        </div>

        {/* Media Type Toggle */}
        <div className="flex items-center p-1 bg-zinc-100 border border-zinc-200 rounded-lg">
          <button
            onClick={() => { setActiveTab('image'); setSelectedFile(null); setImageResult(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'image' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <ImageIcon size={14} />
            <span>Image Analysis</span>
          </button>
          <button
            onClick={() => { setActiveTab('video'); setSelectedFile(null); setVideoResult(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'video' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Film size={14} />
            <span>Video Tracking</span>
          </button>
        </div>
      </div>

      {/* Vehicle & Traffic Safety AI Banner */}
      <div className="pro-card p-3.5 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3 bg-zinc-50 border border-zinc-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0">
            <Car size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
              <span>Vehicle & Road Safety Intelligence</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono px-1.5 py-0.2 rounded font-semibold">Active</span>
            </div>
            <p className="text-[11px] text-zinc-500">Real-time car & motorcycle tracking, OCR license plate decoding, EV identification, and helmet compliance checks</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-600">
          <span className="px-2 py-1 rounded-md bg-white border border-zinc-200 text-zinc-700">Cars</span>
          <span className="px-2 py-1 rounded-md bg-white border border-zinc-200 text-zinc-700">Bikes</span>
          <span className="px-2 py-1 rounded-md bg-white border border-zinc-200 text-zinc-700">Plates</span>
          <span className="px-2 py-1 rounded-md bg-white border border-zinc-200 text-zinc-700">Helmets</span>
          <span className="px-2 py-1 rounded-md bg-white border border-zinc-200 text-zinc-700">EVs</span>
        </div>
      </div>

      {/* 1-Click Quick Demo Testing Section */}
      {activeTab === 'image' && (
        <div className="pro-card p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
              <Zap size={14} className="text-zinc-700" />
              Quick Demo Samples
            </span>
            <span className="text-[11px] text-zinc-500">Click any sample to test inference instantly</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => runDemoSample('bus_traffic')}
              disabled={isProcessing}
              className="p-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-md bg-white text-zinc-900 font-bold border border-zinc-200 shadow-sm text-base">🚌</div>
              <div>
                <div className="font-bold text-xs text-zinc-950">City Bus Sample</div>
                <div className="text-[10px] text-zinc-500">Tests Bus Detection & Plate check</div>
              </div>
            </button>

            <button
              onClick={() => runDemoSample('car_traffic')}
              disabled={isProcessing}
              className="p-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-md bg-white text-zinc-900 font-bold border border-zinc-200 shadow-sm text-base">🚗</div>
              <div>
                <div className="font-bold text-xs text-zinc-950">Highway Car Sample</div>
                <div className="text-[10px] text-zinc-500">Tests Vehicle Localization & Tracking</div>
              </div>
            </button>

            <button
              onClick={() => runDemoSample('motorcycle_rider')}
              disabled={isProcessing}
              className="p-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-md bg-white text-zinc-900 font-bold border border-zinc-200 shadow-sm text-base">🏍️</div>
              <div>
                <div className="font-bold text-xs text-zinc-950">Motorcycle Sample</div>
                <div className="text-[10px] text-zinc-500">Tests Helmet Rule & Rider Detection</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Upload Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`pro-card relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-zinc-950 bg-zinc-100'
            : selectedFile
            ? 'border-zinc-400 bg-zinc-50'
            : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/50'
        }`}
      >
        <input
          type="file"
          id="media-upload"
          className="hidden"
          accept={activeTab === 'image' ? "image/jpeg,image/png,image/webp" : "video/mp4,video/avi,video/quicktime"}
          onChange={handleFileChange}
        />

        <label htmlFor="media-upload" className="cursor-pointer flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-xl bg-white text-zinc-900 border border-zinc-200 flex items-center justify-center shadow-sm">
            <UploadCloud size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950">
              {selectedFile ? selectedFile.name : `Select or Drag & Drop a ${activeTab === 'image' ? 'Traffic Image' : 'Traffic Video'}`}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {activeTab === 'image' ? 'Supports JPG, PNG, WEBP (High Resolution)' : 'Supports MP4, AVI, MOV (Road Recordings)'}
            </p>
          </div>

          <span className="inline-block px-3.5 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-semibold shadow-sm hover:bg-zinc-800 transition-colors">
            Browse Files
          </span>
        </label>

        {/* Video Frame Skip Setting */}
        {activeTab === 'video' && (
          <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-center gap-3 text-xs text-zinc-600 font-medium">
            <span>Sampling Interval:</span>
            <select
              value={frameSkip}
              onChange={(e) => setFrameSkip(Number(e.target.value))}
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none"
            >
              <option value={1}>Every Frame (Highest Accuracy)</option>
              <option value={2}>Every 2nd Frame (Balanced - Recommended)</option>
              <option value={4}>Every 4th Frame (Fastest)</option>
            </select>
          </div>
        )}
      </div>

      {/* Action Trigger Button */}
      {selectedFile && !imageResult && !videoResult && (
        <div className="flex justify-center">
          <button
            onClick={activeTab === 'image' ? processImage : processVideo}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Processing Computer Vision Pipeline...</span>
              </>
            ) : (
              <>
                <Eye size={15} />
                <span>Run Vision Pipeline</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Image Results View */}
      {imageResult && activeTab === 'image' && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Car size={13} className="text-blue-600" /> Total Vehicles
              </span>
              <p className="text-2xl font-bold font-mono text-zinc-950 mt-1">
                {imageResult.counts?.total_vehicles || (imageResult.vehicles?.length || 0)}
              </p>
            </div>
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Car size={13} className="text-zinc-700" /> Cars & 4-Wheelers
              </span>
              <p className="text-2xl font-bold font-mono text-zinc-950 mt-1">
                {imageResult.counts?.cars || 0}
              </p>
            </div>
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Bike size={13} className="text-zinc-700" /> Two-Wheelers
              </span>
              <p className="text-2xl font-bold font-mono text-zinc-950 mt-1">
                {imageResult.counts?.two_wheelers || 0}
              </p>
            </div>
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-rose-600" /> Safety Violations
              </span>
              <p className="text-2xl font-bold font-mono text-rose-700 mt-1">
                {imageResult.violations?.length || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Annotated Output Preview */}
            <div className="lg:col-span-2 pro-card rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-900">Vision Pipeline Annotation ({imageResult.inference_ms} ms)</span>
                <span className="text-emerald-700 font-mono text-[11px] font-semibold">100% Processed</span>
              </div>
              <div className="p-2 flex items-center justify-center bg-black/80">
                <img
                  src={imageResult.annotated_image}
                  alt="Annotated Media"
                  className="w-full h-auto max-h-[600px] object-contain rounded-lg"
                />
              </div>
            </div>

            {/* Extracted Vehicles & Telemetry List */}
            <div className="pro-card rounded-xl p-4 space-y-3 max-h-[640px] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                <div>
                  <h3 className="font-bold text-sm text-zinc-950">Detected Vehicles</h3>
                  <p className="text-[11px] text-zinc-500">Telemetry, OCR plates & compliance status</p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 font-mono font-bold border border-zinc-200">
                  {imageResult.vehicles?.length || 0} Detected
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {imageResult.vehicles && imageResult.vehicles.length > 0 ? (
                  imageResult.vehicles.map((v, i) => (
                    <div key={i} className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2.5 hover:bg-zinc-100/70 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {v.vehicle_type === 'Motorcycle' || v.vehicle_type === 'Bicycle' ? (
                            <div className="w-7 h-7 rounded-md bg-zinc-200 text-zinc-800 flex items-center justify-center">
                              <Bike size={14} />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-zinc-950 text-white flex items-center justify-center">
                              <Car size={14} />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-xs text-zinc-950">{v.vehicle_type}</span>
                            {v.track_id !== null && v.track_id !== undefined && (
                              <span className="text-[10px] text-zinc-500 font-mono ml-1.5">ID: #{v.track_id}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-semibold text-zinc-700 bg-white px-2 py-0.5 rounded border border-zinc-200">
                          {Math.round(v.confidence * 100)}%
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 bg-white p-2.5 rounded-md border border-zinc-200/80">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-medium">License Plate:</span>
                          <span className="font-mono text-zinc-950 font-bold">
                            {v.plate?.detected && v.plate.plate_number && v.plate.plate_number !== 'Not Detected'
                              ? `${v.plate.plate_number} (${Math.round((v.plate.ocr_confidence || 0.9) * 100)}%)`
                              : <span className="text-zinc-400 font-normal">Not Detected</span>}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-medium">Propulsion:</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                            v.power_type === 'Electric'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}>
                            {v.power_type} ({Math.round(v.power_type_confidence * 100)}%)
                          </span>
                        </div>

                        {v.helmet && (
                          <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                            <span className="text-zinc-500 font-medium">Helmet Check:</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              v.helmet.helmet_status === 'YES'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {v.helmet.helmet_status === 'YES' ? '✓ Verified' : '⚠ Violation (No Helmet)'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
                    <Car size={24} className="text-zinc-400" />
                    <span>No vehicles detected in this image.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Results View */}
      {videoResult && activeTab === 'video' && (
        <div className="pro-card rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">Video Processing Complete</h3>
              <p className="text-xs text-zinc-500">
                Analyzed {videoResult.total_frames_analyzed} frames in {videoResult.processing_time_sec}s ({videoResult.processing_fps} FPS)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Tracked Vehicles</span>
              <p className="text-xl font-bold font-mono text-zinc-950 mt-1">{videoResult.unique_vehicles_tracked || 0}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Frames Analyzed</span>
              <p className="text-xl font-bold font-mono text-zinc-950 mt-1">{videoResult.total_frames_analyzed || 0}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Violations Logged</span>
              <p className="text-xl font-bold font-mono text-rose-700 mt-1">{videoResult.total_violations_recorded || 0}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Processing Rate</span>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-1">{videoResult.processing_fps} FPS</p>
            </div>
          </div>

          {/* Download Annotated Output Video */}
          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-zinc-950">Annotated Video File Ready</h4>
              <p className="text-xs text-zinc-500">Contains vehicle tracking IDs, OCR license plate overlays, helmet checks, and violation badges.</p>
            </div>
            <a
              href={videoResult.output_video_url}
              download={videoResult.filename}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Download size={14} />
              <span>Download Annotated MP4</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
