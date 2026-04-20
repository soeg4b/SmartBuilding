'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

type Drill = 'pue' | 'cracUnits' | 'chilledWaterDt' | 'coldAisleAvg' | null;

interface Summary {
  kpis: {
    pue: { value: number; target: number; withinTarget: boolean; avg24h: number; formula: string };
    cracUnits: { value: number; total: number; allGreen: boolean; formula: string };
    chilledWaterDt: { value: number; unit: string; optimal: boolean; target: string; formula: string };
    coldAisleAvg: { value: number; unit: string; withinBand: boolean; band: string; formula: string };
  };
  snapshot: { itKw: number; facilityKw: number };
}
interface PueTrend { samples: { hour: string; pue: number; itKw: number; facilityKw: number }[]; target: number }
interface CracUnit { id: string; zone: string; supplyTempC: number; returnTempC: number; fanSpeedPct: number; status: string; activeKw: number; deltaT: number }
interface ChilledLoop { id: string; name: string; supplyTempC: number; returnTempC: number; flowLpm: number; pumpStatus: string; deltaT: number }
interface Aisle { id: string; tempC: number; humidityPct: number; withinBand: boolean }
interface Redundancy {
  cracByZone: { zone: string; total: number; green: number; n1Ok: boolean }[];
  pumps: { total: number; green: number; n1Ok: boolean };
  overallN1Ok: boolean;
}

const dot = (ok: boolean) => ok ? 'bg-emerald-400' : 'bg-red-400';

