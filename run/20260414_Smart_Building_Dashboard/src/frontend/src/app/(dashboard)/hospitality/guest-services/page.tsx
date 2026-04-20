'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

type Drill = 'openRequests' | 'avgResponseMin' | 'fnbOrdersToday' | 'guestCsat' | null;

interface Summary {
  kpis: {
    openRequests: { value: number; deltaPct: number; formula: string };
    avgResponseMin: { value: number; unit: string; inSla: boolean; formula: string };
    fnbOrdersToday: { value: number; deltaPct: number; sample: number; formula: string };
    guestCsat: { value: number; scale: number; deltaPts: number; formula: string };
  };
}
interface Request {
  id: string; roomId: string; guest: string; type: string; summary: string;
  priority: 'high' | 'medium' | 'low'; status: 'open' | 'in_progress' | 'closed';
  openedAt: string; firstResponseAt: string; closedAt: string | null;
  assignee: string; responseMin: number;
}
interface FnbOrder {
  id: string; roomId: string; items: string[]; amount: number;
  placedAt: string; deliveredAt: string; rating: number; deliveryMin: number;
}
interface Fnb { totalRevenue: number; currency: string; avgRating: number; avgDeliveryMin: number; items: FnbOrder[] }
interface Csat { avg: number; scale: number; total: number; recent: { day: string; rating: number }[] }

const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const priorityColor = (p: string) =>
  p === 'high' ? 'bg-red-500/10 text-red-300' :
  p === 'medium' ? 'bg-amber-500/10 text-amber-300' :
  'bg-slate-500/10 text-slate-300';

