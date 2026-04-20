'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

interface FinSummary {
  kpis: {
    energyCostSavingsYoY: { value: number; currency: string; deltaPct: number; formula: string };
    revenueLeakageDetected: { value: number; currency: string; windowDays: number; formula: string };
    opexReduction: { value: number; unit: string; formula: string };
    buildingRoi: { value: number; unit: string; deltaPts: number; formula: string };
  };
}
interface CostSavings {
  totalSavings: number; currency: string;
  items: { category: string; baseline: number; current: number; savings: number; sharePct: number }[];
}
interface Leakage {
  totalLeakage: number; currency: string; windowDays: number;
  items: { source: string; amount: number; count: number; evidence: string; sharePct: number }[];
}

const fmt = (n: number, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

export default function FinancialPage() {
  const [summary, setSummary] = useState<FinSummary | null>(null);
  const [costs, setCosts] = useState<CostSavings | null>(null);
  const [leak, setLeak] = useState<Leakage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<null | 'savings' | 'leakage' | 'opex' | 'roi'>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: FinSummary }>('/financial/summary'),
      apiFetch<{ data: CostSavings }>('/financial/cost-savings'),
      apiFetch<{ data: Leakage }>('/financial/leakage'),
    ])
      .then(([s, c, l]) => { if (!alive) return; setSummary(s.data); setCosts(c.data); setLeak(l.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load financial data'));
    return () => { alive = false; };
  }, []);

  const k = summary?.kpis;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">CFO View · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Financial Optimization</h1>
          <p className="text-sm text-slate-400 mt-1">Energy cost savings, revenue leakage detection, dan OPEX reduction untuk maksimisasi ROI</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Energy Cost Savings YoY" value={k ? fmt(k.energyCostSavingsYoY.value, k.energyCostSavingsYoY.currency) : '—'} delta={k ? `+${k.energyCostSavingsYoY.deltaPct}%` : undefined} tone="green" formula={k?.energyCostSavingsYoY.formula} loading={!k} onClick={() => setDrill('savings')} />
        <KpiCard label="Revenue Leakage Detected" value={k ? fmt(k.revenueLeakageDetected.value, k.revenueLeakageDetected.currency) : '—'} delta={k ? `last ${k.revenueLeakageDetected.windowDays}d` : undefined} tone="amber" formula={k?.revenueLeakageDetected.formula} loading={!k} onClick={() => setDrill('leakage')} />
        <KpiCard label="OPEX Reduction" value={k ? `${k.opexReduction.value}${k.opexReduction.unit}` : '—'} delta="vs baseline" tone="cyan" formula={k?.opexReduction.formula} loading={!k} onClick={() => setDrill('opex')} />
        <KpiCard label="Building ROI" value={k ? `${k.buildingRoi.value}${k.buildingRoi.unit}` : '—'} delta={k ? `+${k.buildingRoi.deltaPts} pts` : undefined} tone="green" formula={k?.buildingRoi.formula} loading={!k} onClick={() => setDrill('roi')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">Cost Savings by Category</h3>
          <p className="mt-1 text-xs text-slate-400">HVAC, lighting, parking, F&amp;B — {costs ? fmt(costs.totalSavings, costs.currency) : '—'} total saved.</p>
          <div className="mt-4 space-y-2">
            {(costs?.items ?? []).map((c) => (
              <div key={c.category} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-slate-300">{c.category}</span>
                <div className="flex-1 h-3 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-emerald-500/70" style={{ width: `${c.sharePct}%` }} />
                </div>
                <span className="w-20 text-right text-emerald-300 font-mono">{fmt(c.savings)}</span>
                <span className="w-10 text-right text-slate-500">{c.sharePct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-100">Revenue Leakage Drilldown</h3>
          <p className="mt-1 text-xs text-slate-400">Parking, booking, energy reimbursement, F&amp;B — {leak ? fmt(leak.totalLeakage, leak.currency) : '—'} detected ({leak?.windowDays}d).</p>
          <div className="mt-4 space-y-2">
            {(leak?.items ?? []).map((l) => (
              <div key={l.source} className="flex items-center gap-3 text-xs">
                <span className="flex-1 text-slate-300">{l.source}</span>
                <span className="text-amber-300 font-mono">{fmt(l.amount)}</span>
                <span className="w-12 text-right text-slate-500">{l.count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DrilldownModal open={drill === 'savings'} onClose={() => setDrill(null)} title="Cost Savings Breakdown" subtitle={k ? `Rule: ${k.energyCostSavingsYoY.formula}` : undefined}>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Category</th><th className="text-right">Baseline</th><th className="text-right">Current</th><th className="text-right">Savings</th><th className="text-right">Share</th></tr></thead>
          <tbody>
            {(costs?.items ?? []).map((c) => (
              <tr key={c.category} className="border-b border-slate-800">
                <td className="py-2 text-slate-200">{c.category}</td>
                <td className="text-right text-slate-400 font-mono">{fmt(c.baseline)}</td>
                <td className="text-right text-slate-300 font-mono">{fmt(c.current)}</td>
                <td className="text-right text-emerald-300 font-mono">{fmt(c.savings)}</td>
                <td className="text-right text-slate-400">{c.sharePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DrilldownModal>

      <DrilldownModal open={drill === 'leakage'} onClose={() => setDrill(null)} title="Revenue Leakage Sources" subtitle={k ? `Rule: ${k.revenueLeakageDetected.formula}` : undefined}>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Source</th><th className="text-right">Amount</th><th className="text-right">Cases</th><th className="text-left pl-4">Evidence</th></tr></thead>
          <tbody>
            {(leak?.items ?? []).map((l) => (
              <tr key={l.source} className="border-b border-slate-800">
                <td className="py-2 text-slate-200">{l.source}</td>
                <td className="text-right text-amber-300 font-mono">{fmt(l.amount)}</td>
                <td className="text-right text-slate-400">{l.count}</td>
                <td className="pl-4 text-slate-500 text-xs">{l.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DrilldownModal>

      <DrilldownModal open={drill === 'opex'} onClose={() => setDrill(null)} title="OPEX Reduction Detail" subtitle={k ? `Rule: ${k.opexReduction.formula}` : undefined}>
        <p className="text-sm text-slate-300">Year-over-year operating expense reduction driven by HVAC scheduling, demand response, and predictive maintenance.</p>
        <ul className="mt-4 text-sm text-slate-300 list-disc pl-5 space-y-1">
          <li>HVAC schedule optimization: −18%</li>
          <li>Predictive maintenance avoiding overtime: −12%</li>
          <li>Lighting LED + DR participation: −8%</li>
          <li>Cleaning route optimization: −7%</li>
        </ul>
      </DrilldownModal>

      <DrilldownModal open={drill === 'roi'} onClose={() => setDrill(null)} title="Building ROI Detail" subtitle={k ? `Rule: ${k.buildingRoi.formula}` : undefined}>
        <p className="text-sm text-slate-300">ROI = Net Operating Income ÷ Asset Book Value (annualised). Higher score driven by occupancy lift and energy savings flowing into NOI.</p>
      </DrilldownModal>
    </div>
  );
}
