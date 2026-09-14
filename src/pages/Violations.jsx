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
  ExternalLink,
  Trash2,
  CheckSquare,
  Square,
  Search,
  LayoutGrid,
  List,
  Check,
  X,
  Layers,
  FileText,
  AlertCircle,
  Download
} from 'lucide-react';
import {
  getViolations,
  deleteViolation,
  bulkDeleteViolations,
  clearAllViolations
} from '../services/api';
import ViolationModal from '../components/ViolationModal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

export default function Violations() {
  const [violations, setViolations] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);

  // Filters & Search
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Selection & Deletion states
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

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
      showToast("Failed to load violations history", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [filterType, filterStatus]);

  // Client filtering
  const filtered = violations.filter(v => {
    const term = search.toLowerCase();
    const matchSearch =
      v.violation_type?.toLowerCase().includes(term) ||
      v.vehicle_type?.toLowerCase().includes(term) ||
      String(v.id).includes(term) ||
      (v.plate_number && v.plate_number.toLowerCase().includes(term)) ||
      (v.notes && v.notes.toLowerCase().includes(term));
    return matchSearch;
  });

  // Selection handlers
  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = filtered.map(v => v.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const allSelected = filtered.length > 0 && filtered.every(v => selectedIds.includes(v.id));
  const someSelected = filtered.some(v => selectedIds.includes(v.id)) && !allSelected;

  // Single Delete Handler
  const handleConfirmSingleDelete = async () => {
    if (!deletingRecord) return;
    setIsDeletingSingle(true);
    try {
      await deleteViolation(deletingRecord.id);
      showToast(`Violation #${deletingRecord.id} permanently deleted.`);
      setSelectedIds(prev => prev.filter(id => id !== deletingRecord.id));
      setDeletingRecord(null);
      if (selectedViolation?.id === deletingRecord.id) setSelectedViolation(null);
      fetchViolations();
    } catch (err) {
      console.error("Failed to delete violation", err);
      showToast("Failed to delete violation", "error");
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Direct modal deletion callback
  const handleDirectDelete = async (id) => {
    try {
      await deleteViolation(id);
      showToast(`Violation #${id} deleted.`);
      setSelectedIds(prev => prev.filter(item => item !== id));
      fetchViolations();
    } catch (err) {
      console.error("Failed to delete violation", err);
      showToast("Failed to delete violation", "error");
      throw err;
    }
  };

  // Bulk Delete Handler
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await bulkDeleteViolations(selectedIds);
      showToast(`${res.data.deleted_count || selectedIds.length} violations deleted successfully.`);
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      fetchViolations();
    } catch (err) {
      console.error("Failed to bulk delete violations", err);
      showToast("Failed to delete selected violations", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Clear All Handler
  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      const params = {};
      if (filterType !== 'ALL') params.violation_type = filterType;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const res = await clearAllViolations(params);
      showToast(`Cleared ${res.data.deleted_count || 'all'} violation records.`);
      setSelectedIds([]);
      setShowClearAllModal(false);
      fetchViolations();
    } catch (err) {
      console.error("Failed to clear violations", err);
      showToast("Failed to clear violations", "error");
    } finally {
      setIsClearingAll(false);
    }
  };

  // KPI Calculations
  const activeCount = violations.filter(v => v.status === 'ACTIVE').length;
  const reviewedCount = violations.filter(v => v.status === 'REVIEWED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 m-0">Road Safety Violations & History</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Automated infraction logging, snapshot verification, and complete record management
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.location.href = '/api/export/violations'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-semibold border border-zinc-300 shadow-xs transition-colors"
            title="Download CSV export"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowClearAllModal(true)}
            disabled={violations.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors"
            title="Clear all violation logs"
          >
            <Trash2 size={13} />
            <span>Clear Violations</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-900 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-zinc-900 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title="Detailed Table View"
            >
              <List size={14} />
            </button>
          </div>

          <button
            onClick={fetchViolations}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200 shadow-xs transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="pro-card p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">Total Recorded</div>
            <div className="text-xl font-bold text-zinc-950 font-mono mt-0.5">{total}</div>
          </div>
          <div className="p-2 rounded-xl bg-zinc-100 text-zinc-600">
            <ShieldAlert size={16} />
          </div>
        </div>

        <div className="pro-card p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">Active Infractions</div>
            <div className="text-xl font-bold text-red-600 font-mono mt-0.5">{activeCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-red-50 text-red-600">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="pro-card p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">Reviewed / Handled</div>
            <div className="text-xl font-bold text-zinc-800 font-mono mt-0.5">{reviewedCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-zinc-100 text-zinc-600">
            <CheckCircle size={16} />
          </div>
        </div>

        <div className="pro-card p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">Selected For Deletion</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${selectedIds.length > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>
              {selectedIds.length}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-zinc-100 text-zinc-600">
            <CheckSquare size={16} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="pro-card p-3 rounded-xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search infractions by plate, vehicle, ID, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 shadow-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'NO_HELMET', 'MISSING_PLATE', 'UNREADABLE_PLATE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === cat
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200'
              }`}
            >
              {cat === 'ALL' ? 'All Infractions' : cat.replace(/_/g, ' ')}
            </button>
          ))}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-400 shadow-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="REVIEWED">Reviewed Only</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-white border border-zinc-300 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-900">
              {selectedIds.length} {selectedIds.length === 1 ? 'violation' : 'violations'} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <Trash2 size={13} />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE: GRID VIEW */}
      {viewMode === 'grid' && (
        <>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((v) => {
                const isSelected = selectedIds.includes(v.id);
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedViolation(v)}
                    className={`pro-card group rounded-2xl overflow-hidden hover:border-zinc-400 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected ? 'ring-2 ring-zinc-900 border-zinc-900' : ''
                    }`}
                  >
                    <div>
                      {/* Snapshot Thumbnail */}
                      <div className="relative h-44 bg-zinc-100 overflow-hidden flex items-center justify-center">
                        {v.snapshot_url ? (
                          <img
                            src={v.snapshot_url}
                            alt="Violation Evidence"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-zinc-400 flex flex-col items-center">
                            <AlertTriangle size={28} />
                            <span className="text-[11px] mt-1">Snapshot evidence</span>
                          </div>
                        )}

                        {/* Top-left: Selection checkbox */}
                        <div
                          className="absolute top-2.5 left-2.5 z-10 p-1 rounded-lg bg-white/90 backdrop-blur-md shadow-xs border border-zinc-200"
                          onClick={(e) => toggleSelect(v.id, e)}
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-zinc-950" />
                          ) : (
                            <Square size={16} className="text-zinc-400 hover:text-zinc-700" />
                          )}
                        </div>

                        {/* Infraction Type Badge */}
                        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-[10px] font-bold text-red-700 border border-red-200 shadow-xs">
                          {v.violation_type.replace(/_/g, ' ')}
                        </div>

                        {/* Status Indicator */}
                        <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          v.status === 'ACTIVE'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                        }`}>
                          {v.status}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 space-y-2 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-zinc-950">{v.vehicle_type}</span>
                          <span className="text-xs font-mono font-semibold text-zinc-500">
                            {Math.round((v.confidence || 0) * 100)}%
                          </span>
                        </div>

                        <div className="text-xs text-zinc-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500">Plate:</span>
                            <span className="font-mono text-zinc-950 font-semibold">
                              {v.plate_number || 'Missing'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-100">
                            <div className="flex items-center gap-1">
                              <Clock size={11} />
                              <span>{v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : 'N/A'}</span>
                            </div>
                            <span className="font-mono text-zinc-500">#{v.id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Inspect + Delete */}
                    <div className="px-3.5 py-2 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-zinc-600 group-hover:text-black font-semibold flex items-center gap-1">
                        <span>Inspect Evidence</span>
                        <ExternalLink size={12} />
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingRecord(v);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete violation log"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-500 rounded-2xl bg-white border border-zinc-200 flex flex-col items-center justify-center space-y-2 shadow-xs">
              <CheckCircle size={32} className="text-zinc-400" />
              <h4 className="text-sm font-bold text-zinc-900">No Violations Found</h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                No safety infractions found matching your current search or filter criteria.
              </p>
            </div>
          )}
        </>
      )}

      {/* VIEW MODE: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="pro-card rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-zinc-50 text-zinc-600 uppercase tracking-wider font-semibold border-b border-zinc-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:text-black transition-colors"
                      title="Select all"
                    >
                      {allSelected ? (
                        <CheckSquare size={16} className="text-black" />
                      ) : (
                        <Square size={16} className={someSelected ? "text-amber-500" : "text-zinc-400"} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Evidence</th>
                  <th className="px-4 py-3.5">Infraction</th>
                  <th className="px-4 py-3.5">Vehicle</th>
                  <th className="px-4 py-3.5">Plate Number</th>
                  <th className="px-4 py-3.5">Confidence</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800 bg-white">
                {filtered.length > 0 ? (
                  filtered.map((v) => {
                    const isSelected = selectedIds.includes(v.id);
                    return (
                      <tr
                        key={v.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-zinc-100/70' : 'hover:bg-zinc-50'
                        }`}
                        onClick={() => setSelectedViolation(v)}
                      >
                        <td className="px-4 py-3.5 text-center" onClick={(e) => toggleSelect(v.id, e)}>
                          <button className="p-1 hover:text-black transition-colors">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-black" />
                            ) : (
                              <Square size={16} className="text-zinc-400" />
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-zinc-500 font-semibold">
                          #{v.id}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="w-12 h-9 rounded-lg bg-zinc-100 overflow-hidden border border-zinc-200 flex items-center justify-center">
                            {v.snapshot_url ? (
                              <img src={v.snapshot_url} alt="Snap" className="w-full h-full object-cover" />
                            ) : (
                              <AlertTriangle size={12} className="text-zinc-400" />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            {v.violation_type.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-medium text-zinc-900">
                          {v.vehicle_type}
                        </td>

                        <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900">
                          {v.plate_number || 'N/A'}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-zinc-600">
                          {Math.round((v.confidence || 0) * 100)}%
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            v.status === 'ACTIVE'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}>
                            {v.status}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-zinc-500 text-[11px]">
                          {v.timestamp ? new Date(v.timestamp).toLocaleString() : 'N/A'}
                        </td>

                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedViolation(v)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
                              title="Inspect Details"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingRecord(v)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Violation"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-zinc-500">
                      No violations found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reusable Confirm Modals */}
      <ConfirmModal
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Violation Record"
        subtitle={deletingRecord ? `#${deletingRecord.id} • ${deletingRecord.violation_type.replace(/_/g, ' ')}` : ''}
        description="Are you sure you want to permanently delete this infraction evidence and audit record? This action cannot be undone."
        confirmText="Confirm Delete"
        confirmVariant="danger"
        isLoading={isDeletingSingle}
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Violations"
        subtitle={`${selectedIds.length} records selected`}
        description={`Are you sure you want to delete these ${selectedIds.length} selected violations? This bulk operation is permanent.`}
        confirmText={`Delete ${selectedIds.length} Violations`}
        confirmVariant="danger"
        isLoading={isBulkDeleting}
      />

      <ConfirmModal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        onConfirm={handleConfirmClearAll}
        title="Clear Violations History"
        subtitle="Database Purge Action"
        description={
          filterType !== 'ALL'
            ? `Are you sure you want to permanently clear all ${filterType.replace(/_/g, ' ')} records?`
            : "Are you sure you want to permanently clear the entire violations history? All recorded infractions will be erased."
        }
        confirmText="Yes, Purge Violations"
        confirmVariant="danger"
        isLoading={isClearingAll}
      />

      {/* Violation Inspection Modal */}
      {selectedViolation && (
        <ViolationModal
          violation={selectedViolation}
          onClose={() => setSelectedViolation(null)}
          onStatusUpdated={(id, status) => {
            setViolations(prev => prev.map(v => v.id === id ? { ...v, status } : v));
          }}
          onDelete={handleDirectDelete}
        />
      )}
    </div>
  );
}

