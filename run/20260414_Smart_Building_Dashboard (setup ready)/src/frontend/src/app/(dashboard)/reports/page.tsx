'use client';

import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  AlertTriangle,
  Zap,
  BarChart3,
  Clock,
  BookOpen,
} from 'lucide-react';
import { api, ensureValidToken } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { showToast } from '@/lib/toast';

interface ReportSummary {
  totalAlerts: number;
  criticalAlerts: number;
  totalEnergyKwh: number;
  avgComfortScore: number;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [alertSeverity, setAlertSeverity] = useState<string>('all');
  const [alertStatus, setAlertStatus] = useState<string>('all');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingAlertReport, setGeneratingAlertReport] = useState(false);
  const [generatingCompilation, setGeneratingCompilation] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useApi<{ data: ReportSummary }>(
    '/reports/summary',
    { startDate, endDate },
    { deps: [startDate, endDate] }
  );

  const { data: alertHistory, isLoading: alertsLoading } = useApi<{
    data: Array<{
      id: string;
      severity: string;
      status: string;
      message: string;
      triggeredAt: string;
      resolvedAt?: string | null;
    }>;
  }>(
    '/alerts',
    {
      startDate,
      endDate,
      ...(alertSeverity !== 'all' ? { severity: alertSeverity } : {}),
      ...(alertStatus !== 'all' ? { status: alertStatus } : {}),
      limit: 50,
    },
    { deps: [startDate, endDate, alertSeverity, alertStatus] }
  );

  const handleExportEnergyPdf = async () => {
    setGeneratingPdf(true);
    try {
      const token = await ensureValidToken();
      const res = await fetch(`/api/v1/reports/energy/pdf?startDate=${startDate}&endDate=${endDate}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `energy-report-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Energy report downloaded successfully', 'success');
    } catch {
      showToast('Failed to generate energy report', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleExportAlertReport = async () => {
    setGeneratingAlertReport(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (alertSeverity !== 'all') params.set('severity', alertSeverity);
      if (alertStatus !== 'all') params.set('status', alertStatus);

      const token = await ensureValidToken();
      const res = await fetch(`/api/v1/reports/alerts/csv?${params}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alerts-report-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Alert report downloaded successfully', 'success');
    } catch {
      showToast('Failed to generate alert report', 'error');
    } finally {
      setGeneratingAlertReport(false);
    }
  };

  const handleDownloadCompilation = async () => {
    setGeneratingCompilation(true);
    try {
      const token = await ensureValidToken();
      const res = await fetch(
        `/api/v1/reports/compilation?startDate=${startDate}&endDate=${endDate}`,
        { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error('Failed to generate compilation report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Smart-Building-Report-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Compilation report downloaded as PDF', 'success');
    } catch {
      showToast('Failed to generate compilation report', 'error');
    } finally {
      setGeneratingCompilation(false);
    }
  };

  const stats = summary?.data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">Generate and export building reports</p>
        </div>
        <button
          onClick={handleDownloadCompilation}
          disabled={generatingCompilation}
          className="btn-primary flex items-center gap-2"
        >
          {generatingCompilation ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4" />
              Download Compilation Report
            </>
          )}
        </button>
      </div>

      {/* Compilation Report CTA */}
      <div className="card border border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl shrink-0">
              <BookOpen className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Compilation Draft Report</h2>
              <p className="text-sm text-slate-400 mt-1">
                Comprehensive building report covering energy consumption, alerts, environmental
                conditions, equipment health, HSE compliance, and recommendations.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Energy', 'Alerts', 'Environment', 'Equipment', 'HSE', 'Floors'].map((section) => (
                  <span
                    key={section}
                    className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleDownloadCompilation}
            disabled={generatingCompilation}
            className="btn-primary flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            {generatingCompilation ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF Report
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Comprehensive building report with all sections exported as PDF
        </p>
      </div>

      {/* Date range picker */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Date Range</h2>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const d = new Date();
                setEndDate(d.toISOString().split('T')[0]);
                d.setDate(d.getDate() - 7);
                setStartDate(d.toISOString().split('T')[0]);
              }}
              className="btn-secondary text-sm"
            >
              Last 7 days
            </button>
            <button
              onClick={() => {
                const d = new Date();
                setEndDate(d.toISOString().split('T')[0]);
                d.setMonth(d.getMonth() - 1);
                setStartDate(d.toISOString().split('T')[0]);
              }}
              className="btn-secondary text-sm"
            >
              Last 30 days
            </button>
            <button
              onClick={() => {
                const d = new Date();
                setEndDate(d.toISOString().split('T')[0]);
                d.setMonth(d.getMonth() - 3);
                setStartDate(d.toISOString().split('T')[0]);
              }}
              className="btn-secondary text-sm"
            >
              Last 90 days
            </button>
          </div>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={AlertTriangle}
          title="Total Alerts"
          value={summaryLoading ? '...' : String(stats?.totalAlerts ?? 0)}
          color="text-yellow-400"
          bgColor="bg-yellow-500/10"
        />
        <SummaryCard
          icon={AlertTriangle}
          title="Critical Alerts"
          value={summaryLoading ? '...' : String(stats?.criticalAlerts ?? 0)}
          color="text-red-400"
          bgColor="bg-red-500/10"
        />
        <SummaryCard
          icon={Zap}
          title="Energy Consumed"
          value={summaryLoading ? '...' : `${(stats?.totalEnergyKwh ?? 0).toLocaleString()} kWh`}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <SummaryCard
          icon={BarChart3}
          title="Avg Comfort Score"
          value={summaryLoading ? '...' : `${stats?.avgComfortScore ?? 0}%`}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
      </div>

      {/* Energy Report */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Energy Report</h2>
          </div>
          <button
            onClick={handleExportEnergyPdf}
            disabled={generatingPdf}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {generatingPdf ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-slate-400">
          Generate a comprehensive energy consumption report for the selected date range.
          Includes daily/weekly breakdown, peak demand analysis, and cost projections.
        </p>
      </div>

      {/* Alert History Report */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <h2 className="text-lg font-semibold">Alert History</h2>
          </div>
          <button
            onClick={handleExportAlertReport}
            disabled={generatingAlertReport}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {generatingAlertReport ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Export CSV
              </>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Filters:</span>
          </div>
          <select
            value={alertSeverity}
            onChange={(e) => setAlertSeverity(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={alertStatus}
            onChange={(e) => setAlertStatus(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Alert table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="pb-2 pr-4">Severity</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Message</th>
                <th className="pb-2 pr-4">Triggered</th>
                <th className="pb-2">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {alertsLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading alerts...
                  </td>
                </tr>
              ) : !alertHistory?.data?.length ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No alerts found for the selected criteria.
                  </td>
                </tr>
              ) : (
                alertHistory.data.map((alert) => (
                  <tr key={alert.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-2 pr-4">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={alert.status} />
                    </td>
                    <td className="py-2 pr-4 max-w-[300px] truncate">{alert.message}</td>
                    <td className="py-2 pr-4 text-slate-400">
                      {new Date(alert.triggeredAt).toLocaleString()}
                    </td>
                    <td className="py-2 text-slate-400">
                      {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download links */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Quick Downloads</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <DownloadLink
            title="Compilation Draft"
            description="Full building report with all sections"
            format="PDF"
            onClick={() => handleDownloadCompilation()}
          />
          <DownloadLink
            title="Monthly Energy Summary"
            description="Last month energy consumption overview"
            format="PDF"
            onClick={() => handleExportEnergyPdf()}
          />
          <DownloadLink
            title="Alert History Export"
            description="All alerts for selected date range"
            format="CSV"
            onClick={() => handleExportAlertReport()}
          />
          <DownloadLink
            title="Sensor Data Export"
            description="Raw sensor readings (selected range)"
            format="CSV"
            onClick={async () => {
              try {
                const token = await ensureValidToken();
                const res = await fetch(
                  `/api/v1/reports/sensors/csv?startDate=${startDate}&endDate=${endDate}`,
                  { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
                if (!res.ok) throw new Error();
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sensor-data-${startDate}-to-${endDate}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Sensor data downloaded', 'success');
              } catch {
                showToast('Failed to download sensor data', 'error');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-slate-400">{title}</p>
          <p className="text-xl font-bold text-slate-50">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-400',
    warning: 'bg-yellow-500/10 text-yellow-400',
    info: 'bg-blue-500/10 text-blue-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[severity] ?? 'bg-slate-700 text-slate-300'}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-red-500/10 text-red-400',
    acknowledged: 'bg-yellow-500/10 text-yellow-400',
    resolved: 'bg-green-500/10 text-green-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[status] ?? 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  );
}

function DownloadLink({
  title,
  description,
  format,
  onClick,
}: {
  title: string;
  description: string;
  format: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-left w-full"
    >
      <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
        <FileText className="h-4 w-4 text-blue-400" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        <span className="text-xs text-blue-400 mt-1 inline-block">{format}</span>
      </div>
    </button>
  );
}
