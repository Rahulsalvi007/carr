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

  const PIE_COLORS = ['#ffffff', '#a1a1aa', '#52525b'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Traffic Intelligence & Analytics</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Data visualizations on traffic density, vehicle classifications, helmet compliance, and safety infractions
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
          {[
            { label: 'Today', val: 1 },
            { label: '7 Days', val: 7 },
            { label: '30 Days', val: 30 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setDays(item.val)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                days === item.val
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Aggregates Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="pro-card p-4 rounded-xl">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Compliance Rate</span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{summary.helmet_compliance_rate || 100}%</p>
          <span className="text-[11px] text-zinc-500">Riders with helmets</span>
        </div>

        <div className="pro-card p-4 rounded-xl">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Electric Vehicles</span>
          <p className="text-2xl font-bold font-mono text-white mt-1">{summary.evs || 0}</p>
          <span className="text-[11px] text-zinc-500">Green plate verified vehicles</span>
        </div>

        <div className="pro-card p-4 rounded-xl">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Violations Logged</span>
          <p className="text-2xl font-bold font-mono text-red-400 mt-1">{summary.total_violations || 0}</p>
          <span className="text-[11px] text-zinc-500">Recorded infractions</span>
        </div>

        <div className="pro-card p-4 rounded-xl">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Missing Plates</span>
          <p className="text-2xl font-bold font-mono text-white mt-1">{summary.missing_plate_violations || 0}</p>
          <span className="text-[11px] text-zinc-500">Unidentified plate instances</span>
        </div>
      </div>

      {/* Row 1: Hourly Flow + Violations by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Volume */}
        <div className="pro-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-white">Traffic Density Distribution</h3>
              <p className="text-xs text-zinc-400">Detections grouped across 24h timeline</p>
            </div>
            <TrendingUp size={16} className="text-zinc-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="hour" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#ffffff" strokeWidth={2} fill="url(#areaColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Violations by Category (Bar Chart) */}
        <div className="pro-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-white">Infractions by Category</h3>
              <p className="text-xs text-zinc-400">Breakdown of road safety violations detected</p>
            </div>
            <AlertTriangle size={16} className="text-zinc-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violationTypes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="type" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#d4d4d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: EV Adoption vs Conventional Fuel + Vehicle Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EV vs Conventional Fuel Vehicles */}
        <div className="pro-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-white">Propulsion Distribution</h3>
              <p className="text-xs text-zinc-400">Electric vehicles verified vs conventional fossil fuel</p>
            </div>
            <Zap size={16} className="text-zinc-400" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={powerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {powerData.map((entry, index) => (
                    <Cell key={`pcell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Class Breakdown */}
        <div className="pro-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-white">Vehicles by Classification</h3>
              <p className="text-xs text-zinc-400">Total volume grouped by vehicle body class</p>
            </div>
            <Car size={16} className="text-zinc-400" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#ffffff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
