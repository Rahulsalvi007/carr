import React from 'react';
import {
  LayoutDashboard,
  Video,
  UploadCloud,
  Car,
  AlertTriangle,
  Clock,
  BarChart3,
  Smartphone,
  Sliders,
  ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'live', label: 'Live Detection', icon: Video, badge: 'Live' },
  { id: 'upload', label: 'Upload Media', icon: UploadCloud },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'violations', label: 'Violations', icon: AlertTriangle, badgeColor: 'bg-rose-500/20 text-rose-400' },
  { id: 'history', label: 'History & Logs', icon: Clock },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'mobile-cam', label: 'Phone Camera', icon: Smartphone },
  { id: 'settings', label: 'Settings & Models', icon: Sliders },
];

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 px-3">
            Surveillance Navigation
          </div>

          <nav className="space-y-1.5">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor || 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Info Widget */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pipeline Engine</span>
            <span className="text-emerald-400 font-semibold">YOLOv8 + OCR</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full w-full animate-pulse" />
          </div>
          <div className="mt-2 text-[11px] text-slate-400 text-center">
            Confidence Gated Decision Logic
          </div>
        </div>
      </aside>
    </>
  );
}
