import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, badge }) {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 transition-all duration-200 hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">{value ?? 0}</h3>
            {badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                {badge}
              </span>
            )}
          </div>
          {subtext && <p className="text-[11px] text-zinc-400">{subtext}</p>}
        </div>

        {Icon && (
          <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}
