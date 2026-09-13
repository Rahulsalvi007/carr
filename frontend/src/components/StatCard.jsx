import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'blue', badge }) {
  const colorStyles = {
    blue: {
      bg: 'from-blue-500/10 to-indigo-500/5',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/20 text-blue-400',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-teal-500/5',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
    },
    amber: {
      bg: 'from-amber-500/10 to-orange-500/5',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-400',
    },
    rose: {
      bg: 'from-rose-500/10 to-red-500/5',
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/20 text-rose-400',
    },
    purple: {
      bg: 'from-purple-500/10 to-violet-500/5',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/20 text-purple-400',
    },
    cyan: {
      bg: 'from-cyan-500/10 to-sky-500/5',
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
    }
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div className={`cyber-card relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${style.bg} border ${style.border} transition-all hover:translate-y-[-2px] hover:shadow-cyan-500/10 hover:shadow-lg group`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{value ?? 0}</h3>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                {badge}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl ${style.iconBg} shadow-inner`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
