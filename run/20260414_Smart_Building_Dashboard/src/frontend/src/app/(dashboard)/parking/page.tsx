'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

interface Kpi { value: number; unit?: string; currency?: string; deltaPct?: number; deltaAbs?: number; occupied?: number; total?: number; windowHours?: number; formula: string }
interface Summary { kpis: { occupancy: Kpi; evSessions: Kpi; anprAccuracy: Kpi; revenueToday: Kpi }; breakdown: { parkingFees: number; evFees: number } }
interface Zone { id: string; name: string; total: number; occupied: number; ev: number; evOccupied: number; occupancyPct: number; evOccupancyPct: number }
interface EvSession { id: string; plate: string; zone: string; startedAt: string; endedAt: string | null; kwh: number; fee: number }
interface EvList { totalKwh: number; totalFee: number; items: EvSession[] }
interface AnprEvent { at: string; plate: string; zone: string; decision: 'allow' | 'deny'; confidence: number; reason?: string }
interface AnprList { window: string; total: number; matched: number; allow: number; deny: number; items: AnprEvent[] }

type Drill = 'occupancy' | 'ev' | 'anpr' | 'revenue' | null;
const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function ParkingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [drill, setDrill] = useState<Drill>(null);
  const [drillData, setDrillData] = useState<Zone[] | EvList | AnprList | { parkingFees: number; evFees: number; total: number } | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: Summary }>('/parking/summary'),
      apiFetch<{ data: Zone[] }>('/parking/zones'),
    ])
      .then(([s, z]) => { if (!alive) return; setSummary(s.data); setZones(z.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load parking data'));
    return () => { alive = false; };
  }, []);

  function openDrill(d: Exclude<Drill, null>) {
    setDrill(d);
    setDrillData(null);
    setDrillLoading(true);
    const p =
      d === 'occupancy' ? apiFetch<{ data: Zone[] }>('/parking/zones') :
      d === 'ev'        ? apiFetch<{ data: EvList }>('/parking/ev-sessions') :
      d === 'anpr'      ? apiFetch<{ data: AnprList }>('/parking/anpr-events') :
                          apiFetch<{ data: { parkingFees: number; evFees: number; total: number } }>('/parking/revenue');
    p.then((r) => setDrillData(r.data as any)).catch((e) => setError(e?.message ?? 'Drilldown failed')).finally(() => setDrillLoading(false));
  }

  const k = summary?.kpis;
  const occBar = (pct: number) => pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">Office · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Smart Parking &amp; EV Charging</h1>
          <p className="text-sm text-slate-400 mt-1">ANPR-based slot reservation &amp; EV billing — klik kartu untuk drill-down per-zone / event.</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Occupancy"      value={k ? `${k.occupancy.value}%` : '—'} delta={k ? `${k.occupancy.occupied}/${k.occupancy.total}` : undefined} tone="blue"  formula={k?.occupancy.formula}    loading={!k} onClick={() => openDrill('occupancy')} />
        <KpiCard label="EV Sessions Today" value={k ? `${k.evSessions.value}` : '—'} delta={k ? `+${k.evSessions.deltaAbs}` : undefined} tone="green" formula={k?.evSessions.formula}   loading={!k} onClick={() => openDrill('ev')} />
        <KpiCard label="ANPR Accuracy"  value={k ? `${k.anprAccuracy.value}%` : '—'} delta={k ? `last ${k.anprAccuracy.windowHours}h` : undefined} tone="cyan"  formula={k?.anprAccuracy.formula} loading={!k} onClick={() => openDrill('anpr')} />
        <KpiCard label="Revenue Today"  value={k ? fmtUSD(k.revenueToday.value) : '—'} delta={k ? `+${k.revenueToday.deltaPct}%` : undefined} tone="green" formula={k?.revenueToday.formula} loading={!k} onClick={() => openDrill('revenue')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">Live Slot Map (per Zone)</h3>
          <p className="mt-1 text-xs text-slate-400">Real-time slot occupancy &amp; EV charger availability.</p>
          <div className="mt-4 space-y-3">
            {zones.map((z) => (
              <div key={z.id} className="text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>{z.name}</span>
                  <span className="font-mono">{z.occupied}/{z.total} ({z.occupancyPct}%) · EV {z.evOccupied}/{z.ev}</span>
                </div>
                <div className="mt-1 h-2 bg-slate-800 rounded overflow-hidden">
                  <div className={`h-full ${occBar(z.occupancyPct)}`} style={{ width: `${z.occupancyPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">Quick Stats</h3>
          <p className="mt-1 text-xs text-slate-400">Klik kartu KPI untuk daftar event / sesi penuh.</p>
          {summary && (
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-slate-400">Parking fees today</span><span className="text-emerald-300 font-mono">{fmtUSD(summary.breakdown.parkingFees)}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">EV charging fees</span><span className="text-emerald-300 font-mono">{fmtUSD(summary.breakdown.evFees)}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Total slots</span><span className="text-slate-200 font-mono">{summary.kpis.occupancy.total}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Occupied now</span><span className="text-cyan-300 font-mono">{summary.kpis.occupancy.occupied}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">EV chargers free</span><span className="text-amber-300 font-mono">{zones.reduce((s, z) => s + (z.ev - z.evOccupied), 0)}</span></li>
            </ul>
          )}
        </div>
      </div>

      <DrilldownModal
        open={drill !== null}
        onClose={() => setDrill(null)}
        title={drill === 'occupancy' ? 'Occupancy by Zone' : drill === 'ev' ? 'EV Charging Sessions Today' : drill === 'anpr' ? 'ANPR Event Stream' : drill === 'revenue' ? 'Revenue Breakdown' : ''}
        subtitle={drill && k ? `Rule: ${drill === 'occupancy' ? k.occupancy.formula : drill === 'ev' ? k.evSessions.formula : drill === 'anpr' ? k.anprAccuracy.formula : k.revenueToday.formula}` : undefined}
      >
        {drillLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {drill === 'occupancy' && drillData && Array.isArray(drillData) && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Zone</th><th className="text-right">Total</th><th className="text-right">Occupied</th><th className="text-right">Occupancy</th><th className="text-right">EV occ.</th></tr></thead>
            <tbody>
              {(drillData as Zone[]).map((z) => (
                <tr key={z.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200">{z.name}</td>
                  <td className="text-right text-slate-400">{z.total}</td>
                  <td className="text-right text-cyan-300 font-mono">{z.occupied}</td>
                  <td className="text-right text-emerald-300 font-mono">{z.occupancyPct}%</td>
                  <td className="text-right text-blue-300 font-mono">{z.evOccupied}/{z.ev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {drill === 'ev' && drillData && 'items' in drillData && 'totalKwh' in drillData && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Total {(drillData as EvList).totalKwh} kWh · {fmtUSD((drillData as EvList).totalFee)}</p>
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700"><th className="text-left py-1.5">Plate</th><th>Zone</th><th>Start</th><th>End</th><th className="text-right">kWh</th><th className="text-right">Fee</th></tr></thead>
              <tbody>
                {(drillData as EvList).items.map((s) => (
                  <tr key={s.id} className="border-t border-slate-800">
                    <td className="py-1.5 font-mono text-slate-200">{s.plate}</td>
                    <td className="text-center text-cyan-300">{s.zone}</td>
                    <td className="text-center text-slate-400">{fmtTime(s.startedAt)}</td>
                    <td className="text-center text-slate-400">{s.endedAt ? fmtTime(s.endedAt) : <span className="text-amber-300">active</span>}</td>
                    <td className="text-right font-mono text-blue-300">{s.kwh}</td>
                    <td className="text-right font-mono text-emerald-300">{fmtUSD(s.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {drill === 'anpr' && drillData && 'items' in drillData && 'matched' in drillData && (
          <div>
            <p className="text-xs text-slate-400 mb-2">{(drillData as AnprList).matched}/{(drillData as AnprList).total} matched · {(drillData as AnprList).allow} allow · {(drillData as AnprList).deny} deny</p>
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700"><th className="text-left py-1.5">Time</th><th className="text-left">Plate</th><th>Zone</th><th>Decision</th><th className="text-right">Conf.</th><th className="text-left">Reason</th></tr></thead>
              <tbody>
                {(drillData as AnprList).items.map((e, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="py-1.5 text-slate-400">{fmtTime(e.at)}</td>
                    <td className="font-mono text-slate-200">{e.plate}</td>
                    <td className="text-center text-cyan-300">{e.zone}</td>
                    <td className={`text-center ${e.decision === 'allow' ? 'text-emerald-300' : 'text-red-300'}`}>{e.decision}</td>
                    <td className="text-right font-mono text-slate-300">{(e.confidence * 100).toFixed(1)}%</td>
                    <td className="text-slate-400">{e.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {drill === 'revenue' && drillData && 'parkingFees' in drillData && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Parking fees</span><span className="text-emerald-300 font-mono">{fmtUSD((drillData as { parkingFees: number }).parkingFees)}</span></div>
            <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">EV charging fees</span><span className="text-emerald-300 font-mono">{fmtUSD((drillData as { evFees: number }).evFees)}</span></div>
            <div className="flex justify-between"><span className="text-slate-200 font-semibold">Total today</span><span className="text-emerald-200 font-mono text-lg">{fmtUSD((drillData as { total: number }).total)}</span></div>
          </div>
        )}
      </DrilldownModal>
    </div>
  );
}
