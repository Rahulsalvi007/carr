import React, { useState, useEffect } from 'react';
import {
  Download,
  Search,
  Filter,
  RefreshCw,
  Car,
  Bike,
  Truck,
  Bus,
  FileText,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  Save,
  Check,
  ShieldCheck,
  Layers,
  Database,
  Sliders,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  getDetectionsHistory,
  updateDetection,
  deleteDetection,
  bulkDeleteDetections,
  clearAllDetections
} from '../services/api';

export default function History() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Edit Modal state
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    vehicle_type: '',
    confidence: 0.8,
    source_type: 'image',
    notes: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Modals state
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (filterVehicle !== 'ALL') params.vehicle_type = filterVehicle;

      const res = await getDetectionsHistory(params);
      setRecords(res.data.detections || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error loading history", err);
      showToast("Failed to load detection logs", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, filterVehicle]);

  // Handle single row selection toggle
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Handle Select All on current page
  const toggleSelectAll = () => {
    const pageIds = filtered.map(r => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setEditFormData({
      vehicle_type: record.vehicle_type || 'Car',
      confidence: record.confidence != null ? Math.round(record.confidence * 100) : 85,
      source_type: record.source_type || 'image',
      notes: record.notes || ''
    });
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSubmittingEdit(true);
    try {
      await updateDetection(editingRecord.id, {
        vehicle_type: editFormData.vehicle_type,
        confidence: editFormData.confidence / 100.0,
        source_type: editFormData.source_type,
        notes: editFormData.notes
      });
      showToast(`Record #${editingRecord.id} updated successfully!`);
      setEditingRecord(null);
      fetchRecords();
    } catch (err) {
      console.error("Error updating detection", err);
      showToast("Failed to update detection record", "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Confirm Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);
    try {
      await deleteDetection(deletingRecord.id);
      showToast(`Record #${deletingRecord.id} permanently deleted.`);
      setSelectedIds(prev => prev.filter(id => id !== deletingRecord.id));
      setDeletingRecord(null);
      fetchRecords();
    } catch (err) {
      console.error("Error deleting detection", err);
      showToast("Failed to delete record", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirm Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await bulkDeleteDetections(selectedIds);
      showToast(`${res.data.deleted_count || selectedIds.length} records deleted successfully.`);
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      fetchRecords();
    } catch (err) {
      console.error("Error bulk deleting", err);
      showToast("Failed to delete selected records", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Confirm Clear All
  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      const params = {};
      if (filterVehicle !== 'ALL') params.vehicle_type = filterVehicle;
      const res = await clearAllDetections(params);
      showToast(`Cleared ${res.data.deleted_count || 'all'} detection records.`);
      setSelectedIds([]);
      setShowClearAllModal(false);
      setPage(1);
      fetchRecords();
    } catch (err) {
      console.error("Error clearing logs", err);
      showToast("Failed to clear detection history", "error");
    } finally {
      setIsClearingAll(false);
    }
  };

  // Export CSV
  const exportToCSV = () => {
    if (records.length === 0) return;
    const headers = ["ID", "Vehicle Type", "Confidence", "Source", "Notes", "Timestamp", "Bounding Box"];
    const rows = records.map(r => [
      r.id,
      r.vehicle_type,
      `${Math.round((r.confidence || 0) * 100)}%`,
      r.source_type,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      r.timestamp,
      `"${(r.bbox || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `traffic_detections_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side filtering for search and source
  const filtered = records.filter(r => {
    const term = search.toLowerCase();
    const matchSearch =
      r.vehicle_type?.toLowerCase().includes(term) ||
      String(r.id).includes(term) ||
      (r.notes && r.notes.toLowerCase().includes(term)) ||
      (r.source_type && r.source_type.toLowerCase().includes(term));

    const matchSource = filterSource === 'ALL' || r.source_type === filterSource;
    return matchSearch && matchSource;
  });

  const allOnPageSelected = filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id));
  const someOnPageSelected = filtered.some(r => selectedIds.includes(r.id)) && !allOnPageSelected;

  const getVehicleIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('motorcycle') || t.includes('bike')) return <Bike size={15} className="text-zinc-300" />;
    if (t.includes('truck')) return <Truck size={15} className="text-zinc-300" />;
    if (t.includes('bus')) return <Bus size={15} className="text-zinc-300" />;
    return <Car size={15} className="text-zinc-300" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl bg-zinc-900 border-zinc-700 text-white animate-in slide-in-from-bottom-5 duration-200">
          {toast.type === 'error' ? (
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
          ) : (
            <Check size={18} className="text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-zinc-400 hover:text-white ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Detection Audit Trail & History</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage, review, edit, and clean vehicle detection records and audit notes
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowClearAllModal(true)}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 text-xs font-semibold shadow-sm disabled:opacity-40 transition-all"
            title="Clear all detection logs"
          >
            <Trash2 size={13} />
            <span>Clear Logs</span>
          </button>

          <button
            onClick={exportToCSV}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-sm disabled:opacity-50 transition-all"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="pro-card p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Total In Database</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{total}</div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800">
            <Database size={16} />
          </div>
        </div>

        <div className="pro-card p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Loaded On Page</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{filtered.length}</div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800">
            <Layers size={16} />
          </div>
        </div>

        <div className="pro-card p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Selected For Bulk</div>
            <div className={`text-lg font-bold font-mono mt-0.5 ${selectedIds.length > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {selectedIds.length}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800">
            <CheckSquare size={16} />
          </div>
        </div>

        <div className="pro-card p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Active Type Filter</div>
            <div className="text-sm font-semibold text-zinc-200 mt-1 capitalize truncate max-w-[100px]">
              {filterVehicle}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800">
            <Sliders size={16} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="pro-card p-3 rounded-xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search logs by ID, vehicle type, source, or audit notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Filter size={15} className="text-zinc-500 hidden sm:block" />
          <select
            value={filterVehicle}
            onChange={(e) => { setFilterVehicle(e.target.value); setPage(1); }}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 flex-1 sm:flex-none"
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="Car">Cars</option>
            <option value="Motorcycle">Motorcycles</option>
            <option value="Bus">Buses</option>
            <option value="Truck">Trucks</option>
            <option value="Bicycle">Bicycles</option>
            <option value="Person">Persons</option>
          </select>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 flex-1 sm:flex-none"
          >
            <option value="ALL">All Sources</option>
            <option value="image">Image Upload</option>
            <option value="video">Video Processing</option>
            <option value="camera">Local Webcam</option>
            <option value="mobile_camera">Mobile Stream</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Selection Action Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-white">
              {selectedIds.length} {selectedIds.length === 1 ? 'record' : 'records'} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-semibold transition-all border border-red-700/60"
            >
              <Trash2 size={13} />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Detections Table */}
      <div className="pro-card rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800 text-[11px]">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:text-white transition-colors"
                    title="Select all on page"
                  >
                    {allOnPageSelected ? (
                      <CheckSquare size={16} className="text-white" />
                    ) : (
                      <Square size={16} className={someOnPageSelected ? "text-amber-400" : "text-zinc-600"} />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">Log ID</th>
                <th className="px-4 py-3.5">Vehicle Type</th>
                <th className="px-4 py-3.5">Confidence</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5">Audit Notes</th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
              {filtered.length > 0 ? (
                filtered.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${isSelected ? 'bg-zinc-800/30' : 'hover:bg-zinc-900/40'}`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => toggleSelect(r.id)}
                          className="p-1 hover:text-white transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-white" />
                          ) : (
                            <Square size={16} className="text-zinc-600" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-zinc-400">
                        #{r.id}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {getVehicleIcon(r.vehicle_type)}
                          <span className="font-medium text-white">{r.vehicle_type}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-white h-1.5 rounded-full"
                              style={{ width: `${Math.round((r.confidence || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-zinc-400">{Math.round((r.confidence || 0) * 100)}%</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                          {r.source_type || 'image'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 max-w-[200px]">
                        {r.notes ? (
                          <div className="flex items-center gap-1.5 text-zinc-300 truncate" title={r.notes}>
                            <FileText size={12} className="text-zinc-400 shrink-0" />
                            <span className="truncate text-[11px]">{r.notes}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px] italic">No notes</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-zinc-500 text-[11px]">
                        {r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="Edit Record"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingRecord(r)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                            title="Delete Record"
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
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-500">
                    No detection audit records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Showing {records.length} of {total} total detections</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <span className="font-mono px-2 text-white">Page {page}</span>
            <button
              disabled={records.length < pageSize}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* EDIT DETECTION MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-zinc-900 text-white border border-zinc-800">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Edit Detection Record</h3>
                  <p className="text-xs text-zinc-400">Reference ID #{editingRecord.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">Vehicle / Object Type</label>
                <select
                  value={editFormData.vehicle_type}
                  onChange={(e) => setEditFormData({ ...editFormData, vehicle_type: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
                >
                  <option value="Car">Car</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Bus">Bus</option>
                  <option value="Truck">Truck</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Person">Person</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Confidence */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-medium">Confidence Score</label>
                  <span className="font-mono text-zinc-400">{editFormData.confidence}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={editFormData.confidence}
                  onChange={(e) => setEditFormData({ ...editFormData, confidence: Number(e.target.value) })}
                  className="w-full accent-white bg-zinc-950 cursor-pointer"
                />
              </div>

              {/* Source Type */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">Capture Source</label>
                <select
                  value={editFormData.source_type}
                  onChange={(e) => setEditFormData({ ...editFormData, source_type: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
                >
                  <option value="image">image (Static Image Upload)</option>
                  <option value="video">video (Video Stream Upload)</option>
                  <option value="camera">camera (Local Webcam)</option>
                  <option value="mobile_camera">mobile_camera (Remote Mobile Stream)</option>
                </select>
              </div>

              {/* Audit Notes */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">Audit & Verification Notes</label>
                <textarea
                  rows={3}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Add administrative notes, plate verification notes, or reason for update..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSubmittingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-950/60 text-red-400 border border-red-900/50">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Delete Detection Record</h3>
                  <p className="text-xs text-zinc-400">Record #{deletingRecord.id} • {deletingRecord.vehicle_type}</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete this detection log? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingRecord(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmSingleDelete}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-950/60 text-red-400 border border-red-900/50">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Delete Selected Records</h3>
                  <p className="text-xs text-zinc-400">{selectedIds.length} records selected</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Are you sure you want to delete these <strong className="text-white">{selectedIds.length}</strong> selected records? This bulk operation is irreversible.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={handleConfirmBulkDelete}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>{isBulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Records`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL LOGS CONFIRMATION MODAL */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-950/60 text-red-400 border border-red-900/50">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Clear All Detection History</h3>
                  <p className="text-xs text-zinc-400">Database Purge Operation</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {filterVehicle !== 'ALL' ? (
                  <>Are you sure you want to delete all <strong className="text-white">{filterVehicle}</strong> detection records from the system?</>
                ) : (
                  <>Are you sure you want to permanently clear the <strong className="text-white">entire detection history</strong>? All logs and audit notes will be permanently removed.</>
                )}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isClearingAll}
                  onClick={handleConfirmClearAll}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>{isClearingAll ? 'Clearing...' : 'Yes, Purge History'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
