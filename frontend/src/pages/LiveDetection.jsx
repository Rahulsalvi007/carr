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
  Eye,
  Search,
  X,
  Box,
  Users,
  Cpu,
  Package,
  SlidersHorizontal,
  Tag
} from 'lucide-react';
import QRCode from 'qrcode';
import { getNetworkIp } from '../services/api';

const OBJECT_CATEGORIES = [
  { id: 'All', label: 'All Objects', icon: Box },
  { id: 'People', label: 'People', icon: Users },
  { id: 'Vehicles', label: 'Vehicles', icon: Car },
  { id: 'Animals', label: 'Animals', icon: Eye },
  { id: 'Electronics', label: 'Electronics', icon: Cpu },
  { id: 'Daily Objects', label: 'Daily Objects', icon: Package },
  { id: 'Traffic', label: 'Traffic Signs', icon: Tag },
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

  // General Object AI & Detection Mode states
  const [aiMode, setAiMode] = useState('combined'); // 'combined', 'objects', 'traffic'
  const aiModeRef = useRef('combined');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const selectedCategoryRef = useRef('All');
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');
  const [activeObjects, setActiveObjects] = useState([]);
  const [objectCounts, setObjectCounts] = useState({ total_objects: 0, categories: {}, breakdown: {} });
  const [sidePanelTab, setSidePanelTab] = useState('auto'); // 'auto', 'objects', 'traffic'
  
  // Real-time telemetry
  const [telemetry, setTelemetry] = useState({
    fps: 0,
    inference_ms: 0,
    vehicles_count: 0,
    violations_count: 0,
    total_objects: 0,
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
  const audioCtxRef = useRef(null);
  const lastAlertSoundTimeRef = useRef(0);
  const isIntentionalCloseRef = useRef(false);
  const lastStateUpdateTimeRef = useRef(0);

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

  // Play subtle warning sound on violation (strictly throttled with persistent AudioContext)
  const playAlertSound = () => {
    if (!soundAlerts) return;
    const now = Date.now();
    if (now - lastAlertSoundTimeRef.current < 3500) return;
    lastAlertSoundTimeRef.current = now;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  // Zero-Flicker Hardware Canvas Painter: Only updates canvas dimensions when source dimensions actually change
  const renderFrameToCanvas = (annotatedFrameUrl) => {
    if (!annotatedFrameUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const img = new Image();
    img.onload = () => {
      if (!canvasRef.current) return;
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = annotatedFrameUrl;
  };

  // High Performance React State Updater: Throttled to max 4-5 updates/sec to eliminate UI lag & freezing
  const updateTelemetryThrottled = (payload) => {
    const now = Date.now();
    if (now - lastStateUpdateTimeRef.current > 200) {
      lastStateUpdateTimeRef.current = now;
      setTelemetry({
        fps: payload.fps || 0,
        inference_ms: payload.inference_ms || 0,
        vehicles_count: payload.counts?.total_vehicles || 0,
        violations_count: payload.counts?.violations_in_frame || 0,
        total_objects: payload.object_counts?.total_objects || (payload.objects?.length || 0),
        counts: payload.counts || {}
      });
      setActiveVehicles(payload.vehicles || []);
      setActiveObjects(payload.objects || []);
      if (payload.object_counts) {
        setObjectCounts(payload.object_counts);
      }
      if (payload.violations && payload.violations.length > 0) {
        setLatestViolations(prev => [...payload.violations, ...prev].slice(0, 8));
        playAlertSound();
      }
    }
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
    // Prevent reconnect storms if socket is already healthy and active
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    isIntentionalCloseRef.current = false;
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
          // Generous 5-second grace period: prevents UI flipping during transient Wi-Fi packet drops
          if (!disconnectTimerRef.current) {
            disconnectTimerRef.current = setTimeout(() => {
              setPhoneConnected(false);
              disconnectTimerRef.current = null;
            }, 5000);
          }
          return;
        }

        // Live frame received from mobile transmitter
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        setPhoneConnected(true);

        // Smooth zero-flicker canvas drawing
        if (payload.annotated_frame) {
          renderFrameToCanvas(payload.annotated_frame);
        }

        // Throttled UI state updates
        updateTelemetryThrottled(payload);

      } catch (err) {
        console.error("Frame message parse error:", err);
      }
    };

    socket.onclose = () => {
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      if (isIntentionalCloseRef.current) {
        return;
      }
      // Debounced disconnect so momentary drops do not cause violent UI flapping
      if (!disconnectTimerRef.current) {
        disconnectTimerRef.current = setTimeout(() => {
          setPhoneConnected(false);
          disconnectTimerRef.current = null;
        }, 5000);
      }
      if (isStreamingRef.current && streamModeRef.current === 'phone') {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (isStreamingRef.current && streamModeRef.current === 'phone') {
            startMobileViewer();
          }
        }, 2500);
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

        if (payload.annotated_frame) {
          renderFrameToCanvas(payload.annotated_frame);
        }

        updateTelemetryThrottled(payload);

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
      wsRef.current.send(JSON.stringify({
        image: b64,
        source: "laptop_webcam",
        detection_mode: aiModeRef.current,
        category: selectedCategoryRef.current,
        search_query: searchQueryRef.current
      }));
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
            socket.send(JSON.stringify({
              image: b64,
              source: "simulation",
              detection_mode: aiModeRef.current,
              category: selectedCategoryRef.current,
              search_query: searchQueryRef.current
            }));
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
        if (payload.annotated_frame) {
          renderFrameToCanvas(payload.annotated_frame);
        }
        updateTelemetryThrottled(payload);
      } catch (err) {}
    };

    wsRef.current = socket;
  };

  const stopStream = () => {
    isIntentionalCloseRef.current = true;
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
    // 1. Production / Deployed environment (domain, public IP, cloud service)
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (!isLocalhost && hostname && window.location.port !== '5173') {
      // On deployed domain or cloud, the origin is already the public HTTPS URL (e.g. https://traffic.mydomain.com)
      return `${window.location.origin}/?tab=mobile-cam`;
    }

    // 2. Local development on LAN / Wi-Fi
    if (selectedIp) {
      return `https://${selectedIp}:5173/?tab=mobile-cam`;
    }
    if (networkInfo?.mobile_cam_url) {
      return networkInfo.mobile_cam_url;
    }
    const host = networkInfo?.ip || '127.0.0.1';
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
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Source Mode Switcher Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-200 flex items-center justify-center">
            <Radio size={16} className={isStreaming ? "text-white" : "text-zinc-500"} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white m-0 tracking-tight">Live Surveillance Feed</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-mono">
                YOLOv8 + OCR
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Automated detection of vehicles, license plates, and road infractions</p>
          </div>
        </div>

        {/* Source Switch Buttons & Action Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 flex items-center gap-1">
            <button
              onClick={() => switchMode('phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                streamMode === 'phone'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone size={13} />
              <span>Phone Cam</span>
            </button>

            <button
              onClick={() => switchMode('webcam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                streamMode === 'webcam'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Camera size={13} />
              <span>Laptop Cam</span>
            </button>

            <button
              onClick={() => switchMode('sim')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                streamMode === 'sim'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Radio size={13} />
              <span>Simulation</span>
            </button>
          </div>

          {/* Camera Device Dropdown for Webcam Mode */}
          {streamMode === 'webcam' && videoDevices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                if (isStreaming) startWebcam(e.target.value);
              }}
              className="bg-zinc-900 text-zinc-200 text-xs border border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-500 max-w-[150px] truncate"
              title="Select Video Input Device"
            >
              {videoDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          <div className="h-5 w-px bg-zinc-800 mx-1 hidden sm:block" />

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundAlerts(!soundAlerts)}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              soundAlerts
                ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                : 'bg-zinc-950 text-zinc-600 border-zinc-800'
            }`}
            title={soundAlerts ? "Audio Alerts Enabled" : "Muted"}
          >
            {soundAlerts ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Theater / Cinema View Toggle */}
          <button
            onClick={() => {
              setIsTheaterMode(prev => !prev);
              if (!isTheaterMode) {
                setIsSidePanelOpen(false);
              }
            }}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isTheaterMode
                ? 'bg-zinc-800 text-white border-zinc-600'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border-zinc-800'
            }`}
            title={isTheaterMode ? "Standard View" : "Cinema View"}
          >
            <Maximize2 size={14} />
            <span className="hidden sm:inline">{isTheaterMode ? "Standard" : "Cinema"}</span>
          </button>

          {/* Side Panel Toggle */}
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              !isSidePanelOpen
                ? 'bg-zinc-800 text-white border-zinc-600'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border-zinc-800'
            }`}
            title={isSidePanelOpen ? "Expand to Full Width" : "Show Side Panel"}
          >
            {isSidePanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span className="hidden sm:inline">{isSidePanelOpen ? "Wide" : "Split"}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Laptop Fullscreen (F)"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>

          {isStreaming && (
            <button
              onClick={stopStream}
              className="p-2 rounded-lg bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/40 transition-colors text-xs"
              title="Stop surveillance stream"
            >
              <CameraOff size={15} />
            </button>
          )}
        </div>
      </div>

      {/* AI Mode, Category Filters & Real-time Object Search Bar */}
      <div className="glass-panel p-3 rounded-xl space-y-2.5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* AI Engine Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal size={13} className="text-zinc-300" /> AI Engine:
            </span>
            <div className="bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 flex items-center gap-1">
              <button
                onClick={() => {
                  setAiMode('combined');
                  aiModeRef.current = 'combined';
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  aiMode === 'combined'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Dual-Layer AI: 80 COCO Objects + Road Traffic & Plates"
              >
                <Sparkles size={13} className={aiMode === 'combined' ? 'text-black' : 'text-zinc-400'} />
                <span>Dual AI (Combined)</span>
              </button>

              <button
                onClick={() => {
                  setAiMode('objects');
                  aiModeRef.current = 'objects';
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  aiMode === 'objects'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="General Object Detection (People, Electronics, Animals, etc.)"
              >
                <Box size={13} className={aiMode === 'objects' ? 'text-black' : 'text-zinc-400'} />
                <span>General Objects (80)</span>
              </button>

              <button
                onClick={() => {
                  setAiMode('traffic');
                  aiModeRef.current = 'traffic';
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  aiMode === 'traffic'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Dedicated Road Safety AI (Vehicles, Helmets, Plates)"
              >
                <Car size={13} className={aiMode === 'traffic' ? 'text-black' : 'text-zinc-400'} />
                <span>Traffic AI Only</span>
              </button>
            </div>
          </div>

          {/* Real-time Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchQueryRef.current = e.target.value;
              }}
              placeholder="Search objects in view (person, dog, laptop)..."
              className="w-full bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchQueryRef.current = '';
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills (When in Combined or Objects Mode) */}
        {aiMode !== 'traffic' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
              <Tag size={11} /> Filter:
            </span>
            {OBJECT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'All'
                ? (objectCounts.total_objects || activeObjects.length)
                : (objectCounts.categories?.[cat.id] || 0);

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    selectedCategoryRef.current = cat.id;
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${
                    isSelected
                      ? 'bg-white text-black font-semibold shadow-sm scale-105'
                      : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
                  }`}
                >
                  <Icon size={12} />
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Video Viewport & Real-time Telemetry */}
      <div className={`grid gap-4 ${isSidePanelOpen && !isFullscreen && !isTheaterMode ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Live Surveillance Viewport */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onDoubleClick={toggleFullscreen}
          className={`${
            isFullscreen
              ? 'fixed inset-0 z-[99999] w-screen h-screen bg-black flex items-center justify-center p-0 m-0 border-0 rounded-none overflow-hidden select-none ' + (!showHud ? 'cursor-none' : '')
              : isTheaterMode
              ? 'col-span-full rounded-xl bg-black border border-zinc-800 overflow-hidden relative shadow-lg flex flex-col items-center justify-center min-h-[75vh] transition-all duration-200'
              : (isSidePanelOpen ? 'lg:col-span-2' : 'col-span-full') + ' rounded-xl bg-black border border-zinc-800 overflow-hidden relative shadow-lg flex flex-col items-center justify-center min-h-[520px] transition-all duration-200'
          }`}
        >
          {/* Subtle on-screen indicator when entering Fullscreen */}
          {isFullscreen && fsNotification && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 text-zinc-200 border border-zinc-800 px-4 py-2 rounded-lg shadow-xl backdrop-blur-md text-xs font-medium animate-in fade-in pointer-events-none flex items-center gap-2">
              <Maximize2 size={14} className="text-white" />
              <span>Fullscreen Active • Double-click or Esc to exit</span>
            </div>
          )}

          {/* Floating Fullscreen Cyber Command Bar (Active only in True Fullscreen with auto-hide) */}
          {isFullscreen && (
            <div
              className={`absolute top-4 left-6 right-6 flex items-center justify-between z-30 transition-all duration-300 ${
                showHud ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Left: HUD status pill */}
              <div className="flex items-center gap-3 bg-zinc-950/90 backdrop-blur-xl px-4 py-2 rounded-lg border border-zinc-800 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-white text-xs tracking-wide uppercase flex items-center gap-1.5">
                  <Radio size={13} className="text-zinc-400" />
                  Fullscreen Monitor
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-emerald-400 font-mono font-bold text-xs">{telemetry.fps} FPS</span>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-300 font-mono text-xs">{telemetry.inference_ms}ms</span>
              </div>

              {/* Center: Source quick switcher in fullscreen */}
              <div className="hidden md:flex items-center gap-1 bg-zinc-950/90 backdrop-blur-xl p-1 rounded-lg border border-zinc-800 shadow-xl">
                <button
                  onClick={(e) => { e.stopPropagation(); switchMode('phone'); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    streamMode === 'phone' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  📱 Mobile
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); switchMode('webcam'); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    streamMode === 'webcam' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  💻 Laptop Cam
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); switchMode('sim'); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    streamMode === 'sim' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🔄 Simulation
                </button>
              </div>

              {/* Right: Zero-Border Toggle, Audio, and Exit Fullscreen */}
              <div className="flex items-center gap-1.5 bg-zinc-950/90 backdrop-blur-xl p-1 rounded-lg border border-zinc-800 shadow-xl">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFitMode(prev => prev === 'cover' ? 'contain' : 'cover');
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    fitMode === 'cover'
                      ? 'bg-white text-black font-semibold'
                      : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                  }`}
                  title={fitMode === 'cover' ? "Zero-Border Fill active. Click for Aspect Fit." : "Letterbox Fit active. Click for Zero-Border Fill."}
                >
                  <Eye size={13} />
                  <span>{fitMode === 'cover' ? 'Zero-Border' : 'Aspect Fit'}</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setSoundAlerts(!soundAlerts); }}
                  className="p-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all"
                  title="Toggle Audio Alerts"
                >
                  {soundAlerts ? <Volume2 size={15} className="text-white" /> : <VolumeX size={15} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-all border border-zinc-800"
                  title="Exit Fullscreen (Esc or Double-Click)"
                >
                  <Minimize2 size={13} />
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
                : 'rounded-xl mx-auto shadow-md'
            } transition-all duration-200 cursor-pointer ${
              (streamMode === 'phone' && !phoneConnected) || (streamMode === 'webcam' && !isStreaming)
                ? 'hidden'
                : 'block'
            }`}
            title="Double-click to toggle Fullscreen"
          />

          {/* Subtle Corner Target Crosshairs */}
          {(phoneConnected || (streamMode !== 'phone' && isStreaming)) && (
            <>
              <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-zinc-600 pointer-events-none z-10" />
              <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-zinc-600 pointer-events-none z-10" />
              <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-zinc-600 pointer-events-none z-10" />
              <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-zinc-600 pointer-events-none z-10" />
            </>
          )}

          {/* Webcam Start Prompt Card (When in Webcam mode & Not streaming yet) */}
          {streamMode === 'webcam' && !isStreaming && (
            <div className="py-16 px-6 text-center space-y-5 flex flex-col items-center justify-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-inner">
                <Camera size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white tracking-tight">Laptop / USB Camera</h3>
                <p className="text-xs text-zinc-400">
                  Ready to capture live traffic from your integrated webcam, external USB cam, or virtual camera.
                </p>
              </div>

              {videoDevices.length > 0 && (
                <div className="w-full max-w-xs space-y-1 text-left">
                  <label className="text-[11px] text-zinc-400 font-medium">Select Camera Input:</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
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
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-sm transition-all"
              >
                <Camera size={15} />
                <span>Start Camera Stream</span>
              </button>
            </div>
          )}

          {/* Special Mobile Camera Connect Guide When in Phone Mode & Not Connected Yet */}
          {streamMode === 'phone' && !phoneConnected && (
            <div className="py-10 px-6 text-center space-y-6 flex flex-col items-center justify-center max-w-2xl">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
                  <Smartphone size={14} className="text-white" />
                  <span>Wireless Smartphone Surveillance</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Connect Phone Camera</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Scan this QR code with your mobile camera or Google Lens to transmit live HD feed to the detection pipeline.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl w-full backdrop-blur-md">
                <div className="p-3 bg-white rounded-xl shadow-md shrink-0 border border-zinc-200 flex flex-col items-center justify-center min-w-[180px] min-h-[180px]">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Mobile Camera QR Code Scanner"
                      className="w-40 h-40 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-40 h-40 flex flex-col items-center justify-center text-zinc-500 text-xs">
                      <RefreshCw size={24} className="animate-spin text-zinc-800 mb-2" />
                      <span>Generating QR...</span>
                    </div>
                  )}
                  <span className="text-[10px] font-semibold text-zinc-800 mt-1 uppercase tracking-wider">
                    Scan with Phone
                  </span>
                </div>

                <div className="space-y-3.5 text-left w-full max-w-sm">
                  {/* Backend Status indicator */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <QrCode size={13} /> Scanner Link
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                      backendStatus === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : backendStatus === 'offline'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {backendStatus === 'online' ? 'Backend Online' : backendStatus === 'offline' ? 'Backend Offline' : 'Connecting...'}
                    </span>
                  </div>

                  {/* Network Adapter IP Selector (if multiple exist) */}
                  {networkInfo?.all_ips && networkInfo.all_ips.length > 1 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                        <Wifi size={11} className="text-zinc-300" /> Select Network Adapter / Wi-Fi:
                      </label>
                      <select
                        value={selectedIp}
                        onChange={(e) => setSelectedIp(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700"
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
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                      <ExternalLink size={12} /> Mobile Link:
                    </span>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-200">
                      <span className="truncate mr-2 select-all">{activeMobileCamUrl}</span>
                      <button
                        onClick={copyUrl}
                        className="px-2.5 py-1 rounded-md bg-white text-black font-semibold text-[10px] hover:bg-zinc-200 transition-colors shrink-0 shadow-sm flex items-center gap-1"
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Test Transmitter in New Tab */}
                  <button
                    onClick={() => window.open(activeMobileCamUrl, '_blank')}
                    className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-800 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={13} />
                    <span>Test Transmitter in New Tab</span>
                  </button>
                </div>
              </div>

              {/* Troubleshooting Guide */}
              <div className="w-full text-left p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                  <AlertCircle size={14} className="text-zinc-400" />
                  <span>Mobile Phone Connection Guide:</span>
                </div>
                <ol className="text-[11px] text-zinc-400 space-y-1.5 pl-4 list-decimal">
                  <li>
                    <strong className="text-zinc-200">Same Wi-Fi / Hotspot:</strong> Mobile phone and laptop must be connected to the same Wi-Fi network or phone Hotspot.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Certificate / Security Prompt:</strong> If the mobile browser displays "Your connection is not private", tap <span className="text-white font-medium">"Advanced"</span> and select <span className="text-white font-medium">"Proceed to {selectedIp || '...' } (unsafe)"</span>.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Camera Permission:</strong> When prompted by your mobile browser, select <span className="text-emerald-400 font-medium">Allow</span> to start transmitting video.
                  </li>
                </ol>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                <span>Waiting for mobile stream connection...</span>
              </div>
            </div>
          )}

          {/* Floating Top Telemetry HUD Overlay (Only when not in fullscreen) */}
          {!isFullscreen && (phoneConnected || (streamMode !== 'phone' && isStreaming)) && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
              {/* Left Telemetry Pill */}
              <div className="pointer-events-auto flex items-center gap-2.5 bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-mono text-white shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-white uppercase tracking-wide">
                  {streamMode === 'phone' ? 'Mobile Cam' : streamMode === 'webcam' ? 'Webcam' : 'Simulation'}
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-emerald-400 font-bold">{telemetry.fps} FPS</span>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-400">{telemetry.inference_ms} ms</span>
              </div>

              {/* Right Floating Controls */}
              <div className="pointer-events-auto flex items-center gap-1 bg-zinc-950/90 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-lg">
                <button
                  onClick={() => setSoundAlerts(!soundAlerts)}
                  className={`p-1.5 rounded-md transition-all ${
                    soundAlerts ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={soundAlerts ? "Audio Alerts Enabled" : "Muted"}
                >
                  {soundAlerts ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>

                <button
                  onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                  title={isSidePanelOpen ? "Expand to Full Width" : "Show Side Detections"}
                >
                  {isSidePanelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                {isStreaming && (
                  <button
                    onClick={stopStream}
                    className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-all"
                    title="Stop Stream"
                  >
                    <CameraOff size={15} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Floating Bottom Telemetry HUD Overlay (Auto-hides in fullscreen) */}
          {(phoneConnected || (streamMode !== 'phone' && isStreaming)) && (
            <div
              className={`absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 z-20 transition-all duration-300 ${
                isFullscreen && !showHud ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-none'
              }`}
            >
              {/* Telemetry counters & Breakdown */}
              <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
                {aiMode !== 'traffic' && (
                  <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-white shadow-lg flex items-center gap-2 font-mono">
                    <Box size={13} className="text-amber-400" />
                    <span className="text-zinc-400">Objects:</span>
                    <span className="font-bold text-amber-400">{activeObjects.length}</span>
                  </div>
                )}

                {aiMode !== 'objects' && (
                  <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-white shadow-lg flex items-center gap-2 font-mono">
                    <Car size={13} className="text-blue-400" />
                    <span className="text-zinc-400">Vehicles:</span>
                    <span className="font-bold text-white">{telemetry.vehicles_count}</span>
                  </div>
                )}

                {aiMode !== 'objects' && (
                  <div className="hidden sm:flex items-center gap-2 bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 font-mono">
                    <span>Cars {telemetry.counts?.cars || 0}</span>
                    <span className="text-zinc-700">•</span>
                    <span>Bikes {telemetry.counts?.motorcycles || 0}</span>
                    <span className="text-zinc-700">•</span>
                    <span>Heavy {(telemetry.counts?.trucks || 0) + (telemetry.counts?.buses || 0)}</span>
                  </div>
                )}

                {aiMode === 'objects' && objectCounts.breakdown && Object.keys(objectCounts.breakdown).length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 font-mono">
                    {Object.entries(objectCounts.breakdown).slice(0, 4).map(([k, v], i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && <span className="text-zinc-700 mr-1">•</span>}
                        <span>{k}</span>
                        <span className="text-white font-bold">{v}</span>
                      </span>
                    ))}
                  </div>
                )}

                {activeVehicles.some(v => v.power_type === 'Electric') && (
                  <div className="bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-xs text-emerald-400 font-semibold font-mono flex items-center gap-1">
                    <Zap size={13} />
                    <span>EV Detected</span>
                  </div>
                )}
              </div>

              {/* Violations banner */}
              <div className="pointer-events-auto flex items-center gap-2">
                {telemetry.violations_count > 0 ? (
                  <div className="bg-red-950/90 border border-red-500/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300 shadow-lg flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-red-400" />
                    <span>{telemetry.violations_count} VIOLATION DETECTED</span>
                  </div>
                ) : (
                  <div className="bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Perimeter Secure</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Detections Side Panel (Collapsible, Dual Tabs: Objects & Traffic) */}
        {isSidePanelOpen && !isFullscreen && (
          <div className="rounded-xl glass-panel p-4 flex flex-col justify-between space-y-3 shadow-lg transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white tracking-tight">Active Surveillance</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-300 font-mono border border-zinc-700">
                    {aiMode === 'objects' ? `${activeObjects.length} objects` : aiMode === 'traffic' ? `${activeVehicles.length} vehicles` : `${activeObjects.length + activeVehicles.length} total`}
                  </span>
                </div>
                <button
                  onClick={() => setIsSidePanelOpen(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs transition-colors"
                  title="Hide side panel"
                >
                  <PanelRightClose size={14} />
                </button>
              </div>

              {/* Sub-Tab Navigation Header */}
              <div className="grid grid-cols-2 gap-1 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800/80 mb-3">
                <button
                  onClick={() => setSidePanelTab('objects')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    (sidePanelTab === 'objects' || (sidePanelTab === 'auto' && aiMode !== 'traffic'))
                      ? 'bg-white text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Box size={13} />
                  <span>General Objects</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    (sidePanelTab === 'objects' || (sidePanelTab === 'auto' && aiMode !== 'traffic'))
                      ? 'bg-black text-white'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {activeObjects.length}
                  </span>
                </button>

                <button
                  onClick={() => setSidePanelTab('traffic')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    (sidePanelTab === 'traffic' || (sidePanelTab === 'auto' && aiMode === 'traffic'))
                      ? 'bg-white text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Car size={13} />
                  <span>Vehicles & OCR</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    (sidePanelTab === 'traffic' || (sidePanelTab === 'auto' && aiMode === 'traffic'))
                      ? 'bg-black text-white'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {activeVehicles.length}
                  </span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: GENERAL OBJECTS */}
            {(sidePanelTab === 'objects' || (sidePanelTab === 'auto' && aiMode !== 'traffic')) && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                {/* Real-time Category Breakdown Chips */}
                {objectCounts.breakdown && Object.keys(objectCounts.breakdown).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    {Object.entries(objectCounts.breakdown).map(([name, cnt]) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium"
                      >
                        <span>{name}</span>
                        <span className="font-bold text-white bg-zinc-800 px-1 rounded text-[10px] font-mono">
                          ×{cnt}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Filtered Objects List */}
                <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
                  {(() => {
                    const filtered = activeObjects.filter(obj => {
                      if (selectedCategory !== 'All' && obj.category !== selectedCategory) return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        return (
                          obj.name.toLowerCase().includes(q) ||
                          obj.category.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-14 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
                          <Box size={28} className="text-zinc-700" />
                          <span>
                            {searchQuery
                              ? `No objects matching "${searchQuery}"`
                              : `No objects in category "${selectedCategory}".`}
                          </span>
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
                              ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/40'
                              : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                              <span className="font-bold text-xs text-white capitalize tracking-wide">
                                {obj.name}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${badge.pill}`}>
                                {obj.category}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-semibold text-emerald-400">
                              {Math.round(obj.confidence)}%
                            </span>
                          </div>

                          {/* Confidence bar */}
                          <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(5, obj.confidence))}%` }}
                            />
                          </div>

                          {/* Bounding box telemetry footer */}
                          {obj.bbox && (
                            <div className="mt-2 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                              <span>Box: [{obj.bbox.slice(0, 4).join(', ')}]</span>
                              <span>Area: {Math.max(0, (obj.bbox[2] - obj.bbox[0]) * (obj.bbox[3] - obj.bbox[1]))}px</span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: VEHICLES & ROAD SURVEILLANCE */}
            {(sidePanelTab === 'traffic' || (sidePanelTab === 'auto' && aiMode === 'traffic')) && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
                  {activeVehicles.length > 0 ? (
                    activeVehicles.map((v, idx) => (
                      <div
                        key={v.track_id || idx}
                        className={`p-3 rounded-lg border transition-all ${
                          v.has_violation
                            ? 'bg-red-950/10 border-red-900/50'
                            : v.power_type === 'Electric'
                            ? 'bg-zinc-950 border-emerald-900/40'
                            : 'bg-zinc-950 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {v.vehicle_type === 'Motorcycle' ? (
                              <Bike size={15} className="text-zinc-300" />
                            ) : v.vehicle_type === 'Truck' ? (
                              <Truck size={15} className="text-zinc-300" />
                            ) : v.vehicle_type === 'Bus' ? (
                              <Bus size={15} className="text-zinc-300" />
                            ) : (
                              <Car size={15} className="text-zinc-300" />
                            )}
                            <span className="font-semibold text-xs text-white">
                              #{v.track_id} {v.vehicle_type}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-zinc-400">
                            {Math.round(v.confidence * 100)}%
                          </span>
                        </div>

                        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                          {/* Plate Status */}
                          <div className="p-2 rounded-md bg-zinc-900 border border-zinc-800/80">
                            <span className="text-zinc-500 block text-[10px]">License Plate</span>
                            <span className="font-mono text-white font-semibold truncate block">
                              {v.plate?.detected ? v.plate.plate_number : 'None'}
                            </span>
                          </div>

                          {/* Power Type */}
                          <div className="p-2 rounded-md bg-zinc-900 border border-zinc-800/80">
                            <span className="text-zinc-500 block text-[10px]">Propulsion</span>
                            <span className={`font-semibold ${v.power_type === 'Electric' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                              {v.power_type}
                            </span>
                          </div>

                          {/* Helmet Status for two-wheelers */}
                          {v.helmet && v.helmet.rider_detected && (
                            <div className="col-span-2 p-2 rounded-md bg-zinc-900 border border-zinc-800/80 flex items-center justify-between">
                              <span className="text-zinc-500">Helmet Check:</span>
                              <span className={`font-semibold ${
                                v.helmet.helmet_status === 'YES' ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {v.helmet.helmet_status === 'YES' ? 'Verified (Helmet)' : 'No Helmet Violation'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-14 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
                      <Layers size={28} className="text-zinc-700" />
                      <span>No vehicles currently inside surveillance perimeter.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Status Legend */}
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] space-y-1 text-zinc-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Compliant / Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Violation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>People</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
