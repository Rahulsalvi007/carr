import React, { useState, useEffect } from 'react';
import { Car, Bike, Zap, Search, Filter, RefreshCw, Clock, Hash, AlertTriangle, Download } from 'lucide-react';
import { getVehicles } from '../services/api';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await getVehicles({ limit: 100 });
      setVehicles(res.data.vehicles || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching vehicles", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch =
      (v.plate_number && v.plate_number.toLowerCase().includes(search.toLowerCase())) ||
      v.vehicle_type.toLowerCase().includes(search.toLowerCase()) ||
      (v.track_id && String(v.track_id).includes(search));

    const matchesType =
      filterType === 'ALL' ||
      (filterType === 'EV' && v.power_type === 'Electric') ||
      (filterType === 'CAR' && v.vehicle_type.toLowerCase().includes('car')) ||
      (filterType === 'BIKE' && (v.vehicle_type.toLowerCase().includes('motorcycle') || v.vehicle_type.toLowerCase().includes('bike')));

    return matchesSearch && matchesType;
  });

  const evCount = vehicles.filter(v => v.power_type === 'Electric').length;
  const bikeCount = vehicles.filter(v => v.vehicle_type.toLowerCase().includes('motorcycle') || v.vehicle_type.toLowerCase().includes('bike')).length;
  const carCount = vehicles.filter(v => v.vehicle_type.toLowerCase().includes('car')).length;

  const handleExportCsv = () => {
    window.location.href = '/api/export/vehicles';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 m-0">Tracked Vehicles Registry</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Database of uniquely tracked vehicles with license plate history and power classification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-semibold border border-zinc-300 shadow-xs transition-colors"
            title="Download CSV export"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchVehicles}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterType('ALL')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'ALL'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
              : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
          }`}
        >
          <span className="text-[11px] block font-medium opacity-70">Total Monitored</span>
          <span className="text-xl font-bold font-mono mt-0.5 block">{vehicles.length}</span>
        </button>

        <button
          onClick={() => setFilterType('EV')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'EV'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
              : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-70">
            <Zap size={13} className="text-emerald-500" />
            <span>Electric (EV)</span>
          </div>
          <span className="text-xl font-bold font-mono mt-0.5 block">{evCount}</span>
        </button>

        <button
          onClick={() => setFilterType('CAR')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'CAR'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
              : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-70">
            <Car size={13} />
            <span>Cars</span>
          </div>
          <span className="text-xl font-bold font-mono mt-0.5 block">{carCount}</span>
        </button>

        <button
          onClick={() => setFilterType('BIKE')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'BIKE'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
              : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-70">
            <Bike size={13} />
            <span>Motorcycles</span>
          </div>
          <span className="text-xl font-bold font-mono mt-0.5 block">{bikeCount}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="pro-card p-3 rounded-xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by Plate Number, Track ID, or Vehicle Type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-zinc-400 hidden sm:block" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 font-medium focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 w-full sm:w-auto"
          >
            <option value="ALL">All Categories</option>
            <option value="CAR">Cars Only</option>
            <option value="BIKE">Motorcycles / Bikes</option>
            <option value="EV">Electric Vehicles (EV)</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="pro-card rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-zinc-50 text-zinc-600 uppercase tracking-wider font-semibold border-b border-zinc-200 text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Track ID</th>
                <th className="px-5 py-3.5">Vehicle Type</th>
                <th className="px-5 py-3.5">License Plate</th>
                <th className="px-5 py-3.5">Power Classification</th>
                <th className="px-5 py-3.5">Confidence</th>
                <th className="px-5 py-3.5">First Seen</th>
                <th className="px-5 py-3.5">Last Seen</th>
                <th className="px-5 py-3.5">Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-950">
                      #{v.track_id || v.id}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {v.vehicle_type.toLowerCase().includes('bike') || v.vehicle_type.toLowerCase().includes('motorcycle') ? (
                          <Bike size={15} className="text-zinc-700" />
                        ) : (
                          <Car size={15} className="text-zinc-700" />
                        )}
                        <span className="font-semibold text-zinc-900">{v.vehicle_type}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {v.plate_number ? (
                        <span className="font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-950 font-bold border border-zinc-300">
                          {v.plate_number}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">Not detected</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        v.power_type === 'Electric'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : v.power_type === 'Conventional/Fuel'
                          ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                      }`}>
                        {v.power_type === 'Electric' && <Zap size={11} />}
                        {v.power_type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-zinc-700 font-medium">
                      {Math.round(v.confidence * 100)}%
                    </td>

                    <td className="px-5 py-3.5 text-zinc-600 font-mono text-[11px]">
                      {v.first_seen ? new Date(v.first_seen).toLocaleTimeString() : 'N/A'}
                    </td>

                    <td className="px-5 py-3.5 text-zinc-600 font-mono text-[11px]">
                      {v.last_seen ? new Date(v.last_seen).toLocaleTimeString() : 'N/A'}
                    </td>

                    <td className="px-5 py-3.5">
                      {v.violations_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle size={11} />
                          <span>{v.violations_count}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-medium text-[11px]">Clean</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-500">
                    No vehicles found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
