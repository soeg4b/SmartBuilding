'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

type Metric = 'occupancy' | 'adr' | 'revpar' | 'stayovers';

interface RoomsSummary {
  kpis: Record<Metric, { value: number; unit?: string; currency?: string; deltaPct?: number; deltaPts?: number; label?: string; formula: string; drilldown: Metric }>;
  totals: { total: number; available: number; occupied: number; ooo: number; totalRoomRevenue: number };
}
interface BreakdownRow { floor?: number; type?: string; total: number; occupied: number; available: number; revenue: number; stayOvers: number; occupancyPct: number; adr: number; revpar: number; value: number }
interface Breakdown { metric: Metric; byFloor: BreakdownRow[]; byType: BreakdownRow[] }
interface Room { id: string; number: string; floor: number; type: string; rate: number; status: string; guestName: string | null; checkIn: string | null; checkOut: string | null; nightsBooked: number; revenueToDate: number }
interface RoomDetail extends Room { folio: { date: string; item: string; amount: number }[]; services: string[]; history: { date: string; event: string; actor: string }[] }

const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const metricLabel: Record<Metric, string> = { occupancy: 'Occupancy', adr: 'ADR', revpar: 'RevPAR', stayovers: 'Stay-Overs' };
const formatValue = (m: Metric, v: number) => m === 'occupancy' ? `${v}%` : (m === 'adr' || m === 'revpar') ? fmtUSD(v) : `${v}`;

