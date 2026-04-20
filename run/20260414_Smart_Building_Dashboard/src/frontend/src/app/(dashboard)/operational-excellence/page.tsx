'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

interface OpexSummary {
  kpis: {
    mttr: { value: number; unit: string; deltaPct: number; formula: string };
    buildingHealthScore: { value: number; max: number; deltaPts: number; formula: string };
    tenantSatisfaction: { value: number; unit: string; nps: number; formula: string };
    slaCompliance: { value: number; unit: string; deltaPct: number; formula: string };
  };
  survey: { promoters: number; passives: number; detractors: number; total: number };
  workOrderCount: number;
}
interface AssetHealth { id: string; name: string; type: string; healthStatus: 'green'|'yellow'|'red'; score: number; location: string }
interface NpsTrend { month: string; nps: number; promotersPct: number; detractorsPct: number }
interface WorkOrders {
  items: { id: string; title: string; priority: string; triggeredAt: string; resolvedAt: string; slaMinutes: number; onTime: boolean }[];
  throughput: { date: string; opened: number; resolved: number; onTime: number }[];
}

export default function OperationalExcellencePage() {
  const [summary, setSummary] = useState<OpexSummary | null>(null);
  const [assets, setAssets] = useState<AssetHealth[]>([]);
  const [nps, setNps] = useState<NpsTrend[]>([]);
  const [wo, setWo] = useState<WorkOrders | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<null | 'mttr' | 'health' | 'nps' | 'sla'>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: OpexSummary }>('/operational-excellence/summary'),
      apiFetch<{ data: AssetHealth[] }>('/operational-excellence/asset-health'),
      apiFetch<{ data: NpsTrend[] }>('/operational-excellence/nps-trend'),
      apiFetch<{ data: WorkOrders }>('/operational-excellence/work-orders'),
    ])
      .then(([s, a, n, w]) => { if (!alive) return; setSummary(s.data); setAssets(a.data); setNps(n.data); setWo(w.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load operational data'));
    return () => { alive = false; };
  }, []);

  const k = summary?.kpis;
  const dotColor = (h: string) => h === 'green' ? 'bg-emerald-400' : h === 'yellow' ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">OpEx · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Operational Excellence</h1>
          <p className="text-sm text-slate-400 mt-1">MTTR, Building Health Score, dan Tenant Satisfaction untuk kontinuitas bisnis &amp; retensi</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="MTTR" value={k ? `${k.mttr.value} ${k.mttr.unit}` : '—'} delta={k ? `${k.mttr.deltaPct}%` : undefined} tone="green" formula={k?.mttr.formula} loading={!k} onClick={() => setDrill('mttr')} />
        <KpiCard label="Building Health Score" value={k ? `${k.buildingHealthScore.value}` : '—'} delta={k ? `+${k.buildingHealthScore.deltaPts}` : undefined} tone="green" formula={k?.buildingHealthScore.formula} loading={!k} onClick={() => setDrill('health')} />
        <KpiCard label="Tenant Satisfaction" value={k ? `${k.tenantSatisfaction.value}${k.tenantSatisfaction.unit}` : '—'} delta={k ? `NPS ${k.tenantSatisfaction.nps}` : undefined} tone="blue" formula={k?.tenantSatisfaction.formula} loading={!k} onClick={() => setDrill('nps')} />
        <KpiCard label="SLA Compliance" value={k ? `${k.slaCompliance.value}${k.slaCompliance.unit}` : '—'} delta={k ? `+${k.slaCompliance.deltaPct}%` : undefined} tone="cyan" formula={k?.slaCompliance.formula} loading={!k} onClick={() => setDrill('sla')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">Asset Health Map</h3>
          <p className="mt-1 text-xs text-slate-400">Health-color view of chillers, transformers, lifts.</p>
          <div className="mt-4 space-y-2">
            {assets.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor(a.healthStatus)}`} />
                <span className="flex-1 text-slate-200">{a.name}</span>
                <span className="text-slate-500 truncate max-w-[140px]">{a.location}</span>
                <span className="text-slate-300 font-mono w-8 text-right">{a.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">Tenant NPS Trend</h3>
          <p className="mt-1 text-xs text-slate-400">6-month satisfaction.</p>
          <div className="mt-4 flex items-end gap-2 h-32">
            {nps.map((n) => (
              <div key={n.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-blue-500/70 rounded-t" style={{ height: `${n.nps}%` }} />
                <span className="text-[10px] text-slate-400">{n.month}</span>
                <span className="text-[10px] text-blue-300 font-mono">{n.nps}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">Work Order Throughput</h3>
          <p className="mt-1 text-xs text-slate-400">Resolved vs new tickets, with SLA bands.</p>
          <table className="mt-3 w-full text-xs">
            <thead><tr className="text-slate-500"><th className="text-left">Date</th><th className="text-right">Opened</th><th className="text-right">Resolved</th><th className="text-right">On-Time</th></tr></thead>
            <tbody>
              {wo?.throughput.map((t) => (
                <tr key={t.date} className="border-t border-slate-800">
                  <td className="py-1 text-slate-300">{t.date}</td>
                  <td className="text-right">{t.opened}</td>
                  <td className="text-right text-emerald-300">{t.resolved}</td>
                  <td className="text-right text-cyan-300">{t.onTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DrilldownModal open={drill === 'mttr'} onClose={() => setDrill(null)} title="Mean Time To Resolve" subtitle={k ? `Rule: ${k.mttr.formula}` : undefined}>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Work Order</th><th>Priority</th><th>Triggered</th><th>Resolved</th><th className="text-right">Δ min</th><th>SLA</th></tr></thead>
          <tbody>
            {wo?.items.map((w) => {
              const dur = Math.round((+new Date(w.resolvedAt) - +new Date(w.triggeredAt)) / 60000);
              return (
                <tr key={w.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200">{w.title}</td>
                  <td className="text-slate-400">{w.priority}</td>
                  <td className="text-slate-500 text-xs">{w.triggeredAt.slice(0, 16).replace('T', ' ')}</td>
                  <td className="text-slate-500 text-xs">{w.resolvedAt.slice(0, 16).replace('T', ' ')}</td>
                  <td className="text-right text-slate-200 font-mono">{dur}</td>
                  <td className={w.onTime ? 'text-emerald-400' : 'text-red-400'}>{w.onTime ? '✓' : '✗'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DrilldownModal>

      <DrilldownModal open={drill === 'health'} onClose={() => setDrill(null)} title="Building Health Detail" subtitle={k ? `Rule: ${k.buildingHealthScore.formula}` : undefined}>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Asset</th><th>Type</th><th>Status</th><th>Location</th><th className="text-right">Weight</th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b border-slate-800">
                <td className="py-2 text-slate-200">{a.name}</td>
                <td className="text-slate-400">{a.type}</td>
                <td><span className={`inline-block w-2 h-2 rounded-full mr-2 ${dotColor(a.healthStatus)}`} />{a.healthStatus}</td>
                <td className="text-slate-500">{a.location}</td>
                <td className="text-right font-mono">{a.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DrilldownModal>

      <DrilldownModal open={drill === 'nps'} onClose={() => setDrill(null)} title="NPS Trend (6 months)" subtitle={k ? `Rule: ${k.tenantSatisfaction.formula} · NPS = %promoters − %detractors` : undefined}>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Month</th><th>NPS</th><th>Promoters %</th><th>Detractors %</th></tr></thead>
          <tbody>
            {nps.map((n) => (
              <tr key={n.month} className="border-b border-slate-800">
                <td className="py-2 text-slate-200">{n.month}</td>
                <td className="text-blue-300 font-mono">{n.nps}</td>
                <td className="text-emerald-300">{n.promotersPct}%</td>
                <td className="text-red-300">{n.detractorsPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary && (
          <p className="mt-4 text-xs text-slate-400">Latest survey: {summary.survey.promoters} promoters, {summary.survey.passives} passives, {summary.survey.detractors} detractors (n={summary.survey.total}).</p>
        )}
      </DrilldownModal>

      <DrilldownModal open={drill === 'sla'} onClose={() => setDrill(null)} title="SLA Compliance" subtitle={k ? `Rule: ${k.slaCompliance.formula}` : undefined}>
        <p className="text-sm text-slate-300">{wo?.items.filter(w => w.onTime).length} of {wo?.items.length} work orders met SLA.</p>
        <ul className="mt-3 text-sm text-slate-300 space-y-1">
          {wo?.items.map((w) => (
            <li key={w.id} className="flex items-center gap-2">
              <span className={w.onTime ? 'text-emerald-400' : 'text-red-400'}>{w.onTime ? '✓' : '✗'}</span>
              <span className="flex-1">{w.title}</span>
              <span className="text-slate-500 text-xs">SLA {w.slaMinutes}m</span>
            </li>
          ))}
        </ul>
      </DrilldownModal>
    </div>
  );
}
