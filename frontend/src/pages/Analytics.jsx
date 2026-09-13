import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Car,
  Bike
} from 'lucide-react';
import { getAnalytics } from '../services/api';

export default function Analytics() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async (selectedDays) => {
    setIsLoading(true);
    try {
      const res = await getAnalytics(selectedDays);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching analytics", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(days);
  }, [days]);

  const summary = data?.summary || {};
  const hourly = data?.hourly_trend || [];
  const vehicleBreakdown = data?.vehicle_breakdown || [];
  const violationTypes = data?.violation_types || [];
  const powerData = data?.power_distribution || [];

  const PIE_COLORS = ['#06B6D4', '#64748B', '#334155'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">Traffic Intelligence & Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">
            Data visualizations on traffic density, vehicle classifications, helmet compliance, and safety infractions
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[
            { label: 'Today', val: 1 },
            { label: '7 Days', val: 7 },
            { label: '30 Days', val: 30 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setDays(item.val)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === item.val
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Aggregates Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="cyber-card p-4 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Compliance Rate</span>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">{summary.helmet_compliance_rate || 100}%</p>
          <span className="text-[11px] text-slate-400">Motorcycle riders wearing helmets</span>
        </div>

        <div className="cyber-card p-4 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Electric Vehicles</span>
          <p className="text-2xl sm:text-3xl font-bold text-cyan-400 mt-1">{summary.evs || 0}</p>
          <span className="text-[11px] text-slate-400">Green plate verified clean vehicles</span>
        </div>

        <div className="cyber-card p-4 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Violations Logged</span>
          <p className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">{summary.total_violations || 0}</p>
          <span className="text-[11px] text-slate-400">Automatic safety infractions</span>
        </div>

        <div className="cyber-card p-4 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Missing Plates</span>
          <p className="text-2xl sm:text-3xl font-bold text-amber-400 mt-1">{summary.missing_plate_violations || 0}</p>
          <span className="text-[11px] text-slate-400">Unidentified plate instances</span>
        </div>
      </div>

      {/* Row 1: Hourly Flow + Violations by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Volume */}
        <div className="cyber-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Traffic Density Distribution</h3>
              <p className="text-xs text-slate-400">Detections grouped across 24h timeline</p>
            </div>
            <TrendingUp size={18} className="text-blue-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} fill="url(#areaColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Violations by Category (Bar Chart) */}
        <div className="cyber-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Infractions by Category</h3>
              <p className="text-xs text-slate-400">Breakdown of road safety violations detected</p>
            </div>
            <AlertTriangle size={18} className="text-rose-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violationTypes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="type" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#F43F5E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: EV Adoption vs Conventional Fuel + Vehicle Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EV vs Conventional Fuel Vehicles */}
        <div className="cyber-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">EV vs Conventional Propulsion</h3>
              <p className="text-xs text-slate-400">Electric vehicles verified vs conventional fossil fuel</p>
            </div>
            <Zap size={18} className="text-cyan-400" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={powerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {powerData.map((entry, index) => (
                    <Cell key={`pcell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Class Breakdown */}
        <div className="cyber-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Vehicles by Classification</h3>
              <p className="text-xs text-slate-400">Total volume grouped by vehicle body class</p>
            </div>
            <Car size={18} className="text-blue-400" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
