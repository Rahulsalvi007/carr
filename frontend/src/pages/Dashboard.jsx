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

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">Surveillance Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time computer vision traffic monitoring & road-safety violations</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all"
          >
            <Radio size={15} className="animate-pulse text-emerald-300" />
            <span>Open Live Surveillance</span>
          </button>
        </div>
      </div>

      {/* Top 7 Stat Cards as requested in section 10 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        <StatCard
          title="Total Vehicles"
          value={summary.total_vehicles || 0}
          icon={Car}
          color="blue"
          subtext="Tracked objects"
        />
        <StatCard
          title="Cars"
          value={summary.cars || 0}
          icon={Car}
          color="cyan"
          subtext="Automobiles"
        />
        <StatCard
          title="Bikes / Cycles"
          value={summary.bikes || 0}
          icon={Bike}
          color="emerald"
          subtext="Two-wheelers"
        />
        <StatCard
          title="Electric (EV)"
          value={summary.evs || 0}
          icon={Zap}
          color="purple"
          subtext="Green-plate verified"
        />
        <StatCard
          title="Helmet Viols"
          value={summary.helmet_violations || 0}
          icon={ShieldAlert}
          color="rose"
          badge="Safety alert"
        />
        <StatCard
          title="Missing Plates"
          value={summary.missing_plate_violations || 0}
          icon={EyeOff}
          color="amber"
          subtext="No plate localized"
        />
        <StatCard
          title="Total Violations"
          value={summary.total_violations || 0}
          icon={AlertTriangle}
          color="rose"
          badge="Action needed"
        />
      </div>

      {/* Main Charts & Live Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Traffic Trend (Area Chart) */}
        <div className="lg:col-span-2 cyber-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Traffic Volume by Hour</h3>
              <p className="text-xs text-slate-400">Total detected vehicles across 24 hours</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <TrendingUp size={14} />
              <span>Real-time aggregation</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {hourly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No hourly records found. Launch live camera or upload media to populate statistics.
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Composition (Donut Chart) */}
        <div className="cyber-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-white">Vehicle Class Breakdown</h3>
            <p className="text-xs text-slate-400">Classified vehicle types</p>
          </div>

          <div className="h-48 w-full my-2">
            {vehicleBreakdown.some(v => v.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {vehicleBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center px-4">
                Vehicle distribution chart will appear once objects are detected.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {vehicleBreakdown.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-400">{item.name}:</span>
                <span className="font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Helmet Compliance + Recent Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Helmet Compliance Gauge Card */}
        <div className="cyber-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-white">Helmet Compliance</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Safety Index
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="#1E293B"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeDasharray={351.8}
                  strokeDashoffset={351.8 - (351.8 * (summary.helmet_compliance_rate || 100)) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-white">{summary.helmet_compliance_rate || 100}%</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Compliant</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center max-w-xs">
              Based on rider head region analysis across all tracked two-wheeler detections.
            </p>
          </div>
        </div>

        {/* Recent Violations Feed */}
        <div className="lg:col-span-2 cyber-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Recent Road Violations</h3>
              <p className="text-xs text-slate-400">Automatic safety infractions logged by rule engine</p>
            </div>
            <button
              onClick={() => setActiveTab('violations')}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {recentViolations.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {recentViolations.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedViolation(v)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-3 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{v.violation_type.replace('_', ' ')}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {v.vehicle_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Plate: <span className="font-mono text-slate-300">{v.plate_number || 'N/A'}</span> • {Math.round(v.confidence * 100)}% Confidence
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ''}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      v.status === 'ACTIVE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
              <ShieldAlert size={32} className="text-slate-600 mb-2" />
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