export default function RoomsPage() {
  const [summary, setSummary] = useState<RoomsSummary | null>(null);
  const [drill, setDrill] = useState<Metric | null>(null);
  const [drillData, setDrillData] = useState<Breakdown | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<RoomDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: RoomsSummary }>('/hospitality/rooms/summary'),
      apiFetch<{ data: Room[] }>('/hospitality/rooms/list'),
    ])
      .then(([s, r]) => { if (!alive) return; setSummary(s.data); setRooms(r.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load rooms data'));
    return () => { alive = false; };
  }, []);

  function openDrill(metric: Metric) {
    setDrill(metric);
    setDrillData(null);
    setDrillLoading(true);
    apiFetch<{ data: Breakdown }>('/hospitality/rooms/breakdown', { params: { metric } })
      .then((r) => setDrillData(r.data))
      .catch((e) => setError(e?.message ?? 'Drilldown failed'))
      .finally(() => setDrillLoading(false));
  }

  function openRoom(id: string) {
    apiFetch<{ data: RoomDetail }>(`/hospitality/rooms/${encodeURIComponent(id)}`)
      .then((r) => setSelected(r.data))
      .catch((e) => setError(e?.message ?? 'Room detail failed'));
  }

  const k = summary?.kpis;
  const statusColor = (s: string) =>
    s === 'occupied' ? 'bg-emerald-500/10 text-emerald-300' :
    s === 'vacant_clean' ? 'bg-blue-500/10 text-blue-300' :
    s === 'vacant_dirty' ? 'bg-amber-500/10 text-amber-300' :
    'bg-red-500/10 text-red-300';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">Hospitality · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Rooms &amp; Occupancy</h1>
          <p className="text-sm text-slate-400 mt-1">Status kamar real-time, occupancy, dan revenue per available room — klik kartu untuk drill-down.</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Occupancy" value={k ? `${k.occupancy.value}%` : '—'} delta={k ? `+${k.occupancy.deltaPts} pts` : undefined} tone="green" formula={k?.occupancy.formula} loading={!k} onClick={() => openDrill('occupancy')} />
        <KpiCard label="ADR" value={k ? fmtUSD(k.adr.value) : '—'} delta={k ? `+${k.adr.deltaPct}%` : undefined} tone="cyan" formula={k?.adr.formula} loading={!k} onClick={() => openDrill('adr')} />
        <KpiCard label="RevPAR" value={k ? fmtUSD(k.revpar.value) : '—'} delta={k ? `+${k.revpar.deltaPct}%` : undefined} tone="green" formula={k?.revpar.formula} loading={!k} onClick={() => openDrill('revpar')} />
        <KpiCard label="Stay-Overs" value={k ? `${k.stayovers.value}` : '—'} delta={k?.stayovers.label ?? 'tonight'} tone="blue" formula={k?.stayovers.formula} loading={!k} onClick={() => openDrill('stayovers')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">Room Status Board</h3>
          <p className="mt-1 text-xs text-slate-400">Vacant / occupied / dirty / OOO — klik nomor kamar untuk detail folio.</p>
          <div className="mt-4 grid grid-cols-6 sm:grid-cols-8 gap-1.5">
            {rooms.slice(0, 56).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openRoom(r.id)}
                title={`${r.type} · ${r.status}`}
                className={`text-[11px] py-1.5 rounded font-mono ${statusColor(r.status)} hover:ring-1 hover:ring-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500`}
              >
                {r.number}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-400">
            <span><i className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />occupied</span>
            <span><i className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />vacant clean</span>
            <span><i className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />vacant dirty</span>
            <span><i className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />out-of-order</span>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">Totals</h3>
          <p className="mt-1 text-xs text-slate-400">Snapshot agregat untuk hari ini.</p>
          {summary && (
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-slate-400">Total rooms</span><span className="text-slate-200 font-mono">{summary.totals.total}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Available</span><span className="text-slate-200 font-mono">{summary.totals.available}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Occupied</span><span className="text-emerald-300 font-mono">{summary.totals.occupied}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Out-of-order</span><span className="text-red-300 font-mono">{summary.totals.ooo}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Room revenue today</span><span className="text-cyan-300 font-mono">{fmtUSD(summary.totals.totalRoomRevenue)}</span></li>
            </ul>
          )}
        </div>
      </div>

      <DrilldownModal
        open={drill !== null}
        onClose={() => setDrill(null)}
        title={drill ? `${metricLabel[drill]} Breakdown` : ''}
        subtitle={drill && k ? `Rule: ${k[drill].formula}` : undefined}
      >
        {drillLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {drillData && drill && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs uppercase tracking-wider text-cyan-400 mb-2">By Floor</h4>
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Floor</th><th className="text-right">Total</th><th className="text-right">Occupied</th><th className="text-right">Available</th><th className="text-right">{metricLabel[drill]}</th></tr></thead>
                <tbody>
                  {drillData.byFloor.map((b) => (
                    <tr key={b.floor} className="border-b border-slate-800">
                      <td className="py-2 text-slate-200">Floor {b.floor}</td>
                      <td className="text-right text-slate-400">{b.total}</td>
                      <td className="text-right text-emerald-300">{b.occupied}</td>
                      <td className="text-right text-slate-300">{b.available}</td>
                      <td className="text-right text-cyan-300 font-mono">{formatValue(drill, b.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-cyan-400 mb-2">By Room Type</h4>
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Type</th><th className="text-right">Total</th><th className="text-right">Occupied</th><th className="text-right">Revenue</th><th className="text-right">{metricLabel[drill]}</th></tr></thead>
                <tbody>
                  {drillData.byType.map((b) => (
                    <tr key={b.type} className="border-b border-slate-800">
                      <td className="py-2 text-slate-200">{b.type}</td>
                      <td className="text-right text-slate-400">{b.total}</td>
                      <td className="text-right text-emerald-300">{b.occupied}</td>
                      <td className="text-right text-slate-300 font-mono">{fmtUSD(b.revenue)}</td>
                      <td className="text-right text-cyan-300 font-mono">{formatValue(drill, b.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DrilldownModal>

      <DrilldownModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Room ${selected.number} · ${selected.type}` : ''}
        subtitle={selected ? `Floor ${selected.floor} · ${selected.status}` : undefined}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-slate-400">Guest</span><p className="text-slate-200">{selected.guestName ?? '—'}</p></div>
              <div><span className="text-slate-400">Rate</span><p className="text-slate-200">{fmtUSD(selected.rate)} / night</p></div>
              <div><span className="text-slate-400">Check-in</span><p className="text-slate-200">{selected.checkIn ?? '—'}</p></div>
              <div><span className="text-slate-400">Check-out</span><p className="text-slate-200">{selected.checkOut ?? '—'}</p></div>
              <div><span className="text-slate-400">Nights booked</span><p className="text-slate-200">{selected.nightsBooked}</p></div>
              <div><span className="text-slate-400">Revenue to date</span><p className="text-emerald-300 font-mono">{fmtUSD(selected.revenueToDate)}</p></div>
            </div>
            {selected.folio.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-cyan-400 mb-2">Folio</h4>
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-500"><th className="text-left">Date</th><th className="text-left">Item</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {selected.folio.map((f, i) => (
                      <tr key={i} className="border-t border-slate-800"><td className="py-1">{f.date}</td><td>{f.item}</td><td className="text-right font-mono">{fmtUSD(f.amount)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selected.history.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-cyan-400 mb-2">History</h4>
                <ul className="text-xs text-slate-300 space-y-1">
                  {selected.history.map((h, i) => <li key={i}>{h.date} — {h.event} <span className="text-slate-500">({h.actor})</span></li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </DrilldownModal>
    </div>
  );
}
