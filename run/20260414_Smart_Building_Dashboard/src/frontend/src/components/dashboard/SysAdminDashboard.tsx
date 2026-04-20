'use client';

import { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, AlertTriangle, Wrench, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface OpsData {
  sensorStatus: { total: number; online: number; offline: number; stale: number };
  alertSummary: { critical: number; warning: number; info: number; activeTotal: number };
  equipmentHealth: { green: number; yellow: number; red: number };
  recentEvents: Array<{ type: string; message: string; severity: string; timestamp: string }>;
  lastDataIngestion: string | null;
}

export default function SysAdminDashboard() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: OpsData }>('/dashboard/operations')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading operations dashboard..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;
  if (!data) return null;

  const sensorOnlinePercent = data.sensorStatus.total > 0
    ? Math.round((data.sensorStatus.online / data.sensorStatus.total) * 100)
    : 0;

  const equipmentTotal = data.equipmentHealth.green + data.equipmentHealth.yellow + data.equipmentHealth.red;

  const equipmentChart = [
    { name: 'Healthy', value: data.equipmentHealth.green, color: '#22c55e' },
    { name: 'Warning', value: data.equipmentHealth.yellow, color: '#eab308' },
    { name: 'Critical', value: data.equipmentHealth.red, color: '#ef4444' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Sensors Online"
          value={`${sensorOnlinePercent}%`}
          icon={Wifi}
          subtitle={`${data.sensorStatus.online} of ${data.sensorStatus.total}`}
        />
        <KpiCard
          title="Sensors Offline"
          value={data.sensorStatus.offline}
          icon={WifiOff}
          subtitle={`${data.sensorStatus.stale} stale`}
        />
        <KpiCard
          title="Active Alerts"
          value={data.alertSummary.activeTotal}
          icon={AlertTriangle}
          subtitle={`${data.alertSummary.critical} critical`}
        />
        <KpiCard
          title="Equipment"
          value={equipmentTotal}
          icon={Wrench}
          subtitle={`${data.equipmentHealth.red} need attention`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Equipment Health Chart */}
        <div className="card">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Equipment Health</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equipmentChart} layout="vertical">
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {equipmentChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert breakdown */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <StatusBadge variant="critical" label={`${data.alertSummary.critical} Critical`} dot />
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="warning" label={`${data.alertSummary.warning} Warning`} dot />
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="info" label={`${data.alertSummary.info} Info`} dot />
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">Recent Events</h3>
            {data.lastDataIngestion && (
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock className="h-3 w-3" />
                Last data: {new Date(data.lastDataIngestion).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {data.recentEvents.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No recent events</p>
            ) : (
              data.recentEvents.map((event, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-slate-700/50 rounded-lg">
                  <StatusBadge variant={event.severity as 'critical' | 'warning' | 'info'} dot />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300">{event.message}</p>
                    <p className="text-[10px] text-slate-500">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
