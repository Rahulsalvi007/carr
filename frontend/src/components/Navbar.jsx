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
    if (networkInfo?.mobile_url) {
      navigator.clipboard.writeText(networkInfo.mobile_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 text-white px-4 lg:px-7 py-3 flex items-center justify-between shadow-2xl">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                ROADGUARD
              </span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-black border border-cyan-500/30">
                AI CORE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
              Intelligent Road Surveillance & Wireless Mobile Camera System
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Camera Wi-Fi URL Badge with Copy */}
        {networkInfo && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors">
            <Wifi size={14} className="text-cyan-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">Phone Wi-Fi Stream URL</span>
              <span className="text-xs font-mono font-semibold text-slate-200">{networkInfo.mobile_url}</span>
            </div>
            <button
              onClick={copyMobileLink}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
              title="Copy mobile link"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {/* Smartphone Camera Link */}
        <button
          onClick={() => setActiveTab('mobile-cam')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 text-cyan-300 hover:text-white text-xs font-bold border border-cyan-500/40 shadow-sm transition-all"
          title="Turn your phone into a wireless AI camera"
        >
          <Smartphone size={16} className="text-cyan-400" />
          <span className="hidden sm:inline">Phone Cam Mode</span>
        </button>

        {/* Engine Hardware Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Cpu size={14} className="text-indigo-400" />
          <span className="font-mono">{deviceInfo}</span>
        </div>

        {/* System Online Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 radar-glow' : 'bg-rose-500'}`} />
          <span className="text-xs font-semibold text-slate-300 hidden xs:inline">
            {isOnline ? 'Vision Engine Active' : 'Connecting...'}
          </span>
        </div>

        {/* Live Clock */}
        <div className="text-xs font-mono text-slate-400 hidden xl:block bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/80">
          {currentTime}
        </div>
      </div>
    </header>
  );
}
