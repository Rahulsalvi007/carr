import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  Camera,
  CameraOff,
  RotateCw,
  Zap,
  ShieldAlert,
  ArrowLeft,
  Sliders,
  Eye,
  CheckCircle2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { getNetworkIp } from '../services/api';

export default function MobileCam({ onBackToDashboard }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [qualityMode, setQualityMode] = useState('smooth'); // 'smooth' (480p, ultra fast) or 'hd' (640p)
  const [viewMode, setViewMode] = useState('raw'); // 'raw' (phone camera) or 'ai' (annotated AI feed)
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [httpSecurityBlocked, setHttpSecurityBlocked] = useState(false);
  const [snapCount, setSnapCount] = useState(0);
  const [telemetry, setTelemetry] = useState({
    fps: 0,
    inference_ms: 0,
    vehicles_in_view: 0,
    violations_in_view: 0
  });

  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const fileInputRef = useRef(null);
  const isStreamingRef = useRef(false);
  const isWaitingForResponseRef = useRef(false);
  const animFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const offCanvasRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const pingIntervalRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const res = await getNetworkIp();
        setNetworkInfo(res.data);
      } catch (e) {}
    };
    fetchIp();
  }, []);

  const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.protocol === 'https:') {
      return `wss://${window.location.host}/ws/live`;
    }
    if (window.location.port === '5173') {
      return `ws://${window.location.hostname}:8000/ws/live`;
    }
    return `ws://${window.location.host}/ws/live`;
  };

  const startPhoneCamera = async () => {
    if (window.location.protocol === 'http:') {
      window.location.href = window.location.href.replace('http:', 'https:');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHttpSecurityBlocked(true);
      return;
    }

    let stream = null;
    const wIdeal = qualityMode === 'hd' ? 1280 : 854;
    const hIdeal = qualityMode === 'hd' ? 720 : 480;

    // Multi-tier camera acquisition fallback
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: wIdeal },
          height: { ideal: hIdeal }
        },
        audio: false
      });
    } catch (e1) {
      console.warn("Camera attempt 1 failed, trying fallback 2:", e1);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false
        });
      } catch (e2) {
        console.warn("Camera attempt 2 failed, trying fallback 3:", e2);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (e3) {
          console.error("All camera attempts failed:", e3);
          if (e3.name === "NotAllowedError" || e3.name === "PermissionDeniedError") {
            alert("Camera permission blocked! Browser ke URL bar me lock 🔒 icon dabakar Camera ko ALLOW karein.");
          } else {
            setHttpSecurityBlocked(true);
          }
          return;
        }
      }
    }

    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', '');
      videoRef.current.setAttribute('muted', '');
      videoRef.current.setAttribute('autoplay', '');
      videoRef.current.muted = true;
      try {
        await videoRef.current.play();
      } catch (err) {
        console.warn("Video play exception:", err);
      }
    }

    setIsStreaming(true);
    isStreamingRef.current = true;
    setHttpSecurityBlocked(false);
    connectWebSocket();
  };

  const stopPhoneCamera = () => {
    setIsStreaming(false);
    isStreamingRef.current = false;
    isWaitingForResponseRef.current = false;

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const toggleCameraFacing = () => {
    stopPhoneCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const connectWebSocket = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
    }

    const wsUrl = getWsUrl();
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[MobileCam] Transmitter connected to AI engine");
      // Initial handshake informing backend and laptop viewer
      socket.send(JSON.stringify({ action: "camera_started", source: "mobile_phone" }));

      // Regular heartbeat every 6 seconds to keep connection rock solid
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: "ping" }));
        }
      }, 6000);

      // Start the single stream loop
      isWaitingForResponseRef.current = false;
      streamLoop();
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Ignore handshake acknowledgments and keepalive heartbeats
        if (payload.status === "transmitter_ready" || payload.status === "pong" || payload.status === "heartbeat") {
          return;
        }

        // Frame inference result received
        isWaitingForResponseRef.current = false;

        if (payload.annotated_frame) {
          setAnnotatedFrame(payload.annotated_frame);
        }

        setTelemetry({
          fps: payload.fps || 0,
          inference_ms: payload.inference_ms || 0,
          vehicles_in_view: payload.counts?.total_vehicles || 0,
          violations_in_view: payload.counts?.violations_in_frame || 0
        });

        if (isStreamingRef.current) {
          animFrameRef.current = requestAnimationFrame(streamLoop);
        }
      } catch (e) {
        isWaitingForResponseRef.current = false;
      }
    };

    socket.onclose = () => {
      isWaitingForResponseRef.current = false;
      if (isStreamingRef.current) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (isStreamingRef.current) {
            connectWebSocket();
          }
        }, 2500);
      }
    };

    socket.onerror = () => {
      isWaitingForResponseRef.current = false;
    };

    wsRef.current = socket;
  };

  // Adaptive Zero-Lag Pacing Engine (Strictly 1 frame in-flight at a time)
  const streamLoop = () => {
    if (!isStreamingRef.current || !videoRef.current || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const now = Date.now();

    // Flow control: If waiting for previous frame, apply 1000ms safety timeout
    if (isWaitingForResponseRef.current) {
      if (now - lastFrameTimeRef.current > 1000) {
        isWaitingForResponseRef.current = false;
      } else {
        animFrameRef.current = requestAnimationFrame(streamLoop);
        return;
      }
    }

    // Pacing: ~25 FPS (40ms gap) to optimize bandwidth & prevent mobile thermal throttling
    if (now - lastSendTimeRef.current < 40) {
      animFrameRef.current = requestAnimationFrame(streamLoop);
      return;
    }

    if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
      isWaitingForResponseRef.current = true;
      lastFrameTimeRef.current = now;
      lastSendTimeRef.current = now;

      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const maxDim = qualityMode === 'hd' ? 640 : 480;

      let targetW, targetH;
      if (vw >= vh) {
        targetW = maxDim;
        targetH = Math.round((vh / vw) * maxDim);
      } else {
        targetH = maxDim;
        targetW = Math.round((vw / vh) * maxDim);
      }

      // Even dimensions for clean hardware compression
      targetW = targetW & ~1;
      targetH = targetH & ~1;

      if (!offCanvasRef.current) {
        offCanvasRef.current = document.createElement('canvas');
      }
      const offCanvas = offCanvasRef.current;
      if (offCanvas.width !== targetW || offCanvas.height !== targetH) {
        offCanvas.width = targetW;
        offCanvas.height = targetH;
      }
      const ctx = offCanvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, targetW, targetH);
      const b64 = offCanvas.toDataURL('image/jpeg', 0.55);

      try {
        wsRef.current.send(JSON.stringify({ image: b64, source: "mobile_phone" }));
      } catch (err) {
        isWaitingForResponseRef.current = false;
      }
    } else {
      animFrameRef.current = requestAnimationFrame(streamLoop);
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 640;
        offCanvas.height = 360;
        const ctx = offCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
        const b64 = offCanvas.toDataURL('image/jpeg', 0.65);

        const sendPayload = (socket) => {
          socket.send(JSON.stringify({ image: b64, source: "mobile_phone" }));
          setSnapCount(c => c + 1);
        };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          sendPayload(wsRef.current);
        } else {
          const wsUrl = getWsUrl();
          const s = new WebSocket(wsUrl);
          s.onopen = () => {
            sendPayload(s);
            wsRef.current = s;
          };
          s.onmessage = (msg) => {
            try {
              const p = JSON.parse(msg.data);
              if (p.annotated_frame) setAnnotatedFrame(p.annotated_frame);
              setTelemetry({
                fps: p.fps || 0,
                inference_ms: p.inference_ms || 0,
                vehicles_in_view: p.counts?.total_vehicles || 0,
                violations_in_view: p.counts?.violations_in_frame || 0
              });
            } catch (err) {}
          };
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => stopPhoneCamera();
  }, []);

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none relative font-sans">
      {/* Hidden file input for native camera snapshot capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Floating Top HUD Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 p-3 flex items-center justify-between bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent backdrop-blur-md">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              onClick={() => {
                stopPhoneCamera();
                onBackToDashboard();
              }}
              className="p-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-2xl text-xs font-mono">
            <span className={`w-2.5 h-2.5 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="font-bold text-white tracking-wide">
              {isStreaming ? `${telemetry.fps} FPS • LIVE` : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2">
          {/* Quality Switcher */}
          <button
            onClick={() => setQualityMode(q => q === 'smooth' ? 'hd' : 'smooth')}
            className="px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-cyan-300 font-bold"
            title="Toggle Stream Resolution"
          >
            {qualityMode === 'hd' ? '640p HD' : '480p FAST'}
          </button>

          {/* AI Feed vs Raw Camera View Toggle */}
          {annotatedFrame && isStreaming && (
            <button
              onClick={() => setViewMode(v => v === 'raw' ? 'ai' : 'raw')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
                viewMode === 'ai'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800'
              }`}
            >
              <Eye size={12} />
              <span>{viewMode === 'ai' ? 'AI HUD' : 'RAW'}</span>
            </button>
          )}

          {/* Camera Flip */}
          <button
            onClick={toggleCameraFacing}
            className="p-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white"
            title="Flip Camera (Front/Rear)"
          >
            <RotateCw size={16} />
          </button>
        </div>
      </header>

      {/* Main Fullscreen Camera Viewfinder */}
      <main className="flex-1 relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
        {/* Raw Phone Camera Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${!isStreaming || viewMode === 'ai' ? 'hidden' : 'block'}`}
        />

        {/* AI Annotated Frame Overlay View (if selected) */}
        {isStreaming && viewMode === 'ai' && annotatedFrame && (
          <img
            src={annotatedFrame}
            alt="AI Detection Overlay"
            className="w-full h-full object-cover"
          />
        )}

        {/* Viewfinder Corner Target Brackets */}
        {isStreaming && (
          <div className="absolute inset-6 pointer-events-none z-10">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/70" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/70" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/70" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/70" />
          </div>
        )}

        {/* Live Telemetry Overlay on Mobile */}
        {isStreaming && (
          <div className="absolute top-16 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
            <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-mono text-cyan-300">
              <span>🚗 {telemetry.vehicles_in_view} Vehicles</span>
            </div>

            {telemetry.violations_in_view > 0 ? (
              <div className="bg-rose-600/90 backdrop-blur-md px-3 py-1 rounded-xl border border-rose-400 text-xs font-bold text-white shadow-lg animate-bounce flex items-center gap-1">
                <ShieldAlert size={13} />
                <span>Violation!</span>
              </div>
            ) : (
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-mono text-emerald-400">
                <span>Safe</span>
              </div>
            )}
          </div>
        )}

        {/* Standby Card (When not streaming yet) */}
        {!isStreaming && (
          <div className="z-20 p-6 text-center space-y-5 max-w-sm mx-auto flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-2xl shadow-cyan-500/20">
              <Smartphone size={38} className="animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white tracking-tight">Wireless Road Camera</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stream real-time traffic video from this phone directly to your laptop for YOLOv8 AI detection.
              </p>
            </div>

            {httpSecurityBlocked && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left space-y-1.5 w-full">
                <span className="font-bold flex items-center gap-1">⚠️ Camera Permission Alert:</span>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Mobile browser me camera permission allow karein, ya neeche <strong>"Snap Road Photo"</strong> button use karein jo bina kisi permission issue ke chalta hai.
                </p>
              </div>
            )}

            <button
              onClick={startPhoneCamera}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-black text-sm tracking-wider uppercase shadow-2xl shadow-cyan-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Camera size={18} />
              <span>Activate Live Stream</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold text-xs border border-cyan-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Camera size={15} />
              <span>📸 Snap Road Photo ({snapCount})</span>
            </button>
          </div>
        )}
      </main>

      {/* Floating Bottom Shutter Bar */}
      <footer className="absolute bottom-0 left-0 right-0 z-30 p-4 flex items-center justify-around bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent backdrop-blur-md">
        {/* Instant photo snap button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all"
          title="Take Instant Photo"
        >
          <Camera size={20} />
        </button>

        {/* Big Center Shutter Button */}
        {!isStreaming ? (
          <button
            onClick={startPhoneCamera}
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-1.5 shadow-2xl shadow-cyan-500/40 active:scale-90 transition-all flex items-center justify-center"
            title="Start Streaming"
          >
            <div className="w-full h-full rounded-full border-2 border-white/80 flex items-center justify-center bg-cyan-400/20">
              <Camera size={26} className="text-white" />
            </div>
          </button>
        ) : (
          <button
            onClick={stopPhoneCamera}
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-600 p-1.5 shadow-2xl shadow-rose-500/40 active:scale-90 transition-all flex items-center justify-center animate-pulse"
            title="Stop Streaming"
          >
            <div className="w-full h-full rounded-full border-2 border-white/80 flex items-center justify-center bg-rose-500/30">
              <CameraOff size={26} className="text-white" />
            </div>
          </button>
        )}

        {/* Facing Camera Switch */}
        <button
          onClick={toggleCameraFacing}
          className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all"
          title="Flip Camera"
        >
          <RotateCw size={20} />
        </button>
      </footer>
    </div>
  );
}
