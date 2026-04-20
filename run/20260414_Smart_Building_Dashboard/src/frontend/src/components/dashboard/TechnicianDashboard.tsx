'use client';

import { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Asset {
  id: string;
  name: string;
  type: string;
  healthStatus: 'green' | 'yellow' | 'red';
  keyMetric: string | null;
  location: string;
}

interface PendingAlert {
  id: string;
  severity: string;
  message: string;
  timestamp: string;
}

interface ActivityItem {
  type: string;
  message: string;
  timestamp: string | null;
}

interface TechData {
  assignedAssets: Asset[];
  pendingAlerts: PendingAlert[];
  recentActivity: ActivityItem[];
}

export default function TechnicianDashboard() {
  const [data, setData] = useState<TechData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: TechData }>('/dashboard/technician')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading technician dashboard..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;
  if (!data) return null;

  const criticalAssets = data.assignedAssets.filter((a) => a.healthStatus === 'red').length;
  const warningAssets = data.assignedAssets.filter((a) => a.healthStatus === 'yellow').length;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Assets Needing Attention"
          value={data.assignedAssets.length}
          icon={Wrench}
          subtitle={`${criticalAssets} critical, ${warningAssets} warning`}
        />
        <KpiCard
          title="Pending Alerts"
          value={data.pendingAlerts.length}
          icon={AlertTriangle}
          subtitle="Require action"
        />
        <KpiCard
          title="Recent Actions"
          value={data.recentActivity.length}
          icon={CheckCircle}
          subtitle="Acknowledged/Resolved"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assigned Assets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">Assets Needing Attention</h3>
            <Link href="/assets" className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
          </div>
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {data.assignedAssets.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">All assets healthy</p>
            ) : (
              data.assignedAssets.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets/${asset.id}`}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${asset.healthStatus === 'red' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{asset.name}</p>
                      <p className="text-[10px] text-slate-400">{asset.type} · {asset.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {asset.keyMetric && (
                      <span className="text-xs text-slate-400">{asset.keyMetric}</span>
                    )}
                    <StatusBadge variant={asset.healthStatus} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Pending Alerts + Activity */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Pending Alerts</h3>
              <Link href="/alerts" className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
            </div>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
              {data.pendingAlerts.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">No pending alerts</p>
              ) : (
                data.pendingAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2 p-2 bg-slate-700/50 rounded-lg">
                    <StatusBadge variant={alert.severity as 'critical' | 'warning' | 'info'} dot />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300">{alert.message}</p>
                      <p className="text-[10px] text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-4">Recent Activity</h3>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">No recent activity</p>
              ) : (
                data.recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg">
                    <Clock className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">{item.message}</p>
                      {item.timestamp && (
                        <p className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                      )}
                    </div>
                    <StatusBadge
                      variant={item.type === 'alert_resolved' ? 'resolved' : 'acknowledged'}
                      label={item.type === 'alert_resolved' ? 'Resolved' : 'Acknowledged'}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
