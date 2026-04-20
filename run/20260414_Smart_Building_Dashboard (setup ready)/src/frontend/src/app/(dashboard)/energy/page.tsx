'use client';

import { useState, useEffect, useMemo } from 'react';
import { Zap, TrendingUp, DollarSign, Activity } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface TrendPoint {
  timestamp: string;
  kwh: number;
  powerFactor?: number;
  peakKw?: number;
}

interface BillingProjection {
  buildingId: string;
  month: string;
  consumedKwh: number;
  projectedKwh: number;
  tariffPerKwh: number;
  projectedCostIdr: number;
  lastMonthActualIdr?: number;
  variancePercent?: number;
  daysElapsed: number;
  daysRemaining: number;
}

type TimeRange = '24h' | '7d' | '30d';

export default function EnergyPage() {
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [billing, setBilling] = useState<BillingProjection | null>(null);
  const [consumption, setConsumption] = useState<{ todayKwh: number; avgDaily: number } | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ data: TrendPoint[] }>('/energy/trends', { range: timeRange }),
      api.get<{ data: BillingProjection }>('/energy/billing-projection').catch(() => ({ data: null })),
      api.get<{ data: { todayKwh: number; avgDaily: number } }>('/energy/consumption').catch(() => ({ data: { todayKwh: 0, avgDaily: 0 } })),
    ])
      .then(([trendsRes, billingRes, consumptionRes]) => {
        setTrends(trendsRes.data);
        setBilling(billingRes.data);
        setConsumption(consumptionRes.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [timeRange]);

  const chartData = useMemo(() => {
    return trends.map((t) => ({
      time: new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      kwh: Math.round(t.kwh),
      peakKw: t.peakKw ? Math.round(t.peakKw) : undefined,
    }));
  }, [trends]);

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  }

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading energy data..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Energy Management</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor consumption, trends and billing</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Today's Consumption"
          value={`${consumption?.todayKwh?.toLocaleString() ?? 0} kWh`}
          icon={Zap}
          subtitle="Energy used today"
        />
        <KpiCard
          title="Daily Average"
          value={`${consumption?.avgDaily?.toLocaleString() ?? 0} kWh`}
          icon={Activity}
          subtitle="Rolling average"
        />
        <KpiCard
          title="Projected Cost"
          value={billing ? formatCurrency(billing.projectedCostIdr) : '—'}
          icon={DollarSign}
          trend={billing?.variancePercent !== undefined ? { value: billing.variancePercent } : undefined}
          subtitle="This month"
        />
        <KpiCard
          title="Tariff Rate"
          value={billing ? `Rp ${billing.tariffPerKwh.toLocaleString()}` : '—'}
          icon={TrendingUp}
          subtitle="per kWh"
        />
      </div>

      {/* Time range selector */}
      <div className="flex items-center gap-2 mb-4">
        {(['24h', '7d', '30d'] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              timeRange === r ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Consumption Trend */}
        <div className="card">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Consumption Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="energy-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="kwh" name="kWh" stroke="#3b82f6" fill="url(#energy-gradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Load */}
        <div className="card">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Peak Load (kW)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="peakKw" name="Peak kW" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Billing projection card */}
      {billing && (
        <div className="card mt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Monthly Billing Projection</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400">Consumed</p>
              <p className="text-lg font-semibold text-slate-100">{billing.consumedKwh.toLocaleString()} kWh</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Projected</p>
              <p className="text-lg font-semibold text-slate-100">{billing.projectedKwh.toLocaleString()} kWh</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Projected Cost</p>
              <p className="text-lg font-semibold text-blue-400">{formatCurrency(billing.projectedCostIdr)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Days Remaining</p>
              <p className="text-lg font-semibold text-slate-100">{billing.daysRemaining}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Day {billing.daysElapsed}</span>
              <span>{billing.daysElapsed + billing.daysRemaining} days</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(billing.daysElapsed / (billing.daysElapsed + billing.daysRemaining)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
