import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, ShieldAlert, Car, Hash, FileText } from 'lucide-react';
import { updateViolationStatus } from '../services/api';

export default function ViolationModal({ violation, onClose, onStatusUpdated }) {
  const [currentStatus, setCurrentStatus] = useState(violation?.status || 'ACTIVE');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!violation) return null;

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      await updateViolationStatus(violation.id, newStatus);
      setCurrentStatus(newStatus);
      if (onStatusUpdated) onStatusUpdated(violation.id, newStatus);
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusColors = {
    ACTIVE: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    REVIEWED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    DISMISSED: 'bg-slate-700/50 text-slate-400 border-slate-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Violation Snapshot Review</h3>
              <p className="text-xs text-slate-400">Violation Reference #{violation.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Snapshot Image with fallback */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[220px]">
            {violation.snapshot_url ? (
              <img
                src={violation.snapshot_url}
                alt="Violation Snapshot"
                className="w-full h-auto max-h-80 object-contain rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 p-8">
                <AlertTriangle size={36} className="text-amber-500 mb-2" />
                <p className="text-sm">Snapshot image captured without disk persistence</p>
              </div>
            )}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-xs font-mono text-white border border-white/10">
              {violation.violation_type.replace('_', ' ')}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Car size={14} className="text-blue-400" />
                <span>Vehicle Type</span>
              </div>
              <p className="font-semibold text-sm text-white">{violation.vehicle_type || 'Vehicle'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Hash size={14} className="text-indigo-400" />
                <span>License Plate</span>
              </div>
              <p className="font-semibold text-sm text-white font-mono">{violation.plate_number || 'Not Visible'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={14} className="text-emerald-400" />
                <span>Detected Timestamp</span>
              </div>
              <p className="font-semibold text-xs text-white">
                {violation.timestamp ? new Date(violation.timestamp).toLocaleString() : 'N/A'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <AlertTriangle size={14} className="text-rose-400" />
                <span>AI Confidence Score</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-white">{Math.round((violation.confidence || 0) * 100)}%</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Validated</span>
              </div>
            </div>
          </div>

          {violation.notes && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <FileText size={14} className="text-amber-400" />
                <span>Rule Engine Diagnostic</span>
              </div>
              <p className="text-xs text-slate-300">{violation.notes}</p>
            </div>
          )}

          {/* Status Actions */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusColors[currentStatus] || ''}`}>
                {currentStatus}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('REVIEWED')}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                Mark Reviewed
              </button>
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('DISMISSED')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
