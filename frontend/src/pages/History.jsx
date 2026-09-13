import React, { useState, useEffect } from 'react';
import {
  Download,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Car,
  Bike,
  ShieldCheck,
  ShieldAlert,
  Zap,
  ArrowUpDown
} from 'lucide-react';
import { getDetectionsHistory, getVehicles } from '../services/api';

export default function History() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, filterVehicle]);

  // Export CSV Functionality
  const exportToCSV = () => {
    if (records.length === 0) return;
    const headers = ["ID", "Vehicle Type", "Confidence", "Timestamp", "Source", "Bounding Box"];
    const rows = records.map(r => [
      r.id,
      r.vehicle_type,
      `${Math.round(r.confidence * 100)}%`,
      r.timestamp,
      r.source_type,
      `"${r.bbox}"`
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

  const filtered = records.filter(r =>
    r.vehicle_type.toLowerCase().includes(search.toLowerCase()) ||
    String(r.id).includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">Detection Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">Complete chronological audit logs of all detected vehicles and events</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            disabled={records.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
          >
            <Download size={15} />
            <span>Export CSV Report</span>
          </button>

          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="cyber-card p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search logs by vehicle type or record ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-500 hidden sm:block" />
          <select
            value={filterVehicle}
            onChange={(e) => { setFilterVehicle(e.target.value); setPage(1); }}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="Car">Cars</option>
            <option value="Motorcycle">Motorcycles</option>
            <option value="Bus">Buses</option>
            <option value="Truck">Trucks</option>
          </select>
        </div>
      </div>

      {/* Detections Table */}
      <div className="cyber-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Log ID</th>
                <th className="px-5 py-3.5">Vehicle Type</th>
                <th className="px-5 py-3.5">AI Confidence</th>
                <th className="px-5 py-3.5">Bounding Box Coordinates</th>
                <th className="px-5 py-3.5">Source Feed</th>
                <th className="px-5 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filtered.length > 0 ? (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400">
                      #{r.id}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {r.vehicle_type.toLowerCase().includes('motorcycle') || r.vehicle_type.toLowerCase().includes('bicycle') ? (
                          <Bike size={16} className="text-emerald-400" />
                        ) : (
                          <Car size={16} className="text-blue-400" />
                        )}
                        <span className="font-semibold text-white">{r.vehicle_type}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.round(r.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold">{Math.round(r.confidence * 100)}%</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-400 text-[11px]">
                      {r.bbox || 'N/A'}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {r.source_type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-400 text-[11px]">
                      {r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No detection audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {records.length} of {total} total detections</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="font-mono px-2 text-white">Page {page}</span>
            <button
              disabled={records.length < pageSize}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
