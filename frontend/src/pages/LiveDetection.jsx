import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  Radio,
  Zap,
  ShieldAlert,
  Car,
  Bike,
  Volume2,
  VolumeX,
  Smartphone,
  Layers,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Clock,
  Bus,
  Truck,
  Eye
} from 'lucide-react';
import QRCode from 'qrcode';
import { getNetworkIp } from '../services/api';

export default function LiveDetection() {
  const [streamMode, setStreamMode] = useState('webcam'); // 'webcam', 'phone', 'sim'
  const streamModeRef = useRef('webcam');
  const [isStreaming, setIsStreaming] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [selectedIp, setSelectedIp] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online', 'offline', 'checking'
  const [copied, setCopied] = useState(false);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const lastFrameTimeRef = useRef(Date.now());
  
  // Real-time telemetry
  const [telemetry, setTelemetry] = useState({
    fps: 0,
    inference_ms: 0,
    vehicles_count: 0,
    violations_count: 0,
    counts: {}
  });
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [latestViolations, setLatestViolations] = useState([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitMode, setFitMode] = useState('cover'); // 'cover' = Zero-Border Screen Fill, 'contain' = Standard Fit
  const [showHud, setShowHud] = useState(true);
  const hudTimerRef = useRef(null);
  const [fsNotification, setFsNotification] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const isStreamingRef = useRef(false);
  const isWaitingForResponseRef = useRef(false);
  const offCanvasRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const disconnectTimerRef = useRef(null);
  const pingTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Helper to enumerate available camera inputs (Webcam, USB, DroidCam, Iriun, etc.)
  const loadCameraDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch (e) {
      console.warn("Could not enumerate camera devices:", e);
    }
  };

  useEffect(() => {
    loadCameraDevices();
    let isMounted = true;
    const fetchIp = async () => {
      try {
        const res = await getNetworkIp();
        if (!isMounted) return;
        setNetworkInfo(res.data);
        setBackendStatus('online');
        if (res.data?.all_ips && res.data.all_ips.length > 0) {
          setSelectedIp(prev => prev || res.data.all_ips[0].ip);
        } else if (res.data?.ip) {
          setSelectedIp(prev => prev || res.data.ip);
        }
      } catch (e) {
        if (!isMounted) return;
        setBackendStatus('offline');
      }
    };
    fetchIp();
    const interval = setInterval(fetchIp, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Play subtle warning sound on violation
  const playAlertSound = () => {
    if (!soundAlerts) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  const getWsLiveUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.protocol === 'https:') {
      return `wss://${window.location.host}/ws/live`;
    }
    if (window.location.port === '5173') {
      return `ws://${window.location.hostname}:8000/ws/live`;
    }
    return `ws://${window.location.host}/ws/live`;
  };

  // --- MODE 1: MOBILE VIEWER MODE (Watch phone camera live on laptop screen) ---
  const startMobileViewer = () => {
    stopStream();
    setStreamMode('phone');
    streamModeRef.current = 'phone';
    setIsStreaming(true);
    isStreamingRef.current = true;

    const wsUrl = getWsLiveUrl();
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[MobileViewer] Laptop connected as receiver screen.");
      socket.send(JSON.stringify({ role: "viewer" }));

      // Regular heartbeat every 5s to ensure proxy & browser connection never drop
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: "ping" }));
        }
      }, 5000);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.status === "viewer_registered" || payload.status === "pong" || payload.status === "heartbeat") {
          return;
        }

        if (payload.status === "mobile_stream_started") {
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          setPhoneConnected(true);
          return;
        }

        if (payload.status === "mobile_stream_stopped") {
          // Grace period: do not flip UI instantly to avoid flickering
          if (!disconnectTimerRef.current) {
            disconnectTimerRef.current = setTimeout(() => {
              setPhoneConnected(false);
              disconnectTimerRef.current = null;
            }, 3500);
          }
          return;
        }

        // Live frame received from mobile transmitter
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        setPhoneConnected(true);

        setTelemetry({
          fps: payload.fps,
          inference_ms: payload.inference_ms,
          vehicles_count: payload.counts?.total_vehicles || 0,
          violations_count: payload.counts?.violations_in_frame || 0,
          counts: payload.counts || {}
        });

        setActiveVehicles(payload.vehicles || []);

        if (payload.violations && payload.violations.length > 0) {
          setLatestViolations(prev => [...payload.violations, ...prev].slice(0, 8));
          playAlertSound();
        }

        if (payload.annotated_frame && canvasRef.current) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              ctx.drawImage(img, 0, 0);
            }
          };
          img.src = payload.annotated_frame;
        }
      } catch (err) {
        console.error("Frame message parse error:", err);
      }
    };

    socket.onclose = () => {
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      // Debounced disconnect so momentary drops do not cause violent UI flapping
      if (!disconnectTimerRef.current) {
        disconnectTimerRef.current = setTimeout(() => {
          setPhoneConnected(false);
          disconnectTimerRef.current = null;
        }, 3500);
      }
      if (isStreamingRef.current && streamModeRef.current === 'phone') {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (isStreamingRef.current && streamModeRef.current === 'phone') {
            startMobileViewer();
          }
        }, 1500);
      }
    };

    wsRef.current = socket;
  };

  // --- MODE 2: LAPTOP WEBCAM MODE ---
  const startWebcam = async (devId) => {
    stopStream();
    setStreamMode('webcam');
    streamModeRef.current = 'webcam';
    setIsStreaming(true);
    isStreamingRef.current = true;

    try {
      const activeDevId = devId || selectedDeviceId;
      const constraints = {
        video: activeDevId
          ? { deviceId: { exact: activeDevId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.log("video play error:", e));
      }
      loadCameraDevices();
      connectWebcamSocket();
    } catch (err) {
      console.error("Camera access denied or unavailable:", err);
      alert(`Camera access error: ${err.message}. Please check browser camera permissions.`);
      stopStream();
    }
  };

  const connectWebcamSocket = () => {
    const wsUrl = getWsLiveUrl();
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[Webcam] WebSocket opened, starting frame loop");
      sendWebcamFrameLoop();
    };

    socket.onmessage = (event) => {
      isWaitingForResponseRef.current = false;
      try {
        const payload = JSON.parse(event.data);
        if (payload.error) return;

        setTelemetry({
          fps: payload.fps,
          inference_ms: payload.inference_ms,
          vehicles_count: payload.counts?.total_vehicles || 0,
          violations_count: payload.counts?.violations_in_frame || 0,
          counts: payload.counts || {}
        });

        setActiveVehicles(payload.vehicles || []);

        if (payload.violations && payload.violations.length > 0) {
          setLatestViolations(prev => [...payload.violations, ...prev].slice(0, 8));
          playAlertSound();
        }

        if (payload.annotated_frame && canvasRef.current) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              ctx.drawImage(img, 0, 0);
            }
          };
          img.src = payload.annotated_frame;
        }

        if (isStreamingRef.current && streamModeRef.current === 'webcam') {
          animFrameIdRef.current = requestAnimationFrame(sendWebcamFrameLoop);
        }
      } catch (err) {}
    };

    socket.onclose = () => {
      isWaitingForResponseRef.current = false;
      if (isStreamingRef.current && streamModeRef.current === 'webcam') {
        setTimeout(connectWebcamSocket, 2000);
      }
    };

    wsRef.current = socket;
  };

  const sendWebcamFrameLoop = () => {
    if (!isStreamingRef.current || streamModeRef.current !== 'webcam' || !videoRef.current || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const now = Date.now();

    // Timeout guard: reset if waiting longer than 400ms
    if (isWaitingForResponseRef.current) {
      if (now - lastFrameTimeRef.current > 400) {
        isWaitingForResponseRef.current = false;
      } else {
        animFrameIdRef.current = requestAnimationFrame(sendWebcamFrameLoop);
        return;
      }
    }

    // Pacing: max ~30 FPS (every 33ms) to eliminate network lag
    if (now - lastSendTimeRef.current < 33) {
      animFrameIdRef.current = requestAnimationFrame(sendWebcamFrameLoop);
      return;
    }

    if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
      isWaitingForResponseRef.current = true;
      lastFrameTimeRef.current = now;
      lastSendTimeRef.current = now;

      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const maxDim = 640;
      let targetW, targetH;
      if (vw >= vh) {
        targetW = maxDim;
        targetH = Math.round((vh / vw) * maxDim);
      } else {
        targetH = maxDim;
        targetW = Math.round((vw / vh) * maxDim);
      }

      if (!offCanvasRef.current) {
        offCanvasRef.current = document.createElement('canvas');
      }
      const offCanvas = offCanvasRef.current;
      if (offCanvas.width !== targetW || offCanvas.height !== targetH) {
        offCanvas.width = targetW;
        offCanvas.height = targetH;
      }
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(videoRef.current, 0, 0, targetW, targetH);
      const b64 = offCanvas.toDataURL('image/jpeg', 0.65);
      wsRef.current.send(JSON.stringify({ image: b64, source: "laptop_webcam" }));
    } else {
      animFrameIdRef.current = requestAnimationFrame(sendWebcamFrameLoop);
    }
  };

  // --- MODE 3: SIMULATED TRAFFIC STREAM ---
  const startSimulation = () => {
    stopStream();
    setStreamMode('sim');
    streamModeRef.current = 'sim';
    setIsStreaming(true);
    isStreamingRef.current = true;

    const wsUrl = getWsLiveUrl();
    const socket = new WebSocket(wsUrl);

    const samples = ['bus_traffic.jpg', 'car_traffic.jpg', 'motorcycle_rider.jpg'];
    let sampleIdx = 0;

    socket.onopen = () => {
      const sendSimFrame = () => {
        if (!isStreamingRef.current || streamModeRef.current !== 'sim' || socket.readyState !== WebSocket.OPEN) return;
        const imgName = samples[sampleIdx % samples.length];
        sampleIdx++;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 480;
          offCanvas.height = 270;
          const offCtx = offCanvas.getContext('2d');
          offCtx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
          const b64 = offCanvas.toDataURL('image/jpeg', 0.65);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ image: b64, source: "simulation" }));
          }
        };
        img.src = `/api/samples/${imgName}`;

        setTimeout(() => {
          if (isStreamingRef.current && streamModeRef.current === 'sim') {
            animFrameIdRef.current = requestAnimationFrame(sendSimFrame);
          }
        }, 700);
      };

      sendSimFrame();
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setTelemetry({
          fps: payload.fps,
          inference_ms: payload.inference_ms,
          vehicles_count: payload.counts?.total_vehicles || 0,
          violations_count: payload.counts?.violations_in_frame || 0,
          counts: payload.counts || {}
        });

        setActiveVehicles(payload.vehicles || []);

        if (payload.violations && payload.violations.length > 0) {
          setLatestViolations(prev => [...payload.violations, ...prev].slice(0, 8));
          playAlertSound();
        }

        if (payload.annotated_frame && canvasRef.current) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              ctx.drawImage(img, 0, 0);
            }
          };
          img.src = payload.annotated_frame;
        }
      } catch (err) {}
    };

    wsRef.current = socket;
  };

  const stopStream = () => {
    setIsStreaming(false);
    isStreamingRef.current = false;
    setPhoneConnected(false);
    isWaitingForResponseRef.current = false;

    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  };

  const switchMode = (newMode) => {
    stopStream();
    setStreamMode(newMode);
    streamModeRef.current = newMode;
    if (newMode === 'phone') {
      startMobileViewer();
    } else if (newMode === 'webcam') {
      startWebcam(selectedDeviceId);
    } else if (newMode === 'sim') {
      startSimulation();
    }
  };

  useEffect(() => {
    // Automatically initialize in Mobile Viewer mode on load
    startMobileViewer();
    return () => stopStream();
  }, []);

  const getEffectiveMobileCamUrl = () => {
    if (selectedIp) {
      return `https://${selectedIp}:5173/?tab=mobile-cam`;
    }
    if (networkInfo?.mobile_cam_url) {
      return networkInfo.mobile_cam_url;
    }
    const currentHost = window.location.hostname;
    const host = (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1')
      ? currentHost
      : (networkInfo?.ip || '127.0.0.1');
    return `https://${host}:5173/?tab=mobile-cam`;
  };

  const activeMobileCamUrl = getEffectiveMobileCamUrl();

  useEffect(() => {
    if (!activeMobileCamUrl) return;
    QRCode.toDataURL(activeMobileCamUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error("Error generating local QR code:", err));
  }, [activeMobileCamUrl]);

  useEffect(() => {
    const onFsChange = () => {
      const fsActive = !!document.fullscreenElement;
      setIsFullscreen(fsActive);
      if (fsActive) {
        setFitMode('cover'); // Default to zero-border screen fill!
        setShowHud(true);
        setFsNotification(true);
        setTimeout(() => setFsNotification(false), 3000);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
      if (e.key === 'Escape' && isFullscreen) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
      document.removeEventListener('MSFullscreenChange', onFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const handleMouseMove = () => {
    if (!isFullscreen) return;
    setShowHud(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      setShowHud(false);
    }, 2800);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      const el = containerRef.current;
      const reqFs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (reqFs) {
        reqFs.call(el).then(() => {
          setIsFullscreen(true);
          setFitMode('cover'); // Zero-Border Screen Fill!
          setShowHud(true);
          setFsNotification(true);
          setTimeout(() => setFsNotification(false), 3000);
        }).catch(err => {
          console.warn("Fullscreen request error:", err);
          setIsFullscreen(true);
          setFitMode('cover');
        });
      } else {
        setIsFullscreen(true);
        setFitMode('cover');
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
      setIsFullscreen(false);
    }
  };

  const copyUrl = () => {
    if (activeMobileCamUrl) {
      navigator.clipboard.writeText(activeMobileCamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Source Mode Switcher Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10">
            <Radio size={22} className={isStreaming ? "animate-pulse text-emerald-400" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white m-0 tracking-tight">AI Traffic Command Center</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                <Sparkles size={10} /> YOLOv8 + OCR + ByteTrack
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Real-time wireless video analytics, helmet infraction detection & plate recognition</p>
          </div>
        </div>

        {/* Source Switch Buttons & Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => switchMode('phone')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              streamMode === 'phone'
                ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/25 border border-cyan-400/50 scale-[1.02]'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <Smartphone size={15} className={streamMode === 'phone' ? 'animate-bounce' : ''} />
            <span>📱 Mobile Phone Cam</span>
          </button>

          <button
            onClick={() => switchMode('webcam')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              streamMode === 'webcam'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 border border-blue-400/50 scale-[1.02]'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <Camera size={15} />
            <span>💻 Laptop Cam</span>
          </button>

          <button
            onClick={() => switchMode('sim')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              streamMode === 'sim'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/25 border border-purple-400/50 scale-[1.02]'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <Radio size={15} />
            <span>🔄 Simulation</span>
          </button>

          {/* Camera Device Dropdown for Webcam Mode */}
          {streamMode === 'webcam' && videoDevices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                if (isStreaming) startWebcam(e.target.value);
              }}
              className="bg-slate-950 text-slate-200 text-xs border border-slate-800 rounded-2xl px-3 py-2 focus:outline-none focus:border-cyan-500 max-w-[170px] truncate"
              title="Select Video Input Device"
            >
              {videoDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundAlerts(!soundAlerts)}
            className={`p-2.5 rounded-2xl border text-xs font-medium transition-all ${
              soundAlerts
                ? 'bg-slate-950 text-cyan-400 border-cyan-500/40 shadow-sm'
                : 'bg-slate-950/50 text-slate-600 border-slate-900'
            }`}
            title={soundAlerts ? "Audio Alerts Enabled" : "Muted"}
          >
            {soundAlerts ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Theater / Cinema View Toggle */}
          <button
            onClick={() => {
              setIsTheaterMode(prev => !prev);
              if (!isTheaterMode) {
                setIsSidePanelOpen(false);
              }
            }}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              isTheaterMode
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
            }`}
            title={isTheaterMode ? "Exit Cinema View" : "Expand to Cinema View (Full Width & Height)"}
          >
            <Maximize2 size={15} />
            <span className="hidden sm:inline">{isTheaterMode ? "Standard" : "Cinema View"}</span>
          </button>

          {/* Side Panel Toggle (Wide Cam View) */}
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              !isSidePanelOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
            }`}
            title={isSidePanelOpen ? "Expand camera to Full Width" : "Show Side Detection Panel"}
          >
            {isSidePanelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            <span className="hidden sm:inline">{isSidePanelOpen ? "Wide View" : "Split View"}</span>
          </button>

          {/* True Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white border border-cyan-400/60 transition-all text-xs font-black flex items-center gap-1.5 shadow-xl shadow-cyan-500/25 active:scale-95"
            title={isFullscreen ? "Exit Fullscreen (Esc or F)" : "Enter True Laptop Fullscreen (Press F)"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span className="font-bold">{isFullscreen ? "Exit Full" : "🖥️ Fullscreen (F)"}</span>
          </button>

          {isStreaming && (
            <button
              onClick={stopStream}
              className="p-2.5 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30 transition-all text-xs font-bold"
              title="Stop current surveillance stream"
            >
              <CameraOff size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: HUD Video Feed & Real-time Telemetry Panel */}
      <div className={`grid gap-6 ${isSidePanelOpen && !isFullscreen && !isTheaterMode ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Live Surveillance Viewport (Laptop Monitor Display) */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onDoubleClick={toggleFullscreen}
          className={`${
            isFullscreen
              ? 'fixed inset-0 z-[99999] w-screen h-screen bg-black flex items-center justify-center p-0 m-0 border-0 rounded-none overflow-hidden select-none ' + (!showHud ? 'cursor-none' : '')
              : isTheaterMode
              ? 'col-span-full rounded-3xl bg-slate-950 border border-cyan-500/30 overflow-hidden relative shadow-2xl flex flex-col items-center justify-center min-h-[78vh] transition-all duration-300'
              : (isSidePanelOpen ? 'lg:col-span-2' : 'col-span-full') + ' rounded-3xl bg-slate-950 border border-slate-800/80 overflow-hidden relative shadow-2xl flex flex-col items-center justify-center min-h-[540px] transition-all duration-300'
          }`}
        >
          {/* Subtle on-screen indicator when entering Fullscreen */}
          {isFullscreen && fsNotification && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-950/90 text-cyan-300 border border-cyan-500/40 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs font-bold animate-in fade-in zoom-in-95 pointer-events-none flex items-center gap-2">
              <Maximize2 size={16} className="text-cyan-400" />
              <span>🖥️ Laptop Zero-Border Fullscreen Active • Double-click or Esc to exit</span>
            </div>
          )}

          {/* Floating Fullscreen Cyber Command Bar (Active only in True Fullscreen with auto-hide) */}
          {isFullscreen && (
            <div
              className={`absolute top-4 left-6 right-6 flex items-center justify-between z-30 transition-all duration-300 ${
                showHud ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Left: Glowing HUD status pill */}
              <div className="flex items-center gap-3 bg-slate-950/90 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-cyan-500/40 shadow-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-black text-cyan-300 text-xs tracking-wider uppercase flex items-center gap-1.5">
                  <Radio size={14} className="text-cyan-400 animate-pulse" />
                  FULLSCREEN MONITOR
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-emerald-400 font-mono font-bold text-xs">{telemetry.fps} FPS</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-300 font-mono text-xs">{telemetry.inference_ms}ms</span>
              </div>

              {/* Center: Source quick switcher in fullscreen */}
              <div className="hidden md:flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-2xl p-1.5 rounded-2xl border border-slate-800 shadow-2xl">
                <button
                  onClick={(e) => { e.stopPropagation(); switchMode('phone'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    streamMode === 'phone' ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📱 Mobile
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); switchMode('webcam'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    streamMode === 'webcam' ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💻 Laptop Cam
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); switchMode('sim'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    streamMode === 'sim' ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔄 Sim
                </button>
              </div>

              {/* Right: Zero-Border Toggle, Audio, and Exit Fullscreen */}
              <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-2xl p-1.5 rounded-2xl border border-slate-800 shadow-2xl">
                {/* Zero-Border Fill vs Ratio Fit Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFitMode(prev => prev === 'cover' ? 'contain' : 'cover');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    fitMode === 'cover'
                      ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-emerald-300 border border-emerald-500/50 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title={fitMode === 'cover' ? "Zero-Border 100% Screen Fill is active (No black bars). Click for Fit." : "Letterbox Fit is active. Click for Zero-Border Screen Fill."}
                >
                  <Eye size={13} />
                  <span>{fitMode === 'cover' ? '⬛ Zero-Border Fill' : '↔️ Aspect Fit'}</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setSoundAlerts(!soundAlerts); }}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                  title="Toggle Audio Alerts"
                >
                  {soundAlerts ? <Volume2 size={16} className="text-cyan-400" /> : <VolumeX size={16} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all border border-slate-700"
                  title="Exit Fullscreen (Esc or Double-Click)"
                >
                  <Minimize2 size={14} />
                  <span>Exit (Esc)</span>
                </button>
              </div>
            </div>
          )}

          {/* Offscreen video element for hardware frame decoding */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              position: 'fixed',
              top: '-9999px',
              left: '-9999px',
              width: '640px',
              height: '480px',
              opacity: 0,
              pointerEvents: 'none'
            }}
          />

          {/* Primary Render Canvas - ZERO BORDER edge-to-edge in Fullscreen */}
          <canvas
            ref={canvasRef}
            onDoubleClick={toggleFullscreen}
            style={{
              maxHeight: isFullscreen ? '100vh' : isTheaterMode ? 'calc(100vh - 160px)' : '720px',
              maxWidth: isFullscreen ? '100vw' : '100%',
              width: isFullscreen ? '100vw' : 'auto',
              height: isFullscreen ? '100vh' : 'auto',
              objectFit: isFullscreen ? fitMode : 'contain'
            }}
            className={`${
              isFullscreen
                ? 'w-screen h-screen rounded-none m-0 p-0 border-0 shadow-none'
                : 'rounded-2xl mx-auto shadow-2xl'
            } transition-all duration-200 cursor-pointer ${
              (streamMode === 'phone' && !phoneConnected) || (streamMode === 'webcam' && !isStreaming)
                ? 'hidden'
                : 'block'
            }`}
            title="Double-click to toggle Fullscreen"
          />

          {/* Futuristic Corner Target Crosshairs */}
          {(phoneConnected || (streamMode !== 'phone' && isStreaming)) && (
            <>
              <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
              <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-10" />
              <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
              <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-10" />
            </>
          )}

          {/* Webcam Start Prompt Card (When in Webcam mode & Not streaming yet) */}
          {streamMode === 'webcam' && !isStreaming && (
            <div className="py-16 px-6 text-center space-y-6 flex flex-col items-center justify-center max-w-md">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-2xl shadow-blue-500/10">
                <Camera size={44} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">Laptop / USB Camera</h3>
                <p className="text-xs text-slate-400">
                  Ready to capture live traffic from your integrated webcam, external USB cam, or DroidCam feed.
                </p>
              </div>

              {videoDevices.length > 0 && (
                <div className="w-full max-w-xs space-y-1 text-left">
                  <label className="text-[11px] text-slate-400 font-semibold">Select Camera Input:</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {videoDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => startWebcam(selectedDeviceId)}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black shadow-2xl shadow-blue-500/30 tracking-wider uppercase transition-all"
              >
                <Camera size={16} />
                <span>Start Camera Live Stream</span>
              </button>
            </div>
          )}

          {/* Special Mobile Camera Connect Guide When in Phone Mode & Not Connected Yet */}
          {streamMode === 'phone' && !phoneConnected && (
            <div className="py-10 px-6 text-center space-y-6 flex flex-col items-center justify-center max-w-2xl">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                  <Smartphone size={14} className="animate-pulse" />
                  <span>Wireless Smartphone Surveillance</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Connect Phone Camera in 1-Click</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Scan this QR code with your mobile camera or Google Lens to instantly transmit HD road frames to the YOLOv8 engine.
                </p>
              </div>

              {/* QR Code Container - 100% Offline Local Generation */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl w-full backdrop-blur-xl">
                <div className="p-3.5 bg-white rounded-2xl shadow-2xl shrink-0 border border-slate-200 flex flex-col items-center justify-center min-w-[190px] min-h-[190px]">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Mobile Camera QR Code Scanner"
                      className="w-44 h-44 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <RefreshCw size={26} className="animate-spin text-cyan-600 mb-2" />
                      <span>Generating QR...</span>
                    </div>
                  )}
                  <span className="text-[10px] font-black text-slate-800 mt-1 uppercase tracking-widest">
                    Scan with Phone
                  </span>
                </div>

                <div className="space-y-3.5 text-left w-full max-w-sm">
                  {/* Backend Status indicator */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <QrCode size={14} /> Scanner Link
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      backendStatus === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : backendStatus === 'offline'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      {backendStatus === 'online' ? 'AI Server Online' : backendStatus === 'offline' ? 'AI Server Offline' : 'Connecting...'}
                    </span>
                  </div>

                  {/* Network Adapter IP Selector (if multiple exist) */}
                  {networkInfo?.all_ips && networkInfo.all_ips.length > 1 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <Wifi size={11} className="text-cyan-400" /> Select Network Adapter / Wi-Fi:
                      </label>
                      <select
                        value={selectedIp}
                        onChange={(e) => setSelectedIp(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-cyan-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                      >
                        {networkInfo.all_ips.map((item, idx) => (
                          <option key={idx} value={item.ip}>
                            {item.name} ({item.ip}){item.is_wifi ? ' ★ Wi-Fi' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Option 1: Mobile Browser Link */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <ExternalLink size={12} className="text-cyan-400" /> Mobile Link:
                    </span>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300">
                      <span className="truncate mr-1.5 font-bold select-all">{activeMobileCamUrl}</span>
                      <button
                        onClick={copyUrl}
                        className="px-2 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-[10px] hover:bg-cyan-400 transition-colors shrink-0 shadow-sm flex items-center gap-1"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Test Transmitter in New Tab */}
                  <button
                    onClick={() => window.open(activeMobileCamUrl, '_blank')}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <ExternalLink size={13} />
                    <span>⚡ Test Transmitter in New Tab (Direct PC Test)</span>
                  </button>
                </div>
              </div>

              {/* Troubleshooting & Mobile SSL Certificate Helper */}
              <div className="w-full text-left p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <AlertCircle size={15} />
                  <span>Mobile Phone par Camera chalane ke 3 aasan steps:</span>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1.5 pl-4 list-decimal">
                  <li>
                    <strong className="text-white">Same Wi-Fi / Hotspot:</strong> Mobile aur Laptop dono ek hi Wi-Fi network ya phone ke Hotspot se jude hone chahiye.
                  </li>
                  <li>
                    <strong className="text-amber-300">SSL Warning ("Your connection is not private"):</strong> Mobile browser me warning aane par <span className="text-cyan-300 font-bold">"Advanced"</span> par tap karein aur <span className="text-cyan-300 font-bold">"Proceed to {selectedIp || '...' } (unsafe)"</span> choose karein.
                  </li>
                  <li>
                    <strong className="text-white">Camera Permission:</strong> Browser me Camera permission ko <span className="text-emerald-400 font-bold">ALLOW</span> karein. Uske baad laptop screen par live AI detection shuru ho jayegi!
                  </li>
                </ol>
              </div>

              {/* Radar Status Indicator */}
              <div className="flex items-center gap-2 text-xs text-cyan-400/80 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 radar-glow" />
                <span>Laptop screen is waiting for mobile phone camera stream...</span>
              </div>
            </div>
          )}

          {/* Floating High-Tech Top Telemetry HUD Overlay (Only when not in fullscreen) */}
          {!isFullscreen && (phoneConnected || (streamMode !== 'phone' && isStreaming)) && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
              {/* Left Telemetry Pill */}
              <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-xl px-3.5 py-1.5 rounded-2xl border border-cyan-500/30 text-xs font-mono text-white shadow-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-black text-cyan-300 uppercase tracking-wide">
                  {streamMode === 'phone' ? '📱 MOBILE CAM' : streamMode === 'webcam' ? '💻 WEBCAM' : '🔄 SIMULATION'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400 font-bold">{telemetry.fps} FPS</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">{telemetry.inference_ms} ms</span>
              </div>

              {/* Right Floating Controls */}
              <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 backdrop-blur-xl p-1 rounded-2xl border border-slate-800 shadow-2xl">
                <button
                  onClick={() => setSoundAlerts(!soundAlerts)}
                  className={`p-1.5 rounded-xl transition-all ${
                    soundAlerts ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-slate-600'
                  }`}
                  title={soundAlerts ? "Audio Alerts Enabled" : "Muted"}
                >
                  {soundAlerts ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                <button
                  onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title={isSidePanelOpen ? "Expand to Full Width" : "Show Side Detections"}
                >
                  {isSidePanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                {isStreaming && (
                  <button
                    onClick={stopStream}
                    className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all"
                    title="Stop Stream"
                  >
                    <CameraOff size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Floating High-Tech Bottom Telemetry HUD Overlay (Auto-hides in fullscreen) */}
          {(phoneConnected || (streamMode !== 'phone' && isStreaming)) && (
            <div
              className={`absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 z-20 transition-all duration-300 ${
                isFullscreen && !showHud ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-none'
              }`}
            >
              {/* Vehicle breakdown counters */}
              <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
                <div className="bg-slate-950/85 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white shadow-xl flex items-center gap-2 font-bold font-mono">
                  <span className="text-slate-400">Total:</span>
                  <span className="text-cyan-400">{telemetry.vehicles_count}</span>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300 font-mono">
                  <span>🚗 {telemetry.counts?.cars || 0}</span>
                  <span className="text-slate-600">•</span>
                  <span>🏍️ {telemetry.counts?.motorcycles || 0}</span>
                  <span className="text-slate-600">•</span>
                  <span>🚚 {(telemetry.counts?.trucks || 0) + (telemetry.counts?.buses || 0)}</span>
                </div>

                {activeVehicles.some(v => v.power_type === 'Electric') && (
                  <div className="bg-emerald-950/80 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-emerald-500/40 text-xs text-emerald-300 font-bold font-mono flex items-center gap-1">
                    <Zap size={13} className="text-emerald-400" />
                    <span>EV In Frame</span>
                  </div>
                )}
              </div>

              {/* Violations banner */}
              <div className="pointer-events-auto flex items-center gap-2">
                {telemetry.violations_count > 0 ? (
                  <div className="bg-rose-600 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-rose-400 text-xs font-bold text-white shadow-xl animate-bounce flex items-center gap-1.5">
                    <ShieldAlert size={15} />
                    <span>{telemetry.violations_count} VIOLATION DETECTED!</span>
                  </div>
                ) : (
                  <div className="bg-slate-950/85 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Perimeter Secure</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Objects in View Panel (Collapsible) */}
        {isSidePanelOpen && !isFullscreen && (
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-5 backdrop-blur-xl flex flex-col justify-between space-y-4 shadow-2xl transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">Active Detections</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30">
                    {activeVehicles.length} in frame
                  </span>
                </div>
                <button
                  onClick={() => setIsSidePanelOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 text-xs"
                  title="Hide side panel"
                >
                  <PanelRightClose size={15} />
                </button>
              </div>
              <p className="text-xs text-slate-400">YOLOv8 tracking, OCR plates, and helmet compliance</p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2.5 pr-1">
              {activeVehicles.length > 0 ? (
                activeVehicles.map((v, idx) => (
                  <div
                    key={v.track_id || idx}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      v.has_violation
                        ? 'bg-rose-500/10 border-rose-500/30 shadow-lg shadow-rose-500/5'
                        : v.power_type === 'Electric'
                        ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                        : 'bg-slate-950/70 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {v.vehicle_type === 'Motorcycle' ? (
                          <Bike size={16} className="text-emerald-400" />
                        ) : v.vehicle_type === 'Truck' ? (
                          <Truck size={16} className="text-amber-400" />
                        ) : v.vehicle_type === 'Bus' ? (
                          <Bus size={16} className="text-purple-400" />
                        ) : (
                          <Car size={16} className="text-cyan-400" />
                        )}
                        <span className="font-bold text-sm text-white">
                          #{v.track_id} {v.vehicle_type}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {Math.round(v.confidence * 100)}%
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                      {/* Plate Status */}
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">License Plate</span>
                        <span className="font-mono text-white font-bold truncate block">
                          {v.plate?.detected ? v.plate.plate_number : 'None'}
                        </span>
                      </div>

                      {/* Power Type */}
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Propulsion</span>
                        <span className={`font-bold ${v.power_type === 'Electric' ? 'text-cyan-400' : 'text-slate-300'}`}>
                          {v.power_type}
                        </span>
                      </div>

                      {/* Helmet Status for two-wheelers */}
                      {v.helmet && v.helmet.rider_detected && (
                        <div className="col-span-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Helmet Check:</span>
                          <span className={`font-bold ${
                            v.helmet.helmet_status === 'YES' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {v.helmet.helmet_status === 'YES' ? '✓ SAFE (HELMET)' : '✗ NO HELMET VIOLATION'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                  <Layers size={32} className="text-slate-700" />
                  <span>No vehicles currently inside surveillance perimeter.</span>
                </div>
              )}
            </div>

            {/* Quick HUD Color Legend */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Safe vehicle / Helmet verified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Violation (No helmet / Missing plate)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Electric Vehicle (Green Plate)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
