'use client';

import { useState, useEffect } from 'react';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ZoneReading {
  value: number;
  unit: string;
  status: string;
  aqiLabel?: string;
}

interface ZoneEnvStatus {
  id: string;
  name: string;
  floorId: string;
  floorName: string;
  status: 'normal' | 'warning' | 'critical';
  readings: {
    temperature?: ZoneReading;
    humidity?: ZoneReading;
    co2?: ZoneReading;
  };
  sensorCount: number;
  lastUpdated?: string | null;
}

export default function EnvironmentPage() {
  const [zones, setZones] = useState<ZoneEnvStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    api.get<{ data: ZoneEnvStatus[] }>('/zones/environmental')
      .then((res) => setZones(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading environmental data..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;

  const statusCounts = {
    all: zones.length,
    normal: zones.filter((z) => z.status === 'normal').length,
    warning: zones.filter((z) => z.status === 'warning').length,
    critical: zones.filter((z) => z.status === 'critical').length,
  };

  const filteredZones = filterStatus === 'all' ? zones : zones.filter((z) => z.status === filterStatus);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Environmental Quality</h1>
        <p className="text-sm text-slate-400 mt-1">Monitor temperature, humidity and air quality across zones</p>
      </div>

      {/* Status summary bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['all', 'normal', 'warning', 'critical'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
              filterStatus === status
                ? status === 'all'
                  ? 'bg-blue-500 text-white'
                  : status === 'normal'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : status === 'warning'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="text-xs opacity-70">({statusCounts[status]})</span>
          </button>
        ))}
      </div>

      {/* Zone cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredZones.length === 0 ? (
          <div className="col-span-full card text-center py-8">
            <p className="text-sm text-slate-500">No zones match the selected filter</p>
          </div>
        ) : (
          filteredZones.map((zone) => (
            <div key={zone.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-200">{zone.name}</h3>
                  <p className="text-[10px] text-slate-500">{zone.floorName}</p>
                </div>
                <StatusBadge variant={zone.status} dot />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Temperature */}
                <div className="flex flex-col items-center gap-1 p-2 bg-slate-700/50 rounded-lg">
                  <Thermometer className={`h-4 w-4 ${
                    zone.readings.temperature?.status === 'normal' ? 'text-green-400' :
                    zone.readings.temperature?.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                  <span className="text-lg font-semibold text-slate-100">
                    {zone.readings.temperature?.value !== undefined ? `${zone.readings.temperature.value}°` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">Temp</span>
                </div>

                {/* Humidity */}
                <div className="flex flex-col items-center gap-1 p-2 bg-slate-700/50 rounded-lg">
                  <Droplets className={`h-4 w-4 ${
                    zone.readings.humidity?.status === 'normal' ? 'text-green-400' :
                    zone.readings.humidity?.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                  <span className="text-lg font-semibold text-slate-100">
                    {zone.readings.humidity?.value !== undefined ? `${zone.readings.humidity.value}%` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">Humidity</span>
                </div>

                {/* CO2 */}
                <div className="flex flex-col items-center gap-1 p-2 bg-slate-700/50 rounded-lg">
                  <Wind className={`h-4 w-4 ${
                    zone.readings.co2?.status === 'normal' ? 'text-green-400' :
                    zone.readings.co2?.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                  <span className="text-lg font-semibold text-slate-100">
                    {zone.readings.co2?.value !== undefined ? zone.readings.co2.value : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {zone.readings.co2?.aqiLabel ?? 'CO₂ ppm'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                <span className="text-[10px] text-slate-500">{zone.sensorCount} sensors</span>
                {zone.lastUpdated && (
                  <span className="text-[10px] text-slate-500">
                    Updated {new Date(zone.lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
