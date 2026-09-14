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
  ShieldCheck,
  X
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'live', label: 'Live Detection', icon: Video, badge: 'Dual AI' },
  { id: 'upload', label: 'Upload Media', icon: UploadCloud },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'violations', label: 'Violations', icon: AlertTriangle, badge: 'Alerts' },
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-30 w-64 bg-white border-r border-zinc-200 flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Mobile Drawer Header with Close Button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-200 bg-zinc-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center text-white font-black shadow-xs">
                <ShieldCheck size={16} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm text-zinc-950">RoadGuard Menu</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors"
              title="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-3 space-y-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 px-3 pt-2">
              Surveillance & AI
            </div>

            <nav className="space-y-1">
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 lg:py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} className={isActive ? 'text-white' : 'text-zinc-500'} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-zinc-800 text-zinc-100 font-bold'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
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
        </div>

        {/* Bottom System Info Widget */}
        <div className="p-3.5 border-t border-zinc-200 bg-zinc-50/70 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
            <span>Vision Core</span>
            <span className="font-mono text-zinc-800 text-[10px] font-medium">Dual AI: 80 Objects + OCR</span>
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-1 overflow-hidden">
            <div className="bg-zinc-800 h-1 rounded-full w-full" />
          </div>
          <div className="mt-2 text-[10px] text-zinc-500 flex items-center justify-between">
            <span>Real-time Inference</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>
      </aside>
    </>
  );
}
