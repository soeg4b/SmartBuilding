'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingDown, Thermometer, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ExecutiveData {
  energyCostToday: { value: number; currency: string };
  billingProjection: {
    projectedMonthly: number;
    lastMonthActual: number;
    variancePercent: number;
    currency: string;
  };
  energyTrend7d: Array<{ date: string; kwh: number }>;
  topAnomalies: Array<{ id: string; message: string; severity: string; timestamp: string }>;
  comfortOverview: { zonesNormal: number; zonesWarning: number; zonesCritical: number };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: ExecutiveData }>('/dashboard/executive')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading executive dashboard..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;
  if (!data) return null;

  const totalZones = data.comfortOverview.zonesNormal + data.comfortOverview.zonesWarning + data.comfortOverview.zonesCritical;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Energy Cost Today"
          value={formatCurrency(data.energyCostToday.value)}
          icon={DollarSign}
          subtitle="IDR"
        />
        <KpiCard
          title="Monthly Projection"
          value={formatCurrency(data.billingProjection.projectedMonthly)}
          icon={TrendingDown}
          trend={{ value: data.billingProjection.variancePercent }}
          subtitle="vs last month"
        />
        <KpiCard
          title="Comfort Zones"
          value={`${data.comfortOverview.zonesNormal}/${totalZones}`}
          icon={Thermometer}
          subtitle="zones normal"
        />
        <KpiCard
          title="Active Anomalies"
          value={data.topAnomalies.length}
          icon={AlertTriangle}
          subtitle="last 7 days"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Energy Trend */}
        <div className="card">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Energy Consumption (7 day)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.energyTrend7d}>
                <defs>
                  <linearGradient id="kwh-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="kwh" stroke="#3b82f6" fill="url(#kwh-gradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comfort Overview */}
        <div className="card">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Comfort Overview</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">Normal</span>
                  <span className="text-sm font-medium text-green-400">{data.comfortOverview.zonesNormal}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${totalZones > 0 ? (data.comfortOverview.zonesNormal / totalZones) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">Warning</span>
                  <span className="text-sm font-medium text-yellow-400">{data.comfortOverview.zonesWarning}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${totalZones > 0 ? (data.comfortOverview.zonesWarning / totalZones) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">Critical</span>
                  <span className="text-sm font-medium text-red-400">{data.comfortOverview.zonesCritical}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${totalZones > 0 ? (data.comfortOverview.zonesCritical / totalZones) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Anomalies list */}
          <h4 className="text-sm font-medium text-slate-300 mt-6 mb-3">Top Anomalies</h4>
          <div className="flex flex-col gap-2">
            {data.topAnomalies.length === 0 ? (
              <p className="text-sm text-slate-500">No anomalies detected</p>
            ) : (
              data.topAnomalies.map((a) => (
                <div key={a.id} className="flex items-start gap-2 p-2 bg-slate-700/50 rounded-lg">
                  <StatusBadge variant={a.severity as 'warning' | 'critical'} dot />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{a.message}</p>
                    <p className="text-[10px] text-slate-500">{new Date(a.timestamp).toLocaleString()}</p>
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