export default function CoolingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<PueTrend | null>(null);
  const [redundancy, setRedundancy] = useState<Redundancy | null>(null);
  const [drill, setDrill] = useState<Drill>(null);
  const [crac, setCrac] = useState<CracUnit[] | null>(null);
  const [loops, setLoops] = useState<ChilledLoop[] | null>(null);
  const [aisles, setAisles] = useState<Aisle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: Summary }>('/datacenter/cooling/summary'),
      apiFetch<{ data: PueTrend }>('/datacenter/cooling/pue-trend'),
      apiFetch<{ data: Redundancy }>('/datacenter/cooling/redundancy'),
    ])
      .then(([s, t, r]) => { if (!alive) return; setSummary(s.data); setTrend(t.data); setRedundancy(r.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load cooling data'));
    return () => { alive = false; };
  }, []);

  function openDrill(d: Exclude<Drill, null>) {
    setDrill(d);
    if (d === 'cracUnits' && !crac) {
      apiFetch<{ data: CracUnit[] }>('/datacenter/cooling/crac-units').then((r) => setCrac(r.data)).catch((e) => setError(e?.message ?? 'CRAC fetch failed'));
    }
    if (d === 'chilledWaterDt' && !loops) {
      apiFetch<{ data: ChilledLoop[] }>('/datacenter/cooling/chilled-water').then((r) => setLoops(r.data)).catch((e) => setError(e?.message ?? 'Loops fetch failed'));
    }
    if (d === 'coldAisleAvg' && !aisles) {
      apiFetch<{ data: Aisle[] }>('/datacenter/cooling/aisles').then((r) => setAisles(r.data)).catch((e) => setError(e?.message ?? 'Aisles fetch failed'));
    }
  }

  const k = summary?.kpis;
  const max = trend ? Math.max(...trend.samples.map((s) => s.pue)) : 1.5;
  const min = trend ? Math.min(...trend.samples.map((s) => s.pue)) : 1.0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">Data Center · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Cooling &amp; PUE</h1>
          <p className="text-sm text-slate-400 mt-1">CRAC, chilled water, cold aisle, dan PUE 24 jam — klik kartu untuk drill-down.</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="PUE" value={k?.pue.value ?? '—'} delta={k ? (k.pue.withinTarget ? `≤ ${k.pue.target} target` : `> ${k.pue.target} breach`) : undefined} tone={k?.pue.withinTarget ? 'green' : 'red'} formula={k?.pue.formula} loading={!k} onClick={() => openDrill('pue')} />
        <KpiCard label="CRAC Units" value={k ? `${k.cracUnits.value}/${k.cracUnits.total}` : '—'} delta={k?.cracUnits.allGreen ? 'all green' : 'fault'} tone={k?.cracUnits.allGreen ? 'green' : 'red'} formula={k?.cracUnits.formula} loading={!k} onClick={() => openDrill('cracUnits')} />
        <KpiCard label="Chilled Water Δt" value={k ? `${k.chilledWaterDt.value} ${k.chilledWaterDt.unit}` : '—'} delta={k?.chilledWaterDt.optimal ? 'optimal' : 'check'} tone={k?.chilledWaterDt.optimal ? 'green' : 'amber'} formula={k?.chilledWaterDt.formula} loading={!k} onClick={() => openDrill('chilledWaterDt')} />
        <KpiCard label="Cold Aisle Avg" value={k ? `${k.coldAisleAvg.value} ${k.coldAisleAvg.unit}` : '—'} delta={k?.coldAisleAvg.withinBand ? 'in band' : 'out'} tone={k?.coldAisleAvg.withinBand ? 'green' : 'amber'} formula={k?.coldAisleAvg.formula} loading={!k} onClick={() => openDrill('coldAisleAvg')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">PUE Trend (24h)</h3>
          <p className="mt-1 text-xs text-slate-400">Sampled every 2h · target ≤ {trend?.target ?? 1.4}.</p>
          {trend && (
            <>
              <div className="mt-4 flex items-end gap-1.5 h-32">
                {trend.samples.map((s) => {
                  const h = ((s.pue - min) / Math.max(max - min, 0.01)) * 100;
                  const breach = s.pue > trend.target;
                  return (
                    <div key={s.hour} className="flex-1 flex flex-col items-center gap-1" title={`${s.hour}:00 → PUE ${s.pue} · IT ${s.itKw}kW · Fac ${s.facilityKw}kW`}>
                      <div className={`w-full rounded-t ${breach ? 'bg-red-500/60' : 'bg-cyan-500/60'}`} style={{ height: `${Math.max(h, 8)}%` }} />
                      <span className="text-[9px] text-slate-500 font-mono">{s.hour}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="card !p-2 text-center"><span className="text-slate-400">Min</span><p className="text-emerald-300 font-bold font-mono">{min.toFixed(2)}</p></div>
                <div className="card !p-2 text-center"><span className="text-slate-400">Max</span><p className="text-amber-300 font-bold font-mono">{max.toFixed(2)}</p></div>
                <div className="card !p-2 text-center"><span className="text-slate-400">Avg 24h</span><p className="text-cyan-300 font-bold font-mono">{k?.pue.avg24h}</p></div>
              </div>
            </>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">Cooling Redundancy</h3>
          <p className="mt-1 text-xs text-slate-400">N+1 status untuk CRAC per zona dan pompa chilled water.</p>
          {redundancy && (
            <>
              <table className="w-full text-sm mt-4">
                <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Zone</th><th className="text-right">Active</th><th className="text-right">Total</th><th className="text-right">N+1</th></tr></thead>
                <tbody>
                  {redundancy.cracByZone.map((z) => (
                    <tr key={z.zone} className="border-b border-slate-800">
                      <td className="py-2 text-slate-200 font-mono">Zone {z.zone}</td>
                      <td className="text-right text-emerald-300 font-mono">{z.green}</td>
                      <td className="text-right text-slate-300 font-mono">{z.total}</td>
                      <td className="text-right"><span className={`inline-block w-2 h-2 rounded-full ${dot(z.n1Ok)}`} /></td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-800">
                    <td className="py-2 text-slate-200">Pumps (CWL)</td>
                    <td className="text-right text-emerald-300 font-mono">{redundancy.pumps.green}</td>
                    <td className="text-right text-slate-300 font-mono">{redundancy.pumps.total}</td>
                    <td className="text-right"><span className={`inline-block w-2 h-2 rounded-full ${dot(redundancy.pumps.n1Ok)}`} /></td>
                  </tr>
                </tbody>
              </table>
              <p className={`mt-3 text-xs font-semibold ${redundancy.overallN1Ok ? 'text-emerald-300' : 'text-red-300'}`}>
                Overall: {redundancy.overallN1Ok ? '● N+1 OK' : '● Redundancy at risk'}
              </p>
            </>
          )}
          {summary && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="card !p-2 text-center"><span className="text-slate-400">IT Load</span><p className="text-cyan-300 font-bold font-mono">{summary.snapshot.itKw} kW</p></div>
              <div className="card !p-2 text-center"><span className="text-slate-400">Facility</span><p className="text-amber-300 font-bold font-mono">{summary.snapshot.facilityKw} kW</p></div>
            </div>
          )}
        </div>
      </div>

      <DrilldownModal
        open={drill === 'pue'}
        onClose={() => setDrill(null)}
        title="PUE — 24h Samples"
        subtitle={k ? `Rule: ${k.pue.formula}` : undefined}
      >
        {trend && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Hour</th><th className="text-right">PUE</th><th className="text-right">IT (kW)</th><th className="text-right">Facility (kW)</th><th className="text-right">vs Target</th></tr></thead>
            <tbody>
              {trend.samples.map((s) => (
                <tr key={s.hour} className="border-b border-slate-800">
                  <td className="py-2 text-slate-300 font-mono">{s.hour}:00</td>
                  <td className="text-right text-cyan-300 font-mono">{s.pue}</td>
                  <td className="text-right text-slate-300 font-mono">{s.itKw}</td>
                  <td className="text-right text-slate-300 font-mono">{s.facilityKw}</td>
                  <td className="text-right"><span className={s.pue <= trend.target ? 'text-emerald-300' : 'text-red-300'}>{s.pue <= trend.target ? '✓' : '✗'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrilldownModal>

      <DrilldownModal
        open={drill === 'cracUnits'}
        onClose={() => setDrill(null)}
        title="CRAC Units"
        subtitle={k ? `Rule: ${k.cracUnits.formula}` : undefined}
      >
        {!crac && <p className="text-sm text-slate-400">Loading…</p>}
        {crac && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Unit</th><th className="text-left">Zone</th><th className="text-right">Supply</th><th className="text-right">Return</th><th className="text-right">Δt</th><th className="text-right">Fan%</th><th className="text-right">kW</th><th className="text-right">Status</th></tr></thead>
            <tbody>
              {crac.map((c) => (
                <tr key={c.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200 font-mono">{c.id}</td>
                  <td className="text-slate-400">{c.zone}</td>
                  <td className="text-right text-slate-300 font-mono">{c.supplyTempC}°</td>
                  <td className="text-right text-slate-300 font-mono">{c.returnTempC}°</td>
                  <td className="text-right text-cyan-300 font-mono">{c.deltaT}°</td>
                  <td className="text-right text-slate-300 font-mono">{c.fanSpeedPct}</td>
                  <td className="text-right text-slate-300 font-mono">{c.activeKw}</td>
                  <td className="text-right"><span className={`inline-block w-2 h-2 rounded-full ${dot(c.status === 'green')}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrilldownModal>

      <DrilldownModal
        open={drill === 'chilledWaterDt'}
        onClose={() => setDrill(null)}
        title="Chilled Water Loops"
        subtitle={k ? `Rule: ${k.chilledWaterDt.formula}` : undefined}
      >
        {!loops && <p className="text-sm text-slate-400">Loading…</p>}
        {loops && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Loop</th><th className="text-right">Supply</th><th className="text-right">Return</th><th className="text-right">Δt</th><th className="text-right">Flow (L/min)</th><th className="text-right">Pump</th></tr></thead>
            <tbody>
              {loops.map((l) => (
                <tr key={l.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200">{l.name}</td>
                  <td className="text-right text-slate-300 font-mono">{l.supplyTempC}°</td>
                  <td className="text-right text-slate-300 font-mono">{l.returnTempC}°</td>
                  <td className="text-right text-cyan-300 font-mono">{l.deltaT}°</td>
                  <td className="text-right text-slate-300 font-mono">{l.flowLpm}</td>
                  <td className="text-right"><span className={`inline-block w-2 h-2 rounded-full ${dot(l.pumpStatus === 'green')}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrilldownModal>

      <DrilldownModal
        open={drill === 'coldAisleAvg'}
        onClose={() => setDrill(null)}
        title="Cold Aisle Sensors"
        subtitle={k ? `Rule: ${k.coldAisleAvg.formula} · Band ${k.coldAisleAvg.band}` : undefined}
      >
        {!aisles && <p className="text-sm text-slate-400">Loading…</p>}
        {aisles && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Aisle</th><th className="text-right">Temp (°C)</th><th className="text-right">Humidity (%)</th><th className="text-right">Band</th></tr></thead>
            <tbody>
              {aisles.map((a) => (
                <tr key={a.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200 font-mono">{a.id}</td>
                  <td className="text-right text-cyan-300 font-mono">{a.tempC}</td>
                  <td className="text-right text-slate-300 font-mono">{a.humidityPct}</td>
                  <td className="text-right"><span className={`inline-block w-2 h-2 rounded-full ${dot(a.withinBand)}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrilldownModal>
    </div>
  );
}