export default function GuestServicesPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [fnb, setFnb] = useState<Fnb | null>(null);
  const [csat, setCsat] = useState<Csat | null>(null);
  const [drill, setDrill] = useState<Drill>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: Summary }>('/guest-services/summary'),
      apiFetch<{ data: { items: Request[] } }>('/guest-services/requests', { params: { scope: 'open' } }),
      apiFetch<{ data: Fnb }>('/guest-services/fnb-orders'),
      apiFetch<{ data: Csat }>('/guest-services/csat'),
    ])
      .then(([s, r, f, c]) => { if (!alive) return; setSummary(s.data); setRequests(r.data.items); setFnb(f.data); setCsat(c.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load guest-services data'));
    return () => { alive = false; };
  }, []);

  const k = summary?.kpis;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">Hospitality · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Guest Services</h1>
          <p className="text-sm text-slate-400 mt-1">Permintaan tamu, F&amp;B in-room, kepuasan, dan loyalty — klik kartu untuk drill-down.</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Open Requests" value={k?.openRequests.value ?? '—'} delta={k ? `${k.openRequests.deltaPct >= 0 ? '+' : ''}${k.openRequests.deltaPct}% vs yest` : undefined} tone="amber" formula={k?.openRequests.formula} loading={!k} onClick={() => setDrill('openRequests')} />
        <KpiCard label="Avg Response" value={k ? `${k.avgResponseMin.value} ${k.avgResponseMin.unit}` : '—'} delta={k?.avgResponseMin.inSla ? 'in SLA' : 'breach'} tone={k?.avgResponseMin.inSla ? 'green' : 'red'} formula={k?.avgResponseMin.formula} loading={!k} onClick={() => setDrill('avgResponseMin')} />
        <KpiCard label="F&B Orders Today" value={k?.fnbOrdersToday.value ?? '—'} delta={k ? `+${k.fnbOrdersToday.deltaPct}%` : undefined} tone="cyan" formula={k?.fnbOrdersToday.formula} loading={!k} onClick={() => setDrill('fnbOrdersToday')} />
        <KpiCard label="Guest Satisfaction" value={k ? `${k.guestCsat.value}/${k.guestCsat.scale}` : '—'} delta={k ? `+${k.guestCsat.deltaPts} pts` : undefined} tone="green" formula={k?.guestCsat.formula} loading={!k} onClick={() => setDrill('guestCsat')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">Concierge Queue</h3>
          <p className="mt-1 text-xs text-slate-400">Permintaan terbuka — diurutkan berdasarkan waktu masuk.</p>
          <table className="w-full text-sm mt-4">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Room</th><th className="text-left">Type</th><th className="text-left">Summary</th><th className="text-right">Priority</th><th className="text-right">Resp(m)</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200 font-mono">{r.roomId}</td>
                  <td className="text-slate-400 text-xs">{r.type}</td>
                  <td className="text-slate-300 text-xs">{r.summary}<div className="text-slate-500 text-[10px]">→ {r.assignee}</div></td>
                  <td className="text-right"><span className={`text-[10px] font-mono px-2 py-0.5 rounded ${priorityColor(r.priority)}`}>{r.priority}</span></td>
                  <td className="text-right text-slate-300 font-mono">{r.responseMin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">Hyper-local F&amp;B</h3>
          <p className="mt-1 text-xs text-slate-400">Order in-room hari ini — waktu antar &amp; rating tamu.</p>
          {fnb && (
            <>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div className="card !p-2 text-center"><span className="text-slate-400">Revenue</span><p className="text-base text-cyan-300 font-bold font-mono">{fmtUSD(fnb.totalRevenue)}</p></div>
                <div className="card !p-2 text-center"><span className="text-slate-400">Avg Delivery</span><p className="text-base text-slate-100 font-bold font-mono">{fnb.avgDeliveryMin}m</p></div>
                <div className="card !p-2 text-center"><span className="text-slate-400">Rating</span><p className="text-base text-emerald-300 font-bold font-mono">{fnb.avgRating}/5</p></div>
              </div>
              <table className="w-full text-sm mt-4">
                <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Room</th><th className="text-left">Items</th><th className="text-right">$</th><th className="text-right">Min</th><th className="text-right">★</th></tr></thead>
                <tbody>
                  {fnb.items.map((o) => (
                    <tr key={o.id} className="border-b border-slate-800">
                      <td className="py-2 text-slate-200 font-mono">{o.roomId}</td>
                      <td className="text-slate-300 text-xs">{o.items.join(', ')}</td>
                      <td className="text-right text-slate-300 font-mono">{fmtUSD(o.amount)}</td>
                      <td className="text-right text-slate-300 font-mono">{o.deliveryMin}</td>
                      <td className="text-right text-emerald-300 font-mono">{o.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      <DrilldownModal
        open={drill === 'openRequests' || drill === 'avgResponseMin'}
        onClose={() => setDrill(null)}
        title={drill === 'avgResponseMin' ? 'Response Time Detail' : 'All Open Requests'}
        subtitle={drill && k ? `Rule: ${(k as any)[drill]?.formula}` : undefined}
      >
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Room</th><th className="text-left">Guest</th><th className="text-left">Type</th><th className="text-left">Summary</th><th className="text-right">Status</th><th className="text-right">Resp(m)</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-slate-800">
                <td className="py-2 text-slate-200 font-mono">{r.roomId}</td>
                <td className="text-slate-300">{r.guest}</td>
                <td className="text-slate-400 text-xs">{r.type}</td>
                <td className="text-slate-300 text-xs">{r.summary}</td>
                <td className="text-right text-slate-400 text-xs">{r.status}</td>
                <td className="text-right text-slate-300 font-mono">{r.responseMin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DrilldownModal>

      <DrilldownModal
        open={drill === 'fnbOrdersToday'}
        onClose={() => setDrill(null)}
        title="F&B Orders — All"
        subtitle={k ? `Rule: ${k.fnbOrdersToday.formula}` : undefined}
      >
        {fnb && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Room</th><th className="text-left">Items</th><th className="text-left">Placed</th><th className="text-left">Delivered</th><th className="text-right">$</th><th className="text-right">Min</th><th className="text-right">★</th></tr></thead>
            <tbody>
              {fnb.items.map((o) => (
                <tr key={o.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200 font-mono">{o.roomId}</td>
                  <td className="text-slate-300 text-xs">{o.items.join(', ')}</td>
                  <td className="text-slate-400 text-xs font-mono">{o.placedAt.slice(11, 16)}</td>
                  <td className="text-slate-400 text-xs font-mono">{o.deliveredAt.slice(11, 16)}</td>
                  <td className="text-right text-slate-300 font-mono">{fmtUSD(o.amount)}</td>
                  <td className="text-right text-slate-300 font-mono">{o.deliveryMin}</td>
                  <td className="text-right text-emerald-300 font-mono">{o.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrilldownModal>

      <DrilldownModal
        open={drill === 'guestCsat'}
        onClose={() => setDrill(null)}
        title="Guest Satisfaction — Trend"
        subtitle={k ? `Rule: ${k.guestCsat.formula}` : undefined}
      >
        {csat && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="card !p-2 text-center"><span className="text-slate-400">Avg</span><p className="text-lg text-emerald-300 font-bold font-mono">{csat.avg}</p></div>
              <div className="card !p-2 text-center"><span className="text-slate-400">Scale</span><p className="text-lg text-slate-100 font-bold font-mono">/{csat.scale}</p></div>
              <div className="card !p-2 text-center"><span className="text-slate-400">Samples</span><p className="text-lg text-cyan-300 font-bold font-mono">{csat.total}</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Day</th><th className="text-right">Rating</th></tr></thead>
              <tbody>
                {csat.recent.map((d) => (
                  <tr key={d.day} className="border-b border-slate-800">
                    <td className="py-2 text-slate-300 font-mono">{d.day}</td>
                    <td className="text-right text-emerald-300 font-mono">{d.rating}</td>
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
