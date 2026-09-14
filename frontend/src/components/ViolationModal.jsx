import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, ShieldAlert, Car, Hash, FileText, Trash2 } from 'lucide-react';
import { updateViolationStatus } from '../services/api';

export default function ViolationModal({ violation, onClose, onStatusUpdated, onDelete }) {
  const [currentStatus, setCurrentStatus] = useState(violation?.status || 'ACTIVE');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(violation.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete violation", err);
      setIsDeleting(false);
    }
  };

  const statusColors = {
    ACTIVE: 'bg-red-50 text-red-700 border-red-200 font-semibold',
    REVIEWED: 'bg-zinc-100 text-zinc-800 border-zinc-300 font-medium',
    DISMISSED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black text-white shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Violation Snapshot Review</h3>
              <p className="text-xs text-zinc-500 font-mono">Reference #{violation.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Snapshot Image with fallback */}
          <div className="relative rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center min-h-[160px] sm:min-h-[220px]">
            {violation.snapshot_url ? (
              <img
                src={violation.snapshot_url}
                alt="Violation Snapshot"
                className="w-full h-auto max-h-80 object-contain rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400 p-8">
                <AlertTriangle size={32} className="text-zinc-400 mb-2" />
                <p className="text-xs">Snapshot image captured without disk persistence</p>
              </div>
            )}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md text-xs font-mono text-zinc-900 border border-zinc-200 shadow-xs font-semibold">
              {violation.violation_type.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <Car size={14} className="text-zinc-500" />
                <span>Vehicle Type</span>
              </div>
              <p className="font-semibold text-xs text-zinc-900">{violation.vehicle_type || 'Vehicle'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <Hash size={14} className="text-zinc-500" />
                <span>License Plate</span>
              </div>
              <p className="font-semibold text-xs text-zinc-900 font-mono">{violation.plate_number || 'Not Visible'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <Clock size={14} className="text-zinc-500" />
                <span>Detected Timestamp</span>
              </div>
              <p className="font-semibold text-xs text-zinc-900">
                {violation.timestamp ? new Date(violation.timestamp).toLocaleString() : 'N/A'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <AlertTriangle size={14} className="text-zinc-500" />
                <span>AI Confidence Score</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-xs text-zinc-900">{Math.round((violation.confidence || 0) * 100)}%</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-semibold">Verified</span>
              </div>
            </div>
          </div>

          {violation.notes && (
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <FileText size={14} className="text-zinc-500" />
                <span>Diagnostic Notes</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">{violation.notes}</p>
            </div>
          )}

          {/* Delete Confirmation Warning Inline */}
          {isConfirmingDelete ? (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2 animate-in fade-in duration-150">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-red-600 shrink-0" />
                <span>Delete this violation record permanently?</span>
              </div>
              <p className="text-[11px] text-red-700">
                This will delete the snapshot record #{violation.id} from the database. This action cannot be reversed.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Record'}
                </button>
              </div>
            </div>
          ) : (
            /* Status Actions & Deletion Footer */
            <div className="pt-3 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 text-xs font-semibold transition-colors"
                  title="Delete this violation log"
                >
                  <Trash2 size={13} />
                  <span>Delete Record</span>
                </button>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-xs text-zinc-500 font-medium">Status:</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusColors[currentStatus] || ''}`}>
                    {currentStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('REVIEWED')}
                  className="px-3.5 py-1.5 rounded-lg bg-black hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  Mark Reviewed
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('DISMISSED')}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium border border-zinc-200 disabled:opacity-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
