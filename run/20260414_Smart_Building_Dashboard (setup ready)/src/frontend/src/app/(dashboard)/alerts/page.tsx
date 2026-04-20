'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, CheckCheck, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  message: string;
  sensorValue?: number | null;
  thresholdValue?: number | null;
  operator?: string | null;
  triggeredAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  buildingId: string;
  sensorId?: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;

      const res = await api.get<{ data: Alert[]; meta: PaginationMeta }>('/alerts', params);
      setAlerts(res.data);
      setMeta(res.meta ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/alerts/${id}/acknowledge`, {});
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString() } : a
        )
      );
    } catch {}
    setActionLoading(null);
  };

  const handleResolve = async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/alerts/${id}/resolve`, {});
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : a
        )
      );
    } catch {}
    setActionLoading(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Alert Management</h1>
        <p className="text-sm text-slate-400 mt-1">View, acknowledge and resolve alerts</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        {meta && (
          <span className="text-xs text-slate-500 ml-auto">
            {meta.total} alert{meta.total !== 1 ? 's' : ''} total
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSpinner size="lg" className="py-20" label="Loading alerts..." />
      ) : error ? (
        <div className="card text-red-400 text-center py-8">{error}</div>
      ) : alerts.length === 0 ? (
        <div className="card text-center py-12">
          <AlertTriangle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No alerts match your filters</p>
        </div>
      ) : (
        <>
          {/* Alert list */}
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`card flex flex-col sm:flex-row sm:items-center gap-3 ${
                  alert.severity === 'critical' && alert.status === 'active'
                    ? 'border-red-500/30'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <StatusBadge variant={alert.severity} dot />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <StatusBadge variant={alert.status} />
                      <span className="text-[10px] text-slate-500">
                        Triggered {new Date(alert.triggeredAt).toLocaleString()}
                      </span>
                      {alert.sensorValue !== null && alert.thresholdValue !== null && (
                        <span className="text-[10px] text-slate-500">
                          Value: {alert.sensorValue} {alert.operator} {alert.thresholdValue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={actionLoading === alert.id}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Acknowledge
                    </button>
                  )}
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={actionLoading === alert.id}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
