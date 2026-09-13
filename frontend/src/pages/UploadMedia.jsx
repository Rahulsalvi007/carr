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
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Upload & Analyze Media</h1>
          <p className="text-xs text-zinc-400 mt-1">Batch inference for traffic surveillance images and video recordings</p>
        </div>

        {/* Media Type Toggle */}
        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
          <button
            onClick={() => { setActiveTab('image'); setSelectedFile(null); setImageResult(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'image' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon size={14} />
            <span>Image Analysis</span>
          </button>
          <button
            onClick={() => { setActiveTab('video'); setSelectedFile(null); setVideoResult(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'video' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film size={14} />
            <span>Video Tracking</span>
          </button>
        </div>
      </div>

      {/* 1-Click Quick Demo Testing Section */}
      {activeTab === 'image' && (
        <div className="pro-card p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Zap size={14} className="text-zinc-400" />
              Quick Demo Samples
            </span>
            <span className="text-[11px] text-zinc-500">Click any sample to test inference instantly</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => runDemoSample('bus_traffic')}
              disabled={isProcessing}
              className="p-3 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-md bg-zinc-900 text-zinc-200 font-bold border border-zinc-800">🚌</div>
              <div>
                <div className="font-semibold text-xs text-white">City Bus Sample</div>
                <div className="text-[10px] text-zinc-400">Tests Bus Detection & Plate check</div>
              </div>
            </button>

            <button
              onClick={() => runDemoSample('car_traffic')}
              disabled={isProcessing}
              className="p-3 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-md bg-zinc-900 text-zinc-200 font-bold border border-zinc-800">🚗</div>
              <div>
                <div className="font-semibold text-xs text-white">Highway Car Sample</div>
                <div className="text-[10px] text-zinc-400">Tests Vehicle Localization & Tracking</div>
              </div>
            </button>

            <button
              onClick={() => runDemoSample('motorcycle_rider')}
              disabled={isProcessing}
              className="p-3 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 rounded-md bg-zinc-900 text-zinc-200 font-bold border border-zinc-800">🏍️</div>
              <div>
                <div className="font-semibold text-xs text-white">Motorcycle Sample</div>
                <div className="text-[10px] text-zinc-400">Tests Helmet Rule & Rider Detection</div>
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
            ? 'border-white bg-zinc-900/90'
            : selectedFile
            ? 'border-zinc-600 bg-zinc-900/60'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'
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
          <div className="w-14 h-14 rounded-xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center shadow-inner">
            <UploadCloud size={28} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {selectedFile ? selectedFile.name : `Select or Drag & Drop a ${activeTab === 'image' ? 'Traffic Image' : 'Traffic Video'}`}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              {activeTab === 'image' ? 'Supports JPG, PNG, WEBP (High Resolution)' : 'Supports MP4, AVI, MOV (Road Recordings)'}
            </p>
          </div>

          <span className="inline-block px-3.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-medium border border-zinc-800 hover:bg-zinc-800 transition-colors">
            Browse Files
          </span>
        </label>

        {/* Video Frame Skip Setting */}
        {activeTab === 'video' && (
          <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-center gap-3 text-xs text-zinc-400">
            <span>Sampling Interval:</span>
            <select
              value={frameSkip}
              onChange={(e) => setFrameSkip(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-white font-medium focus:outline-none"
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-sm disabled:opacity-50 transition-all"
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
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Vehicles Detected</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{imageResult.counts?.total_vehicles || 0}</p>
            </div>
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Cars / Bikes</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {imageResult.counts?.cars || 0} / {imageResult.counts?.bikes || 0}
              </p>
            </div>
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">EVs Identified</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{imageResult.counts?.evs || 0}</p>
            </div>
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Safety Violations</span>
              <p className="text-2xl font-bold font-mono text-red-400 mt-1">{imageResult.violations?.length || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Annotated Output Preview */}
            <div className="lg:col-span-2 pro-card rounded-xl overflow-hidden shadow-md">
              <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Vision Pipeline Annotation ({imageResult.inference_ms} ms)</span>
                <span className="text-emerald-400 font-mono text-[11px]">100% Processed</span>
              </div>
              <div className="p-2 flex items-center justify-center bg-black/60">
                <img
                  src={imageResult.annotated_image}
                  alt="Annotated Traffic"
                  className="w-full h-auto max-h-[600px] object-contain rounded-lg"
                />
              </div>
            </div>

            {/* Detected Objects Details List */}
            <div className="pro-card rounded-xl p-4 space-y-3 max-h-[640px] overflow-y-auto">
              <h3 className="font-semibold text-sm text-white">Extracted Object Attributes</h3>

              {imageResult.vehicles && imageResult.vehicles.length > 0 ? (
                imageResult.vehicles.map((v, i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {v.vehicle_type === 'Motorcycle' ? (
                          <Bike size={15} className="text-zinc-300" />
                        ) : (
                          <Car size={15} className="text-zinc-300" />
                        )}
                        <span className="font-semibold text-xs text-white">{v.vehicle_type}</span>
                      </div>
                      <span className="text-xs font-mono text-zinc-400 font-medium">
                        {Math.round(v.confidence * 100)}%
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-zinc-400">
                      <div className="flex items-center justify-between">
                        <span>Plate:</span>
                        <span className="font-mono text-white font-medium">
                          {v.plate?.detected ? `${v.plate.plate_number} (${Math.round(v.plate.ocr_confidence * 100)}%)` : 'Not Detected'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Propulsion:</span>
                        <span className={v.power_type === 'Electric' ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                          {v.power_type} ({Math.round(v.power_type_confidence * 100)}%)
                        </span>
                      </div>

                      {v.helmet && (
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                          <span>Helmet:</span>
                          <span className={v.helmet.helmet_status === 'YES' ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                            {v.helmet.helmet_status === 'YES' ? 'Verified' : 'No Helmet Violation'} ({Math.round(v.helmet.confidence * 100)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500">No vehicles detected in this image.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Results View */}
      {videoResult && activeTab === 'video' && (
        <div className="pro-card rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-zinc-900 text-emerald-400 border border-zinc-800">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Video Processing Complete</h3>
              <p className="text-xs text-zinc-400">
                Analyzed {videoResult.total_frames_analyzed} frames in {videoResult.processing_time_sec}s ({videoResult.processing_fps} FPS)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Tracked Vehicles</span>
              <p className="text-xl font-bold font-mono text-white mt-1">{videoResult.unique_vehicles_tracked}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Violations Logged</span>
              <p className="text-xl font-bold font-mono text-red-400 mt-1">{videoResult.total_violations_recorded}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Processing Rate</span>
              <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{videoResult.processing_fps} FPS</p>
            </div>
          </div>

          {/* Download Annotated Output Video */}
          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-white">Annotated Video File Ready</h4>
              <p className="text-xs text-zinc-400">Contains tracking IDs, OCR license plate overlays, and violation badges.</p>
            </div>
            <a
              href={videoResult.output_video_url}
              download={videoResult.filename}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-sm transition-all"
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
