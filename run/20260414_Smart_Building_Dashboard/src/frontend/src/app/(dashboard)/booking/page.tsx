'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

interface Kpi { value: number; unit?: string; deltaPct?: number; deltaPts?: number; label?: string; formula: string }
interface Summary { kpis: { bookingsToday: Kpi; utilizationPct: Kpi; noShowsPct: Kpi; hvacEnergySavedKwh: Kpi }; available: { rooms: number; businessMin: number } }
interface ScheduleRoom { id: string; name: string; floor: number; capacity: number; bookings: { id: string; host: string; start: string; end: string; attendees: number; status: string }[] }
interface Util { roomId: string; name: string; floor: number; capacity: number; bookedMin: number; availableMin: number; utilizationPct: number; bookings: number }
interface NoShows { total: number; items: { id: string; roomName: string; floor?: number; host: string; startAt: string; endAt: string; attendees: number }[] }
interface HvacEvents { totalSavedKwh: number; items: { bookingId: string; roomId: string; action: string; startAt: string; durationMin: number; savedKwh: number }[] }

type Drill = 'bookings' | 'utilization' | 'noshows' | 'hvac' | null;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
const slotMin = 30;
const dayStartMin = 8 * 60;
const dayEndMin = 18 * 60;
const slots = Array.from({ length: (dayEndMin - dayStartMin) / slotMin }, (_, i) => dayStartMin + i * slotMin);

