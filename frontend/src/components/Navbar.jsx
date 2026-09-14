import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Server,
  Menu,
  X,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { getHealth, getNetworkIp } from '../services/api';

export default function Navbar({ onToggleSidebar, isSidebarOpen, activeTab, setActiveTab }) {
  const [isOnline, setIsOnline] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('CPU');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    const checkStatus = async () => {
      try {
        const res = await getHealth();
        setIsOnline(res.data.status === 'online');
        if (res.data.cuda) setDeviceInfo('CUDA GPU');
      } catch (e) {
        setIsOnline(false);
      }
    };

    const fetchIp = async () => {
      try {
        const res = await getNetworkIp();
        setNetworkInfo(res.data);
      } catch (e) {}
    };

    checkStatus();
    fetchIp();
    const healthInterval = setInterval(checkStatus, 12000);

    return () => {
      clearInterval(timer);
      clearInterval(healthInterval);
    };
  }, []);

  const copyMobileLink = () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const url = (!isLocalhost && hostname && window.location.port !== '5173')
      ? `${window.location.origin}/?tab=mobile-cam`
      : (networkInfo?.mobile_cam_url || networkInfo?.mobile_url || `${window.location.origin}/?tab=mobile-cam`);
    
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 text-zinc-900 px-3 sm:px-4 lg:px-7 py-2.5 flex items-center justify-between shadow-xs">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-black transition-colors"
        >
          {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-black shadow-xs group-hover:bg-zinc-800 transition-colors shrink-0">
            <ShieldCheck className="text-white" size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm tracking-tight text-zinc-950">
                ROADGUARD
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 hidden xs:inline">
                v3.0 AI
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-normal hidden sm:block">
              Traffic Safety & 80-Class Object Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Camera Wi-Fi URL Badge with Copy */}
        {networkInfo && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
            <Wifi size={13} className="text-zinc-500" />
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500">Wi-Fi:</span>
              <span className="text-zinc-900 font-semibold">{networkInfo.mobile_url}</span>
            </div>
            <button
              onClick={copyMobileLink}
              className="p-1 rounded hover:bg-zinc-200 text-zinc-500 hover:text-black transition-colors ml-0.5"
              title="Copy mobile link"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            </button>
          </div>
        )}

        {/* Smartphone Camera Link */}
        <button
          onClick={() => setActiveTab('mobile-cam')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors"
          title="Connect mobile device camera"
        >
          <Smartphone size={14} />
          <span className="hidden sm:inline">Phone Cam</span>
        </button>

        {/* Engine Hardware Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs text-zinc-600">
          <Cpu size={13} className="text-zinc-500" />
          <span className="font-mono text-[11px]">{deviceInfo}</span>
        </div>

        {/* System Online Status */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-medium text-zinc-700 hidden xs:inline">
            {isOnline ? 'Active' : 'Offline'}
          </span>
        </div>

        {/* Live Clock */}
        <div className="text-xs font-mono text-zinc-600 hidden xl:block bg-zinc-100 px-2.5 py-1.5 rounded-lg border border-zinc-200">
          {currentTime}
        </div>
      </div>
    </header>
  );
}
