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
  Eye,
  Box,
  Users,
  Cpu,
  Tag,
  Search,
  X,
  Sparkles,
  SlidersHorizontal,
  Package
} from 'lucide-react';
import { detectImage, detectVideo } from '../services/api';

const OBJECT_CATEGORIES = [
  { id: 'All', label: 'All Objects' },
  { id: 'People', label: 'People' },
  { id: 'Vehicles', label: 'Vehicles' },
  { id: 'Animals', label: 'Animals' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Daily Objects', label: 'Daily Objects' },
  { id: 'Traffic', label: 'Traffic Signs' },
];

const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'People':
      return { pill: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' };
    case 'Vehicles':
      return { pill: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' };
    case 'Animals':
      return { pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' };
    case 'Electronics':
      return { pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-400' };
    case 'Daily Objects':
      return { pill: 'bg-purple-500/10 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' };
    case 'Traffic':
      return { pill: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dot: 'bg-rose-400' };
    default:
      return { pill: 'bg-zinc-800 text-zinc-300 border-zinc-700', dot: 'bg-zinc-400' };
  }
};

export default function UploadMedia() {
  const [activeTab, setActiveTab] = useState('image'); // image or video
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageResult, setImageResult] = useState(null);
  const [videoResult, setVideoResult] = useState(null);
  const [frameSkip, setFrameSkip] = useState(2);
  const [dragActive, setDragActive] = useState(false);

  // General Object AI States
  const [aiMode, setAiMode] = useState('combined'); // 'combined', 'objects', 'traffic'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [resultSubTab, setResultSubTab] = useState('objects');

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

    const params = {
      detection_mode: aiMode,
      ...(selectedCategory !== 'All' ? { category: selectedCategory } : {})
    };

    try {
      const res = await detectImage(formData, params);
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

    const params = {
      detection_mode: aiMode,
      ...(selectedCategory !== 'All' ? { category: selectedCategory } : {})
    };

    try {
      const res = await detectVideo(formData, frameSkip, params);
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
      const params = new URLSearchParams({
        detection_mode: aiMode,
        ...(selectedCategory !== 'All' ? { category: selectedCategory } : {})
      });
      const res = await fetch(`/api/detect/demo/${sampleName}?${params.toString()}`);
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

      {/* AI Engine and Category Filter Bar */}
      <div className="pro-card p-3.5 rounded-xl space-y-2.5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal size={13} className="text-zinc-600" /> AI Engine:
            </span>
            <div className="bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 flex items-center gap-1">
              <button
                onClick={() => setAiMode('combined')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  aiMode === 'combined'
                    ? 'bg-zinc-950 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Sparkles size={13} className={aiMode === 'combined' ? 'text-white' : 'text-zinc-500'} />
                <span>Dual AI (Combined)</span>
              </button>

              <button
                onClick={() => setAiMode('objects')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  aiMode === 'objects'
                    ? 'bg-zinc-950 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Box size={13} className={aiMode === 'objects' ? 'text-white' : 'text-zinc-500'} />
                <span>General Objects (80)</span>
              </button>

              <button
                onClick={() => setAiMode('traffic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  aiMode === 'traffic'
                    ? 'bg-zinc-950 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Car size={13} className={aiMode === 'traffic' ? 'text-white' : 'text-zinc-500'} />
                <span>Traffic AI Only</span>
              </button>
            </div>
          </div>

          {/* Real-time Search Filter */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search detected items..."
              className="w-full bg-white border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 p-0.5"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        {aiMode !== 'traffic' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-500 shrink-0 mr-1 flex items-center gap-1">
              <Tag size={11} /> Category:
            </span>
            {OBJECT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-950 text-white font-semibold shadow-sm scale-105'
                    : 'bg-zinc-100 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200 border border-zinc-200'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}
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
                <Box size={13} className="text-amber-500" /> Objects Detected
              </span>
              <p className="text-2xl font-bold font-mono text-zinc-950 mt-1">
                {imageResult.object_counts?.total_objects ?? (imageResult.objects?.length || 0)}
              </p>
            </div>
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Car size={13} className="text-blue-500" /> Road Vehicles
              </span>
              <p className="text-2xl font-bold font-mono text-zinc-950 mt-1">
                {imageResult.counts?.total_vehicles || 0}
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
            <div className="pro-card p-4 rounded-xl">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Zap size={13} className="text-emerald-600" /> Latency
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {imageResult.inference_ms} ms
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

            {/* Detected Objects Details List with Dual Sub-Tabs */}
            <div className="pro-card rounded-xl p-4 space-y-3 max-h-[640px] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-950">Extracted Telemetry</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono font-semibold border border-zinc-200">
                  {resultSubTab === 'objects' ? `${imageResult.objects?.length || 0} objects` : `${imageResult.vehicles?.length || 0} vehicles`}
                </span>
              </div>

              {/* Sub-Tab Navigation Header */}
              <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                <button
                  onClick={() => setResultSubTab('objects')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    resultSubTab === 'objects'
                      ? 'bg-zinc-950 text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <Box size={13} />
                  <span>Objects ({imageResult.objects?.length || 0})</span>
                </button>

                <button
                  onClick={() => setResultSubTab('vehicles')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    resultSubTab === 'vehicles'
                      ? 'bg-zinc-950 text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <Car size={13} />
                  <span>Vehicles ({imageResult.vehicles?.length || 0})</span>
                </button>
              </div>

              {/* TAB 1: GENERAL OBJECTS */}
              {resultSubTab === 'objects' && (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {/* Category Breakdown Chips */}
                  {imageResult.object_counts?.breakdown && Object.keys(imageResult.object_counts.breakdown).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                      {Object.entries(imageResult.object_counts.breakdown).map(([name, count]) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-800 font-medium shadow-2xs"
                        >
                          <span>{name}</span>
                          <span className="font-bold text-zinc-950 bg-zinc-100 px-1 rounded text-[10px] font-mono">
                            ×{count}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const objects = imageResult.objects || [];
                    const filtered = objects.filter(obj => {
                      if (selectedCategory !== 'All' && obj.category !== selectedCategory) return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        return obj.name.toLowerCase().includes(q) || obj.category.toLowerCase().includes(q);
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
                          <Box size={24} className="text-zinc-400" />
                          <span>No objects detected matching criteria.</span>
                        </div>
                      );
                    }

                    return filtered.map((obj, idx) => {
                      const badge = getCategoryBadgeClass(obj.category);
                      const isMatch = searchQuery && (
                        obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        obj.category.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      return (
                        <div
                          key={obj.id || idx}
                          className={`p-3 rounded-lg border transition-all ${
                            isMatch
                              ? 'bg-amber-50/50 border-amber-400 shadow-sm ring-1 ring-amber-400/30'
                              : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                              <span className="font-bold text-xs text-zinc-950 capitalize">{obj.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${badge.pill}`}>
                                {obj.category}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-700">
                              {Math.round(obj.confidence)}%
                            </span>
                          </div>

                          <div className="w-full bg-zinc-200 rounded-full h-1 mt-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(5, obj.confidence))}%` }}
                            />
                          </div>

                          {obj.bbox && (
                            <div className="mt-2 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                              <span>Box: [{obj.bbox.slice(0, 4).join(', ')}]</span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* TAB 2: VEHICLES & OCR */}
              {resultSubTab === 'vehicles' && (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {imageResult.vehicles && imageResult.vehicles.length > 0 ? (
                    imageResult.vehicles.map((v, i) => (
                      <div key={i} className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {v.vehicle_type === 'Motorcycle' ? (
                              <Bike size={15} className="text-zinc-700" />
                            ) : (
                              <Car size={15} className="text-zinc-700" />
                            )}
                            <span className="font-bold text-xs text-zinc-950">{v.vehicle_type}</span>
                          </div>
                          <span className="text-xs font-mono text-zinc-700 font-semibold">
                            {Math.round(v.confidence * 100)}%
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-zinc-600">
                          <div className="flex items-center justify-between">
                            <span>Plate:</span>
                            <span className="font-mono text-zinc-950 font-bold">
                              {v.plate?.detected ? `${v.plate.plate_number} (${Math.round(v.plate.ocr_confidence * 100)}%)` : 'Not Detected'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span>Propulsion:</span>
                            <span className={v.power_type === 'Electric' ? 'text-emerald-700 font-bold' : 'text-zinc-800 font-medium'}>
                              {v.power_type} ({Math.round(v.power_type_confidence * 100)}%)
                            </span>
                          </div>

                          {v.helmet && (
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-200">
                              <span>Helmet:</span>
                              <span className={v.helmet.helmet_status === 'YES' ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-bold'}>
                                {v.helmet.helmet_status === 'YES' ? 'Verified' : 'No Helmet Violation'} ({Math.round(v.helmet.confidence * 100)}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500 py-10 text-center">No vehicles detected in this image.</p>
                  )}
                </div>
              )}
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
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Objects Detected</span>
              <p className="text-xl font-bold font-mono text-amber-600 mt-1">{videoResult.total_objects_detected ?? 0}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Tracked Vehicles</span>
              <p className="text-xl font-bold font-mono text-zinc-950 mt-1">{videoResult.unique_vehicles_tracked}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Violations Logged</span>
              <p className="text-xl font-bold font-mono text-rose-700 mt-1">{videoResult.total_violations_recorded}</p>
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
              <p className="text-xs text-zinc-500">Contains tracking IDs, general objects, OCR license plate overlays, and violation badges.</p>
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
