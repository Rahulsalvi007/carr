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
    ACTIVE: 'bg-red-950/40 text-red-400 border-red-900/50',
    REVIEWED: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    DISMISSED: 'bg-zinc-900 text-zinc-500 border-zinc-800',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-900 text-white border border-zinc-800">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Violation Snapshot Review</h3>
              <p className="text-xs text-zinc-400">Reference #{violation.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Snapshot Image with fallback */}
          <div className="relative rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center min-h-[220px]">
            {violation.snapshot_url ? (
              <img
                src={violation.snapshot_url}
                alt="Violation Snapshot"
                className="w-full h-auto max-h-80 object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500 p-8">
                <AlertTriangle size={32} className="text-zinc-600 mb-2" />
                <p className="text-xs">Snapshot image captured without disk persistence</p>
              </div>
            )}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-xs font-mono text-white border border-zinc-700">
              {violation.violation_type.replace('_', ' ')}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Car size={14} className="text-zinc-400" />
                <span>Vehicle Type</span>
              </div>
              <p className="font-medium text-xs text-white">{violation.vehicle_type || 'Vehicle'}</p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Hash size={14} className="text-zinc-400" />
                <span>License Plate</span>
              </div>
              <p className="font-medium text-xs text-white font-mono">{violation.plate_number || 'Not Visible'}</p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock size={14} className="text-zinc-400" />
                <span>Detected Timestamp</span>
              </div>
              <p className="font-medium text-xs text-white">
                {violation.timestamp ? new Date(violation.timestamp).toLocaleString() : 'N/A'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <AlertTriangle size={14} className="text-zinc-400" />
                <span>AI Confidence Score</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-xs text-white">{Math.round((violation.confidence || 0) * 100)}%</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">Verified</span>
              </div>
            </div>
          </div>

          {violation.notes && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <FileText size={14} className="text-zinc-400" />
                <span>Rule Engine Diagnostic</span>
              </div>
              <p className="text-xs text-zinc-300">{violation.notes}</p>
            </div>
          )}

          {/* Status Actions */}
          <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium">Status:</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusColors[currentStatus] || ''}`}>
                {currentStatus}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('REVIEWED')}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
              >
                Mark Reviewed
              </button>
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('DISMISSED')}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800 disabled:opacity-50 transition-colors"
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
