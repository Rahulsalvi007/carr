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
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Road Safety Violations</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Automated infraction logging with snapshot verification and review pipeline
          </p>
        </div>

        <button
          onClick={fetchViolations}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800 transition-colors"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh Violations</span>
        </button>
      </div>

      {/* Filter Chips & Selectors */}
      <div className="pro-card p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-400 font-medium mr-1">Category:</span>
          {['ALL', 'NO_HELMET', 'MISSING_PLATE', 'UNREADABLE_PLATE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === cat
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat === 'ALL' ? 'All Infractions' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
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
              className="pro-card group rounded-xl overflow-hidden hover:border-zinc-700 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Snapshot Thumbnail */}
                <div className="relative h-44 bg-zinc-950 overflow-hidden flex items-center justify-center">
                  {v.snapshot_url ? (
                    <img
                      src={v.snapshot_url}
                      alt="Violation Evidence"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-zinc-600 flex flex-col items-center">
                      <AlertTriangle size={28} />
                      <span className="text-[11px] mt-1">Snapshot evidence</span>
                    </div>
                  )}

                  {/* Violation Type Badge */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-zinc-950/85 backdrop-blur-md text-[10px] font-semibold text-red-400 border border-red-900/40">
                    {v.violation_type.replace('_', ' ')}
                  </div>

                  {/* Status Indicator */}
                  <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    v.status === 'ACTIVE'
                      ? 'bg-red-950/80 text-red-300 border-red-800'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}>
                    {v.status}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white">{v.vehicle_type}</span>
                    <span className="text-xs font-mono text-zinc-400">
                      {Math.round(v.confidence * 100)}%
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Plate:</span>
                      <span className="font-mono text-white font-medium">
                        {v.plate_number || 'Missing'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800">
                      <div className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>{v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                      <span className="font-mono text-zinc-500">#{v.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2 bg-zinc-950 border-t border-zinc-800/80 text-center text-xs text-zinc-400 group-hover:text-white font-medium flex items-center justify-center gap-1 transition-colors">
                <span>Inspect Evidence</span>
                <ExternalLink size={12} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-500 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col items-center justify-center space-y-2">
          <CheckCircle size={32} className="text-zinc-600" />
          <h4 className="text-sm font-semibold text-white">No Violations Found</h4>
          <p className="text-xs text-zinc-400 max-w-sm">
            Road compliance looks clear under the current filter selection.
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
