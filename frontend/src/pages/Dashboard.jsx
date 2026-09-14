import React, { useState, useEffect } from 'react';
import {
  Car,
  Bike,
  Zap,
  ShieldAlert,
  AlertTriangle,
  EyeOff,
  Radio,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import StatCard from '../components/StatCard';
import ViolationModal from '../components/ViolationModal';
import { getAnalytics, getViolations } from '../services/api';

export default function Dashboard({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [recentViolations, setRecentViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, violationsRes] = await Promise.all([
        getAnalytics(7),
        getViolations({ limit: 5 })
      ]);
      setData(analyticsRes.data);
      setRecentViolations(violationsRes.data.violations || []);
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const summary = data?.summary || {};
  const hourly = data?.hourly_trend || [];
  const vehicleBreakdown = data?.vehicle_breakdown || [];
  const powerData = data?.power_distribution || [];

  const COLORS = ['#09090b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 m-0">Surveillance Overview</h1>
          <p className="text-xs text-zinc-500 mt-1">Real-time roadway analytics, vehicle tracking, and infraction monitoring</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200 shadow-xs transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-black hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Radio size={14} className="text-white" />
            <span>Live Surveillance</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard
          title="Total Vehicles"
          value={summary.total_vehicles || 0}
          icon={Car}
          subtext="Tracked objects"
        />
        <StatCard
          title="Cars"
          value={summary.cars || 0}
          icon={Car}
          subtext="Automobiles"
        />
        <StatCard
          title="Bikes / Cycles"
          value={summary.bikes || 0}
          icon={Bike}
          subtext="Two-wheelers"
        />
        <StatCard
          title="Electric (EV)"
          value={summary.evs || 0}
          icon={Zap}
          subtext="Verified EV"
        />
        <StatCard
          title="Helmet Viols"
          value={summary.helmet_violations || 0}
          icon={ShieldAlert}
          badge="Safety"
        />
        <StatCard
          title="Missing Plates"
          value={summary.missing_plate_violations || 0}
          icon={EyeOff}
          subtext="Unidentified"
        />
        <StatCard
          title="Total Violations"
          value={summary.total_violations || 0}
          icon={AlertTriangle}
          badge="Attention"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly Traffic Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-zinc-950">Traffic Volume by Hour</h3>
              <p className="text-[11px] text-zinc-500">Total detected vehicles across 24 hours</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200 font-semibold">
              <TrendingUp size={12} className="text-zinc-600" />
              <span>Real-time</span>
            </div>
          </div>

          <div className="h-60 w-full">
            {hourly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#09090b" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#09090b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '10px', color: '#09090b', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#09090b" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
                No hourly records found. Launch live camera or upload media to populate statistics.
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Composition (Donut Chart) */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-zinc-950">Vehicle Class Breakdown</h3>
            <p className="text-[11px] text-zinc-500">Classified vehicle types</p>
          </div>

          <div className="h-44 w-full my-2">
            {vehicleBreakdown.some(v => v.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {vehicleBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '10px', fontSize: '12px', color: '#09090b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs text-center px-4">
                Vehicle distribution chart will appear once objects are detected.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {vehicleBreakdown.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-zinc-500">{item.name}:</span>
                <span className="font-bold text-zinc-950 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Helmet Compliance + Recent Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Helmet Compliance Gauge Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-zinc-950">Helmet Compliance</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 font-semibold">
              Safety Index
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-3 space-y-3">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="50"
                  stroke="#e4e4e7"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="50"
                  stroke="#09090b"
                  strokeWidth="10"
                  strokeDasharray={314.15}
                  strokeDashoffset={314.15 - (314.15 * (summary.helmet_compliance_rate || 100)) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold font-mono text-zinc-950">{summary.helmet_compliance_rate || 100}%</span>
                <span className="text-[9px] uppercase font-bold text-zinc-400">Compliant</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 text-center max-w-xs leading-relaxed">
              Based on rider head region analysis across all tracked two-wheeler detections.
            </p>
          </div>
        </div>

        {/* Recent Violations Feed */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-zinc-950">Recent Road Violations</h3>
              <p className="text-[11px] text-zinc-500">Automatic safety infractions logged by rule engine</p>
            </div>
            <button
              onClick={() => setActiveTab('violations')}
              className="flex items-center gap-1 text-xs text-zinc-700 hover:text-black font-semibold transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {recentViolations.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {recentViolations.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedViolation(v)}
                  className="py-3 flex items-center justify-between hover:bg-zinc-50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
                      <AlertTriangle size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-900">{v.violation_type.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 font-semibold">
                          {v.vehicle_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Plate: <span className="font-mono text-zinc-900 font-bold">{v.plate_number || 'N/A'}</span> • {Math.round((v.confidence || 0) * 100)}% Conf
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ''}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                      v.status === 'ACTIVE' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-zinc-400 text-xs flex flex-col items-center justify-center">
              <ShieldAlert size={28} className="text-zinc-300 mb-1.5" />
              <span>No violations recorded yet. Connect a camera feed to begin automated monitoring.</span>
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Modal */}
      {selectedViolation && (
        <ViolationModal
          violation={selectedViolation}
          onClose={() => setSelectedViolation(null)}
          onStatusUpdated={(id, status) => {
            setRecentViolations(prev => prev.map(v => v.id === id ? { ...v, status } : v));
          }}
        />
      )}
    </div>
  );
}