export default function BookingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [schedule, setSchedule] = useState<ScheduleRoom[]>([]);
  const [drill, setDrill] = useState<Drill>(null);
  const [drillData, setDrillData] = useState<Util[] | NoShows | HvacEvents | ScheduleRoom[] | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: Summary }>('/booking/summary'),
      apiFetch<{ data: ScheduleRoom[] }>('/booking/schedule'),
    ])
      .then(([s, sc]) => { if (!alive) return; setSummary(s.data); setSchedule(sc.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load booking data'));
    return () => { alive = false; };
  }, []);

  function openDrill(d: Exclude<Drill, null>) {
    setDrill(d);
    setDrillData(null);
    setDrillLoading(true);
    const p =
      d === 'bookings'    ? apiFetch<{ data: ScheduleRoom[] }>('/booking/schedule') :
      d === 'utilization' ? apiFetch<{ data: Util[] }>('/booking/utilization') :
      d === 'noshows'     ? apiFetch<{ data: NoShows }>('/booking/no-shows') :
                            apiFetch<{ data: HvacEvents }>('/booking/hvac-events');
    p.then((r) => setDrillData(r.data as any)).catch((e) => setError(e?.message ?? 'Drilldown failed')).finally(() => setDrillLoading(false));
  }

  // Heatmap cell: count of overlapping bookings per (room × slot)
  const heatmap = useMemo(() => {
    return schedule.map((r) => {
      const cells = slots.map((slotStart) => {
        const slotEnd = slotStart + slotMin;
        const hits = r.bookings.filter((b) => {
          const s = new Date(b.start).getUTCHours() * 60 + new Date(b.start).getUTCMinutes();
          const e = new Date(b.end).getUTCHours() * 60 + new Date(b.end).getUTCMinutes();
          return s < slotEnd && e > slotStart;
        });
        return { busy: hits.length > 0, status: hits[0]?.status ?? 'free' };
      });
      return { ...r, cells };
    });
  }, [schedule]);

  const k = summary?.kpis;
  const cellColor = (busy: boolean, status: string) => !busy ? 'bg-slate-800' : status === 'no_show' ? 'bg-red-500/60' : status === 'confirmed' ? 'bg-emerald-500/60' : 'bg-cyan-500/60';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">Office · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Room Booking Engine</h1>
          <p className="text-sm text-slate-400 mt-1">Reservasi ruang &amp; HVAC pre-cool — klik kartu untuk drill-down per-room / per-event.</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Bookings Today"    value={k ? `${k.bookingsToday.value}` : '—'} delta={k ? `+${k.bookingsToday.deltaPct}%` : undefined} tone="green" formula={k?.bookingsToday.formula}    loading={!k} onClick={() => openDrill('bookings')} />
        <KpiCard label="Utilization"       value={k ? `${k.utilizationPct.value}%` : '—'} delta={k ? `+${k.utilizationPct.deltaPts} pts` : undefined} tone="cyan"  formula={k?.utilizationPct.formula}   loading={!k} onClick={() => openDrill('utilization')} />
        <KpiCard label="No-Shows"          value={k ? `${k.noShowsPct.value}%` : '—'} delta={k ? `${k.noShowsPct.deltaPct}%` : undefined} tone="green" formula={k?.noShowsPct.formula}        loading={!k} onClick={() => openDrill('noshows')} />
        <KpiCard label="HVAC Energy Saved" value={k ? `${k.hvacEnergySavedKwh.value} kWh` : '—'} delta={k?.hvacEnergySavedKwh.label ?? 'today'} tone="blue" formula={k?.hvacEnergySavedKwh.formula} loading={!k} onClick={() => openDrill('hvac')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">Today's Schedule (08:00–18:00)</h3>
          <p className="mt-1 text-xs text-slate-400">Heatmap booking per ruang &amp; slot 30-menit. Hijau = confirmed, merah = no-show.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="text-[10px]">
              <thead>
                <tr><th className="text-left pr-2 sticky left-0 bg-slate-900 text-slate-400">Room</th>
                  {slots.map((s) => <th key={s} className="px-0.5 text-slate-500 font-mono">{`${String(Math.floor(s / 60)).padStart(2, '0')}`}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((r) => (
                  <tr key={r.id}>
                    <td className="pr-2 sticky left-0 bg-slate-900 text-slate-300 whitespace-nowrap">{r.name}</td>
                    {r.cells.map((c, i) => (
                      <td key={i} className="p-0.5"><div className={`w-3 h-4 rounded-sm ${cellColor(c.busy, c.status)}`} title={c.status} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">HVAC Auto-Trigger</h3>
          <p className="mt-1 text-xs text-slate-400">Pre-cool 15 menit sebelum booking — otomatis menghemat baseline kWh.</p>
          {summary && (
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-slate-400">Available rooms</span><span className="text-slate-200 font-mono">{summary.available.rooms}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Business minutes/room</span><span className="text-slate-200 font-mono">{summary.available.businessMin}</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Utilization</span><span className="text-cyan-300 font-mono">{summary.kpis.utilizationPct.value}%</span></li>
              <li className="flex justify-between"><span className="text-slate-400">No-shows today</span><span className="text-amber-300 font-mono">{summary.kpis.noShowsPct.value}%</span></li>
              <li className="flex justify-between"><span className="text-slate-400">HVAC saved (kWh)</span><span className="text-blue-300 font-mono">{summary.kpis.hvacEnergySavedKwh.value}</span></li>
            </ul>
          )}
        </div>
      </div>

      <DrilldownModal
        open={drill !== null}
        onClose={() => setDrill(null)}
        title={drill === 'bookings' ? 'Bookings Today' : drill === 'utilization' ? 'Utilization per Room' : drill === 'noshows' ? 'No-Shows Today' : drill === 'hvac' ? 'HVAC Pre-cool Events' : ''}
        subtitle={drill && k ? `Rule: ${drill === 'bookings' ? k.bookingsToday.formula : drill === 'utilization' ? k.utilizationPct.formula : drill === 'noshows' ? k.noShowsPct.formula : k.hvacEnergySavedKwh.formula}` : undefined}
      >
        {drillLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {drill === 'bookings' && drillData && Array.isArray(drillData) && (
          <div className="space-y-4">
            {(drillData as ScheduleRoom[]).map((r) => (
              <div key={r.id}>
                <h4 className="text-xs uppercase tracking-wider text-cyan-400 mb-1">{r.name} · F{r.floor} · cap {r.capacity}</h4>
                <table className="w-full text-xs">
                  <tbody>
                    {r.bookings.length === 0 && <tr><td className="py-1 text-slate-500">No bookings</td></tr>}
                    {r.bookings.map((b) => (
                      <tr key={b.id} className="border-t border-slate-800">
                        <td className="py-1.5 font-mono text-slate-400 w-24">{fmtTime(b.start)} – {fmtTime(b.end)}</td>
                        <td className="text-slate-200">{b.host}</td>
                        <td className="text-right text-slate-400">{b.attendees} pax</td>
                        <td className={`text-right ${b.status === 'no_show' ? 'text-red-300' : 'text-emerald-300'}`}>{b.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
        {drill === 'utilization' && drillData && Array.isArray(drillData) && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Room</th><th>Floor</th><th>Cap</th><th className="text-right">Booked</th><th className="text-right">Available</th><th className="text-right">Util.</th></tr></thead>
            <tbody>
              {(drillData as Util[]).map((u) => (
                <tr key={u.roomId} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200">{u.name}</td>
                  <td className="text-center text-cyan-300">F{u.floor}</td>
                  <td className="text-center text-slate-400">{u.capacity}</td>
                  <td className="text-right font-mono text-slate-300">{u.bookedMin}m</td>
                  <td className="text-right font-mono text-slate-500">{u.availableMin}m</td>
                  <td className="text-right font-mono text-emerald-300">{u.utilizationPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {drill === 'noshows' && drillData && 'items' in drillData && 'total' in drillData && (
          <div>
            <p className="text-xs text-slate-400 mb-2">{(drillData as NoShows).total} no-show(s)</p>
            <table className="w-full text-sm">
              <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Room</th><th>Floor</th><th className="text-left">Host</th><th>Time</th><th className="text-right">Pax</th></tr></thead>
              <tbody>
                {(drillData as NoShows).items.map((n) => (
                  <tr key={n.id} className="border-b border-slate-800">
                    <td className="py-2 text-slate-200">{n.roomName}</td>
                    <td className="text-center text-cyan-300">F{n.floor}</td>
                    <td className="text-slate-300">{n.host}</td>
                    <td className="text-center text-slate-400 font-mono">{fmtTime(n.startAt)}–{fmtTime(n.endAt)}</td>
                    <td className="text-right font-mono text-slate-300">{n.attendees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {drill === 'hvac' && drillData && 'items' in drillData && 'totalSavedKwh' in drillData && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Total saved: <span className="text-blue-300 font-mono">{(drillData as HvacEvents).totalSavedKwh} kWh</span></p>
            <table className="w-full text-sm">
              <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Booking</th><th>Room</th><th>Action</th><th>Start</th><th className="text-right">Duration</th><th className="text-right">Saved</th></tr></thead>
              <tbody>
                {(drillData as HvacEvents).items.map((e) => (
                  <tr key={e.bookingId} className="border-b border-slate-800">
                    <td className="py-2 font-mono text-slate-400">{e.bookingId}</td>
                    <td className="text-center text-cyan-300">{e.roomId}</td>
                    <td className="text-center text-slate-300">{e.action}</td>
                    <td className="text-center text-slate-400 font-mono">{fmtTime(e.startAt)}</td>
                    <td className="text-right font-mono text-slate-300">{e.durationMin}m</td>
                    <td className="text-right font-mono text-blue-300">{e.savedKwh} kWh</td>
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
