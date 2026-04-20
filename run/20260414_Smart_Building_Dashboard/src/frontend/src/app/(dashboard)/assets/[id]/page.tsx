'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Activity, Clock, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface EquipmentDetail {
  id: string;
  name: string;
  type: string;
  serialNumber?: string | null;
  healthStatus: 'green' | 'yellow' | 'red';
  isActive: boolean;
  installDate?: string | null;
  warrantyExpiry?: string | null;
  location: {
    buildingId: string;
    buildingName: string;
    floorId?: string | null;
    floorName?: string | null;
    zoneId?: string | null;
    zoneName?: string | null;
  };
  sensors?: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    lastValue?: number;
    unit?: string;
  }>;
  metrics?: Array<{
    metricType: string;
    value: number;
    time: string;
  }>;
  recentAlerts?: Array<{
    id: string;
    severity: string;
    message: string;
    status: string;
    triggeredAt: string;
  }>;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id) return;
    api.get<{ data: EquipmentDetail }>(`/equipment/${params.id}`)
      .then((res) => setAsset(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading asset details..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;
  if (!asset) return <div className="card text-slate-400 text-center py-8">Asset not found</div>;

  const locationStr = [asset.location.buildingName, asset.location.floorName, asset.location.zoneName]
    .filter(Boolean)
    .join(' › ');

  const chartData = (asset.metrics ?? []).map((m) => ({
    time: new Date(m.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: m.value,
    type: m.metricType,
  }));

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assets
      </button>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-700 rounded-xl">
              <Wrench className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-50">{asset.name}</h1>
              <p className="text-sm text-slate-400 capitalize">{asset.type.replace(/_/g, ' ')}</p>
              {asset.serialNumber && (
                <p className="text-xs text-slate-500 font-mono mt-1">S/N: {asset.serialNumber}</p>
              )}
            </div>
          </div>
          <StatusBadge variant={asset.healthStatus} dot className="text-sm" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[10px] text-slate-500">Location</p>
              <p className="text-xs text-slate-300">{locationStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[10px] text-slate-500">Status</p>
              <p className="text-xs text-slate-300">{asset.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
          {asset.installDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-[10px] text-slate-500">Installed</p>
                <p className="text-xs text-slate-300">{new Date(asset.installDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          {asset.warrantyExpiry && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-[10px] text-slate-500">Warranty</p>
                <p className="text-xs text-slate-300">{new Date(asset.warrantyExpiry).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sensors */}
        <div className="card">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Connected Sensors</h3>
          {(!asset.sensors || asset.sensors.length === 0) ? (
            <p className="text-sm text-slate-500 text-center py-4">No sensors connected</p>
          ) : (
            <div className="flex flex-col gap-2">
              {asset.sensors.map((sensor) => (
                <div key={sensor.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-200">{sensor.name}</p>
                    <p className="text-[10px] text-slate-500">{sensor.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sensor.lastValue !== undefined && (
                      <span className="text-sm font-medium text-slate-200">
                        {sensor.lastValue} {sensor.unit}
                      </span>
                    )}
                    <StatusBadge variant={sensor.status as 'online' | 'offline' | 'stale'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metrics chart */}
        <div className="card">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Metrics History</h3>
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No metrics data available</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Recent Alerts</h3>
          {(!asset.recentAlerts || asset.recentAlerts.length === 0) ? (
            <p className="text-sm text-slate-500 text-center py-4">No recent alerts for this asset</p>
          ) : (
            <div className="flex flex-col gap-2">
              {asset.recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <StatusBadge variant={alert.severity as 'critical' | 'warning' | 'info'} dot />
                    <div>
                      <p className="text-sm text-slate-200">{alert.message}</p>
                      <p className="text-[10px] text-slate-500">{new Date(alert.triggeredAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <StatusBadge variant={alert.status as 'active' | 'acknowledged' | 'resolved'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
