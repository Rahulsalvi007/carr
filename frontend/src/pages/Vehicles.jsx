import React, { useState, useEffect } from 'react';
import { Car, Bike, Zap, Search, Filter, RefreshCw, Clock, Hash, AlertTriangle } from 'lucide-react';
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
      (filterType === 'BIKE' && v.vehicle_type.toLowerCase().includes('motorcycle'));

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">Tracked Vehicles Registry</h1>
          <p className="text-sm text-slate-400 mt-1">
            Database of uniquely tracked vehicles with license plate history and power classification
          </p>
        </div>

        <button
          onClick={fetchVehicles}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh Database</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="cyber-card p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Plate Number, Track ID, or Vehicle Type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-500 hidden sm:block" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
          >
            <option value="ALL">All Categories</option>
            <option value="CAR">Cars Only</option>
            <option value="BIKE">Motorcycles / Bikes</option>
            <option value="EV">Electric Vehicles (EV)</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="cyber-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-blue-400">
                      #{v.track_id || v.id}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {v.vehicle_type.toLowerCase().includes('bike') || v.vehicle_type.toLowerCase().includes('motorcycle') ? (
                          <Bike size={16} className="text-emerald-400" />
                        ) : (
                          <Car size={16} className="text-blue-400" />
                        )}
                        <span className="font-semibold text-white">{v.vehicle_type}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {v.plate_number ? (
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-950 text-white font-bold border border-slate-700">
                          {v.plate_number}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Not detected</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        v.power_type === 'Electric'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : v.power_type === 'Conventional/Fuel'
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-slate-800/50 text-slate-500 border-slate-800'
                      }`}>
                        {v.power_type === 'Electric' && <Zap size={12} />}
                        {v.power_type}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono font-semibold">
                      {Math.round(v.confidence * 100)}%
                    </td>

                    <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                      {v.first_seen ? new Date(v.first_seen).toLocaleTimeString() : 'N/A'}
                    </td>

                    <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                      {v.last_seen ? new Date(v.last_seen).toLocaleTimeString() : 'N/A'}
                    </td>

                    <td className="px-5 py-4">
                      {v.violations_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          <AlertTriangle size={12} />
                          <span>{v.violations_count}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[11px]">Clean</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
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
