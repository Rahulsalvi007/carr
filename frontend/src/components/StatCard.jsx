import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, badge }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 transition-all duration-200 hover:border-zinc-300 shadow-xs">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 tracking-tight">{value ?? 0}</h3>
            {badge && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                {badge}
              </span>
            )}
          </div>
          {subtext && <p className="text-[11px] text-zinc-500">{subtext}</p>}
        </div>

        {Icon && (
          <div className="p-2 rounded-xl bg-zinc-100 text-zinc-700">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}
