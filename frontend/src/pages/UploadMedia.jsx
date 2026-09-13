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
  Hash,
  RefreshCw,
  Eye
} from 'lucide-react';
import { detectImage, detectVideo } from '../services/api';

export default function UploadMedia() {
  const [activeTab, setActiveTab] = useState('image'); // image or video
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageResult, setImageResult] = useState(null);
  const [videoResult, setVideoResult] = useState(null);
  const [frameSkip, setFrameSkip] = useState(2);
  const [dragActive, setDragActive] = useState(false);

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
    } catch (err) {
      alert(`Image processing error: ${err.response?.data?.detail || err.message}`);
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
    } catch (err) {
      alert(`Video processing error: ${err.response?.data?.detail || err.message}`);
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
    } catch (err) {
      alert(`Demo sample error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };



  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">Upload & Analyze Media</h1>
          <p className="text-sm text-slate-400 mt-1">Batch inference for traffic surveillance images and video recordings</p>
        </div>

        {/* Media Type Toggle */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => { setActiveTab('image'); setSelectedFile(null); setImageResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'image' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon size={16} />
            <span>Image Analysis</span>
          </button>
          <button
            onClick={() => { setActiveTab('video'); setSelectedFile(null); setVideoResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'video' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film size={16} />
            <span>Video Tracking</span>
          </button>
        </div>
      </div>

      {/* 1-Click Quick Demo Testing Section */}
      {activeTab === 'image' && (
        <div className="cyber-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              1-Click Instant Demo Testing
            </span>
            <span className="text-[11px] text-slate-400">Click any sample to test AI inference instantly</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => runDemoSample('bus_traffic')}
              disabled={isProcessing}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 font-bold">🚌</div>
              <div>
                <div className="font-semibold text-xs text-white">City Bus Sample</div>
                <div className="text-[10px] text-slate-400">Tests Bus Detection & Plate check</div>
              </div>
            </button>

            <button
              onClick={() => runDemoSample('car_traffic')}
              disabled={isProcessing}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">🚗</div>
              <div>
                <div className="font-semibold text-xs text-white">Highway Car Sample</div>
                <div className="text-[10px] text-slate-400">Tests Vehicle Localization & Tracking</div>
              </div>
            </button>

            <button
              onClick={() => runDemoSample('motorcycle_rider')}
              disabled={isProcessing}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 font-bold">🏍️</div>
              <div>
                <div className="font-semibold text-xs text-white">Motorcycle Sample</div>
                <div className="text-[10px] text-slate-400">Tests Helmet Rule & Rider Detection</div>
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
        className={`cyber-card relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragActive
            ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
            : selectedFile
            ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
            : 'border-slate-800/80 hover:border-cyan-500/50'
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
          <div className="p-4 rounded-2xl bg-slate-800 text-blue-400 border border-slate-700 shadow-inner">
            <UploadCloud size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {selectedFile ? selectedFile.name : `Select or Drag & Drop a ${activeTab === 'image' ? 'Traffic Image' : 'Traffic Video'}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'image' ? 'Supports JPG, PNG, WEBP (High Resolution)' : 'Supports MP4, AVI, MOV (Road Recordings)'}
            </p>
          </div>

          <span className="inline-block px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 hover:bg-slate-700 transition-colors">
            Browse Files
          </span>
        </label>

        {/* Video Frame Skip Setting */}
        {activeTab === 'video' && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-3 text-xs text-slate-400">
            <span>Sampling Interval:</span>
            <select
              value={frameSkip}
              onChange={(e) => setFrameSkip(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-medium focus:outline-none"
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
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 disabled:opacity-50 transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Processing Computer Vision Pipeline...</span>
              </>
            ) : (
              <>
                <Eye size={18} />
                <span>Run AI Detection Pipeline</span>
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
            <div className="cyber-card p-4 rounded-xl">
              <span className="text-xs text-slate-400 uppercase">Vehicles Detected</span>
              <p className="text-2xl font-bold text-white mt-1">{imageResult.counts?.total_vehicles || 0}</p>
            </div>
            <div className="cyber-card p-4 rounded-xl">
              <span className="text-xs text-slate-400 uppercase">Cars / Bikes</span>
              <p className="text-2xl font-bold text-cyan-400 mt-1">
                {imageResult.counts?.cars || 0} / {imageResult.counts?.bikes || 0}
              </p>
            </div>
            <div className="cyber-card p-4 rounded-xl">
              <span className="text-xs text-slate-400 uppercase">EVs Identified</span>
              <p className="text-2xl font-bold text-purple-400 mt-1">{imageResult.counts?.evs || 0}</p>
            </div>
            <div className="cyber-card p-4 rounded-xl">
              <span className="text-xs text-slate-400 uppercase">Safety Violations</span>
              <p className="text-2xl font-bold text-rose-400 mt-1">{imageResult.violations?.length || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Annotated Output Preview */}
            <div className="lg:col-span-2 cyber-card rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-white">AI Vision Annotation (Inference: {imageResult.inference_ms} ms)</span>
                <span className="text-emerald-400 font-mono">100% Processed</span>
              </div>
              <div className="p-2 flex items-center justify-center bg-black/50">
                <img
                  src={imageResult.annotated_image}
                  alt="Annotated Traffic"
                  className="w-full h-auto max-h-[600px] object-contain rounded-xl"
                />
              </div>
            </div>

            {/* Detected Objects Details List */}
            <div className="cyber-card rounded-2xl p-5 space-y-4 max-h-[640px] overflow-y-auto">
              <h3 className="font-bold text-base text-white">Extracted Object Attributes</h3>

              {imageResult.vehicles && imageResult.vehicles.length > 0 ? (
                imageResult.vehicles.map((v, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {v.vehicle_type === 'Motorcycle' ? (
                          <Bike size={16} className="text-emerald-400" />
                        ) : (
                          <Car size={16} className="text-blue-400" />
                        )}
                        <span className="font-bold text-sm text-white">{v.vehicle_type}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-300 font-semibold">
                        {Math.round(v.confidence * 100)}%
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Plate Recognition:</span>
                        <span className="font-mono text-white font-semibold">
                          {v.plate?.detected ? `${v.plate.plate_number} (${Math.round(v.plate.ocr_confidence * 100)}%)` : 'Not Detected'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Power Type:</span>
                        <span className={v.power_type === 'Electric' ? 'text-cyan-400 font-bold' : 'text-slate-300'}>
                          {v.power_type} ({Math.round(v.power_type_confidence * 100)}%)
                        </span>
                      </div>

                      {v.helmet && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                          <span>Helmet Check:</span>
                          <span className={v.helmet.helmet_status === 'YES' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {v.helmet.helmet_status === 'YES' ? 'SAFE (YES)' : 'NO HELMET'} ({Math.round(v.helmet.confidence * 100)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No vehicles detected in this image.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Results View */}
      {videoResult && activeTab === 'video' && (
        <div className="cyber-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Video Processing Complete</h3>
              <p className="text-xs text-slate-400">
                Analyzed {videoResult.total_frames_analyzed} frames in {videoResult.processing_time_sec} seconds ({videoResult.processing_fps} FPS)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase">Unique Tracked Vehicles</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">{videoResult.unique_vehicles_tracked}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase">Safety Violations Logged</span>
              <p className="text-2xl font-bold text-rose-400 mt-1">{videoResult.total_violations_recorded}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase">Processing Rate</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{videoResult.processing_fps} FPS</p>
            </div>
          </div>

          {/* Download Annotated Output Video */}
          <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Annotated Video File Ready</h4>
              <p className="text-xs text-slate-300">Contains vehicle tracking IDs, OCR license plate overlays, and violation badges.</p>
            </div>
            <a
              href={videoResult.output_video_url}
              download={videoResult.filename}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all"
            >
              <Download size={16} />
              <span>Download Annotated MP4</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
