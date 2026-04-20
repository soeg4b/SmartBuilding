'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

interface Kpi { value: number; unit?: string; deltaPct?: number; deltaPts?: number; withinSla?: boolean; windowDays?: number; scale?: number; formula: string }
interface Summary { kpis: { openTickets: Kpi; avgResolutionMin: Kpi; slaBreaches7d: Kpi; tenantCsat: Kpi }; nowIso: string }
interface Ticket { id: string; title: string; tenant: string; category: string; priority: string; status: string; openedAt: string; resolvedAt: string | null; slaMinutes: number; assignee: string | null; ageMin: number; slaRemaining: number | null; burnPct: number; atRisk: boolean }
interface TicketList { scope: string; total: number; items: Ticket[] }
interface Csat { avg: number; scale: number; total: number; promoters: number; detractors: number; recent: { date: string; rating: number; comment: string }[] }

type Drill = 'open' | 'mttr' | 'breaches' | 'csat' | null;

const priorityTone: Record<string, string> = { critical: 'text-red-300 bg-red-500/10', high: 'text-amber-300 bg-amber-500/10', medium: 'text-cyan-300 bg-cyan-500/10', low: 'text-slate-300 bg-slate-500/10' };
const burnColor = (p: number) => (p >= 80 ? 'bg-red-500' : p >= 50 ? 'bg-amber-500' : 'bg-emerald-500');

