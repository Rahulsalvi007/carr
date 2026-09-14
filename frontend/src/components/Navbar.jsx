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
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 text-white px-4 lg:px-7 py-2.5 flex items-center justify-between">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
        >
          {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-black shadow-sm group-hover:bg-zinc-200 transition-colors">
            <ShieldCheck className="text-black" size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                ROADGUARD
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                v3.0 AI
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-normal hidden sm:block">
              Traffic Safety & 80-Class Object Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Camera Wi-Fi URL Badge with Copy */}
        {networkInfo && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs">
            <Wifi size={13} className="text-zinc-400" />
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500">Wi-Fi:</span>
              <span className="text-zinc-200 font-semibold">{networkInfo.mobile_url}</span>
            </div>
            <button
              onClick={copyMobileLink}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors ml-0.5"
              title="Copy mobile link"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
        )}

        {/* Smartphone Camera Link */}
        <button
          onClick={() => setActiveTab('mobile-cam')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-sm transition-colors"
          title="Connect mobile device camera"
        >
          <Smartphone size={14} />
          <span className="hidden sm:inline">Phone Cam</span>
        </button>

        {/* Engine Hardware Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
          <Cpu size={13} className="text-zinc-400" />
          <span className="font-mono text-[11px]">{deviceInfo}</span>
        </div>

        {/* System Online Status */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="text-xs font-medium text-zinc-300 hidden xs:inline">
            {isOnline ? 'Active' : 'Offline'}
          </span>
        </div>

        {/* Live Clock */}
        <div className="text-xs font-mono text-zinc-400 hidden xl:block bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800">
          {currentTime}
        </div>
      </div>
    </header>
  );
}
