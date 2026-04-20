'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCheck, ChevronDown, ChevronUp, Filter, Activity, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface StormState {
  active: boolean;
  activatedAt: string | null;
  deactivatedAt: string | null;
  alertCountInWindow: number;
  suppressedCount: number;
  stormHistory: { startedAt: string; endedAt: string; totalAlerts: number; suppressedAlerts: number; duration: number }[];
}

interface ThrottleConfig {
  stormThreshold: number;
  windowSeconds: number;
  batchIntervalSeconds: number;
  cooldownSeconds: number;
  suppressionRules: Record<string, string>;
}

interface Alert {
  id: string;
  severity: string;
  status: string;
  message: string;
  triggeredAt: string;
  sensorType?: string;
  floorId?: string;
  zoneId?: string;
}

interface Incident {
  id: string;
  status: 'active' | 'resolved';
  groupKey: string;
  sensorType: string;
  floorId: string;
  floorName: string;
  firstAlertAt: string;
  lastAlertAt: string;
  alertCount: number;
  highestSeverity: 'info' | 'warning' | 'critical';
  alerts: string[];
  affectedZones: string[];
  resolvedAt: string | null;
  createdAt: string;
  timeline?: Alert[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const FLOOR_NAMES: Record<string, string> = {
  f1: 'Ground Floor',
  f2: '1st Floor',
  f3: '2nd Floor',
  f4: '3rd Floor',
};

export default function IncidentsPage() {
  const [storm, setStorm] = useState<StormState | null>(null);
  const [config, setConfig] = useState<ThrottleConfig | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [sensorTypeFilter, setSensorTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<Record<string, Alert[]>>({});
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: { storm: StormState; config: ThrottleConfig } }>('/alerts/storm-status')
      .then((res) => {
        setStorm(res.data.storm);
        setConfig(res.data.config);
      })
      .catch(() => {});
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (floorFilter !== 'all') params.floorId = floorFilter;
      if (sensorTypeFilter !== 'all') params.sensorType = sensorTypeFilter;

      const res = await api.get<{ data: Incident[]; meta: PaginationMeta }>('/alerts/incidents', params);
      setIncidents(res.data);
      setMeta(res.meta ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, floorFilter, sensorTypeFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!timelineData[id]) {
      try {
        const res = await api.get<{ data: Incident & { timeline: Alert[] } }>(`/alerts/incidents/${id}`);
        setTimelineData((prev) => ({ ...prev, [id]: res.data.timeline || [] }));
      } catch {
        setTimelineData((prev) => ({ ...prev, [id]: [] }));
      }
    }
  };

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      await api.patch(`/alerts/incidents/${id}/resolve`, {});
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === id ? { ...inc, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : inc
        )
      );
    } catch {}
    setResolving(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Alert Incidents</h1>
        <p className="text-sm text-slate-400 mt-1">Grouped alert incidents and storm detection</p>
      </div>

      {/* Storm Status Banner */}
      {storm && (
        <div
          className={`card mb-4 border ${
            storm.active
              ? 'border-red-500/40 bg-red-500/5'
              : 'border-green-500/30 bg-green-500/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${storm.active ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-200">
                  Alert Storm: {storm.active ? 'ACTIVE' : 'Inactive'}
                </span>
              </div>
              {storm.active && storm.activatedAt && (
                <p className="text-xs text-red-400 mt-0.5">
                  Active since {new Date(storm.activatedAt).toLocaleString()} · {storm.suppressedCount} alerts suppressed
                </p>
              )}
              {!storm.active && storm.stormHistory.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Last storm: {new Date(storm.stormHistory[0].startedAt).toLocaleString()} — {storm.stormHistory[0].totalAlerts} alerts, {storm.stormHistory[0].suppressedAlerts} suppressed
                </p>
              )}
            </div>
            {config && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
                <span>Threshold: {config.stormThreshold}/{config.windowSeconds}s</span>
                <span>Cooldown: {config.cooldownSeconds}s</span>
              </div>
            )}
          </div>
        </div>
      )}

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
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={floorFilter}
          onChange={(e) => { setFloorFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">All Floors</option>
          <option value="f1">Ground Floor</option>
          <option value="f2">1st Floor</option>
          <option value="f3">2nd Floor</option>
          <option value="f4">3rd Floor</option>
        </select>
        <select
          value={sensorTypeFilter}
          onChange={(e) => { setSensorTypeFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">All Sensors</option>
          <option value="temperature">Temperature</option>
          <option value="humidity">Humidity</option>
          <option value="co2">CO2</option>
          <option value="energy_meter">Energy Meter</option>
          <option value="vibration">Vibration</option>
        </select>
        {meta && (
          <span className="text-xs text-slate-500 ml-auto">
            {meta.total} incident{meta.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSpinner size="lg" className="py-20" label="Loading incidents..." />
      ) : error ? (
        <div className="card text-red-400 text-center py-8">{error}</div>
      ) : incidents.length === 0 ? (
        <div className="card text-center py-12">
          <Activity className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No incidents match your filters</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {incidents.map((inc) => {
              const isExpanded = expandedId === inc.id;
              const timeline = timelineData[inc.id] || [];

              return (
                <div
                  key={inc.id}
                  className={`card ${
                    inc.highestSeverity === 'critical' && inc.status === 'active'
                      ? 'border-red-500/30'
                      : ''
                  }`}
                >
                  {/* Incident header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                      onClick={() => toggleExpand(inc.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <AlertTriangle
                        className={`h-4 w-4 flex-shrink-0 ${
                          inc.highestSeverity === 'critical'
                            ? 'text-red-400'
                            : inc.highestSeverity === 'warning'
                            ? 'text-yellow-400'
                            : 'text-blue-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {inc.sensorType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} — {inc.floorName || FLOOR_NAMES[inc.floorId] || inc.floorId}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <StatusBadge variant={inc.status} />
                          <StatusBadge variant={inc.highestSeverity} />
                          <span className="text-[10px] text-slate-500">
                            {inc.alertCount} alert{inc.alertCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(inc.firstAlertAt).toLocaleString()} → {new Date(inc.lastAlertAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </button>

                    {inc.status === 'active' && (
                      <button
                        onClick={() => handleResolve(inc.id)}
                        disabled={resolving === inc.id}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 flex-shrink-0"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Resolve
                      </button>
                    )}
                  </div>

                  {/* Expanded timeline */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-slate-700 pt-3">
                      <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                        Alert Timeline
                      </h4>
                      {timeline.length === 0 ? (
                        <p className="text-xs text-slate-500">Loading timeline...</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {timeline.map((alert) => (
                            <div
                              key={alert.id}
                              className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-lg"
                            >
                              <StatusBadge variant={alert.severity as 'info' | 'warning' | 'critical'} dot />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-300 truncate">{alert.message}</p>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(alert.triggeredAt).toLocaleString()}
                                </span>
                              </div>
                              <StatusBadge variant={alert.status as 'active' | 'resolved' | 'acknowledged'} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
