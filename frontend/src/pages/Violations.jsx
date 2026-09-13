import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  EyeOff,
  Filter,
  CheckCircle,
  Clock,
  Car,
  Bike,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { getViolations } from '../services/api';
import ViolationModal from '../components/ViolationModal';

export default function Violations() {
  const [violations, setViolations] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchViolations = async () => {
    setIsLoading(true);
    try {
      const params = { limit: 100 };
      if (filterType !== 'ALL') params.violation_type = filterType;
      if (filterStatus !== 'ALL') params.status = filterStatus;

      const res = await getViolations(params);
      setViolations(res.data.violations || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching violations", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [filterType, filterStatus]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">Road Safety Violations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated infraction logging with camera snapshot verification and review pipeline
          </p>
        </div>

        <button
          onClick={fetchViolations}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh Violations</span>
        </button>
      </div>

      {/* Filter Chips & Selectors */}
      <div className="cyber-card p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">Category:</span>
          {['ALL', 'NO_HELMET', 'MISSING_PLATE', 'UNREADABLE_PLATE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'All Infractions' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="REVIEWED">Reviewed Only</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Violations Grid */}
      {violations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {violations.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedViolation(v)}
              className="cyber-card group rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-cyan-500/10 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Snapshot Thumbnail */}
                <div className="relative h-44 bg-slate-950 overflow-hidden flex items-center justify-center">
                  {v.snapshot_url ? (
                    <img
                      src={v.snapshot_url}
                      alt="Violation Evidence"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-slate-600 flex flex-col items-center">
                      <AlertTriangle size={32} />
                      <span className="text-[11px] mt-1">Snapshot evidence</span>
                    </div>
                  )}

                  {/* Violation Type Badge */}
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-bold text-rose-400 border border-rose-500/30">
                    {v.violation_type.replace('_', ' ')}
                  </div>

                  {/* Status Indicator */}
                  <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    v.status === 'ACTIVE'
                      ? 'bg-rose-500/80 text-white border-rose-400'
                      : 'bg-blue-500/80 text-white border-blue-400'
                  }`}>
                    {v.status}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-white">{v.vehicle_type}</span>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {Math.round(v.confidence * 100)}% Conf
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Number Plate:</span>
                      <span className="font-mono text-white font-semibold">
                        {v.plate_number || 'Missing'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                      <span className="text-slate-400 font-mono">#{v.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/80 text-center text-xs text-blue-400 group-hover:text-blue-300 font-semibold flex items-center justify-center gap-1">
                <span>Inspect Evidence Snapshot</span>
                <ExternalLink size={13} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-slate-500 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center space-y-2">
          <CheckCircle size={36} className="text-emerald-500" />
          <h4 className="text-base font-bold text-white">No Violations Found</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Road compliance looks safe under the current filter selection.
          </p>
        </div>
      )}

      {/* Inspection Modal */}
      {selectedViolation && (
        <ViolationModal
          violation={selectedViolation}
          onClose={() => setSelectedViolation(null)}
          onStatusUpdated={(id, status) => {
            setViolations(prev => prev.map(v => v.id === id ? { ...v, status } : v));
          }}
        />
      )}
    </div>
  );
}