export default function HelpdeskPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [openList, setOpenList] = useState<TicketList | null>(null);
  const [drill, setDrill] = useState<Drill>(null);
  const [drillData, setDrillData] = useState<TicketList | Csat | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: Summary }>('/helpdesk/summary'),
      apiFetch<{ data: TicketList }>('/helpdesk/tickets', { params: { scope: 'open' } }),
    ])
      .then(([s, t]) => { if (!alive) return; setSummary(s.data); setOpenList(t.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load helpdesk data'));
    return () => { alive = false; };
  }, []);

  function openDrill(d: Exclude<Drill, null>) {
    setDrill(d);
    setDrillData(null);
    setDrillLoading(true);
    const fetcher =
      d === 'open'     ? apiFetch<{ data: TicketList }>('/helpdesk/tickets', { params: { scope: 'open' } }) :
      d === 'mttr'     ? apiFetch<{ data: TicketList }>('/helpdesk/tickets', { params: { scope: 'closed' } }) :
      d === 'breaches' ? apiFetch<{ data: TicketList }>('/helpdesk/tickets', { params: { scope: 'breached' } }) :
                         apiFetch<{ data: Csat }>('/helpdesk/csat');
    fetcher.then((r) => setDrillData(r.data)).catch((e) => setError(e?.message ?? 'Drilldown failed')).finally(() => setDrillLoading(false));
  }

  const k = summary?.kpis;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">Office · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Tenant Helpdesk &amp; Tickets</h1>
          <p className="text-sm text-slate-400 mt-1">Auto-routed work orders dengan SLA burn-down — klik kartu untuk drill-down.</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Open Tickets"   value={k ? `${k.openTickets.value}` : '—'} delta={k ? `${k.openTickets.deltaPct}%` : undefined} tone="cyan"  formula={k?.openTickets.formula}      loading={!k} onClick={() => openDrill('open')} />
        <KpiCard label="Avg Resolution" value={k ? `${k.avgResolutionMin.value} min` : '—'} delta={k?.avgResolutionMin.withinSla ? 'within SLA' : 'over SLA'} tone={k?.avgResolutionMin.withinSla ? 'green' : 'red'} formula={k?.avgResolutionMin.formula} loading={!k} onClick={() => openDrill('mttr')} />
        <KpiCard label="SLA Breaches"   value={k ? `${k.slaBreaches7d.value}` : '—'} delta={k ? `last ${k.slaBreaches7d.windowDays}d` : undefined} tone={k && k.slaBreaches7d.value > 0 ? 'red' : 'green'} formula={k?.slaBreaches7d.formula} loading={!k} onClick={() => openDrill('breaches')} />
        <KpiCard label="Tenant CSAT"    value={k ? `${k.tenantCsat.value}/${k.tenantCsat.scale}` : '—'} delta={k ? `+${k.tenantCsat.deltaPts}` : undefined} tone="blue" formula={k?.tenantCsat.formula} loading={!k} onClick={() => openDrill('csat')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">Live Ticket Queue</h3>
          <p className="mt-1 text-xs text-slate-400">Auto-routed work orders dengan technician assignment.</p>
          <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
            <table className="w-full text-xs">
              <thead className="text-slate-500 sticky top-0 bg-slate-900">
                <tr><th className="text-left py-1.5">ID</th><th className="text-left">Title</th><th className="text-left">Tenant</th><th>Priority</th><th>Assignee</th><th className="text-right">Age</th></tr>
              </thead>
              <tbody>
                {(openList?.items ?? []).map((t) => (
                  <tr key={t.id} className="border-t border-slate-800">
                    <td className="py-1.5 font-mono text-slate-400">{t.id}</td>
                    <td className="text-slate-200">{t.title}</td>
                    <td className="text-slate-400">{t.tenant}</td>
                    <td className="text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${priorityTone[t.priority] ?? ''}`}>{t.priority}</span></td>
                    <td className="text-center text-slate-400">{t.assignee ?? <span className="text-amber-400">unassigned</span>}</td>
                    <td className="text-right font-mono text-slate-300">{t.ageMin}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">SLA Burn-down</h3>
          <p className="mt-1 text-xs text-slate-400">Visual countdown — kuning ≥ 50%, merah ≥ 80% SLA terpakai.</p>
          <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {(openList?.items ?? []).map((t) => (
              <div key={t.id} className="text-xs">
                <div className="flex justify-between text-slate-400">
                  <span className="truncate">{t.id} · {t.title}</span>
                  <span className="font-mono">{t.slaRemaining ?? 0}m left</span>
                </div>
                <div className="mt-1 h-2 bg-slate-800 rounded overflow-hidden">
                  <div className={`h-full ${burnColor(t.burnPct)}`} style={{ width: `${t.burnPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DrilldownModal
        open={drill !== null}
        onClose={() => setDrill(null)}
        title={drill === 'open' ? 'Open Tickets' : drill === 'mttr' ? 'Closed Tickets — MTTR' : drill === 'breaches' ? 'SLA Breaches (7d)' : drill === 'csat' ? 'Tenant CSAT' : ''}
        subtitle={drill === 'csat' && summary ? `Rule: ${summary.kpis.tenantCsat.formula}` : drill && summary ? `Rule: ${drill === 'open' ? summary.kpis.openTickets.formula : drill === 'mttr' ? summary.kpis.avgResolutionMin.formula : summary.kpis.slaBreaches7d.formula}` : undefined}
      >
        {drillLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {drill === 'csat' && drillData && 'avg' in drillData && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div><span className="text-slate-400">Average</span><p className="text-blue-300 font-mono text-2xl">{drillData.avg}/{drillData.scale}</p></div>
              <div><span className="text-slate-400">Promoters (5★)</span><p className="text-emerald-300 font-mono text-2xl">{drillData.promoters}</p></div>
              <div><span className="text-slate-400">Detractors (≤3★)</span><p className="text-red-300 font-mono text-2xl">{drillData.detractors}</p></div>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500"><th className="text-left">Date</th><th>Rating</th><th className="text-left">Comment</th></tr></thead>
              <tbody>
                {drillData.recent.map((c, i) => (
                  <tr key={i} className="border-t border-slate-800"><td className="py-1.5">{c.date}</td><td className="text-center text-amber-300">{'★'.repeat(c.rating)}</td><td className="text-slate-300">{c.comment}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {drill !== 'csat' && drillData && 'items' in drillData && (
          <div>
            <p className="text-xs text-slate-400 mb-2">{drillData.total} ticket(s)</p>
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700"><th className="text-left py-1.5">ID</th><th className="text-left">Title</th><th className="text-left">Tenant</th><th>Category</th><th>Priority</th><th>Status</th><th className="text-right">SLA</th><th className="text-right">{drill === 'mttr' ? 'Took' : 'Burn'}</th></tr></thead>
              <tbody>
                {drillData.items.map((t) => (
                  <tr key={t.id} className="border-t border-slate-800">
                    <td className="py-1.5 font-mono text-slate-400">{t.id}</td>
                    <td className="text-slate-200">{t.title}</td>
                    <td className="text-slate-400">{t.tenant}</td>
                    <td className="text-center text-cyan-300">{t.category}</td>
                    <td className="text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${priorityTone[t.priority] ?? ''}`}>{t.priority}</span></td>
                    <td className="text-center text-slate-400">{t.status}</td>
                    <td className="text-right font-mono">{t.slaMinutes}m</td>
                    <td className="text-right font-mono text-slate-300">{drill === 'mttr' && t.resolvedAt ? `${Math.round((new Date(t.resolvedAt).getTime() - new Date(t.openedAt).getTime()) / 60000)}m` : `${t.burnPct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DrilldownModal>
    </div>
  );
}
