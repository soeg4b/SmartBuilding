'use client';

import { useEffect, useMemo, useState } from 'react';
import { Hotel, BriefcaseBusiness } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useVertical } from '@/lib/vertical';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

interface Kpi { value: number; formula: string }
interface Summary { mode: 'office' | 'hospitality'; kpis: { activeGuests: Kpi; todayCheckIn: Kpi; visitorPasses: Kpi; openGuestTickets: Kpi }; queue: { waitingCheckIn: number; activeInBuilding: number; escortRequired: number; issueReported: number } }
interface Visitor { id: string; name: string; company: string; host: string; purpose: string; status: string; escortRequired: boolean; checkInAt: string | null; expectedOutAt: string | null; badge: string | null }
interface VisitorList { filter: string; total: number; items: Visitor[] }
interface Passes { items: { purpose: string; count: number }[]; preRegistered: number; walkIn: number }

type Drill = 'active' | 'checkin' | 'passes' | 'tickets' | 'queue:waiting' | 'queue:in_building' | 'queue:escort' | 'queue:issue' | null;

export default function GuestManagementPage() {
  const { vertical } = useVertical();
  const mode: 'office' | 'hospitality' = useMemo(() => (vertical === 'hospitality' ? 'hospitality' : 'office'), [vertical]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [drill, setDrill] = useState<Drill>(null);
  const [drillData, setDrillData] = useState<VisitorList | Passes | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<{ data: Summary }>('/guest-management/summary', { params: { mode } })
      .then((s) => { if (alive) setSummary(s.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load guest data'));
    return () => { alive = false; };
  }, [mode]);

  function openDrill(d: Exclude<Drill, null>) {
    setDrill(d);
    setDrillData(null);
    setDrillLoading(true);
    let p: Promise<{ data: VisitorList | Passes }>;
    if (d === 'passes' || d === 'checkin') {
      p = apiFetch<{ data: Passes }>('/guest-management/passes');
    } else {
      const filter =
        d === 'active'         ? 'in_building' :
        d === 'tickets'        ? 'issue' :
        d === 'queue:waiting'  ? 'waiting' :
        d === 'queue:in_building' ? 'in_building' :
        d === 'queue:escort'   ? 'escort' :
        d === 'queue:issue'    ? 'issue' :
        'all';
      p = apiFetch<{ data: VisitorList }>('/guest-management/visitors', { params: { filter } });
    }
    p.then((r) => setDrillData(r.data)).catch((e) => setError(e?.message ?? 'Drilldown failed')).finally(() => setDrillLoading(false));
  }

  const k = summary?.kpis;
  const q = summary?.queue;
  const title = mode === 'hospitality' ? 'Guest Management - Hospitality' : 'Guest Management - Office';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">Office · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">{title}</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor tamu hotel dan visitor kantor — klik kartu / antrian untuk daftar lengkap.</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Guests"      value={k ? `${k.activeGuests.value}` : '—'}     tone="blue"  formula={k?.activeGuests.formula}     loading={!k} onClick={() => openDrill('active')} />
        <KpiCard label="Today Check-in"     value={k ? `${k.todayCheckIn.value}` : '—'}     tone="green" formula={k?.todayCheckIn.formula}     loading={!k} onClick={() => openDrill('checkin')} />
        <KpiCard label="Visitor Passes"     value={k ? `${k.visitorPasses.value}` : '—'}    tone="cyan"  formula={k?.visitorPasses.formula}    loading={!k} onClick={() => openDrill('passes')} />
        <KpiCard label="Open Guest Tickets" value={k ? `${k.openGuestTickets.value}` : '—'} tone="amber" formula={k?.openGuestTickets.formula} loading={!k} onClick={() => openDrill('tickets')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
            {mode === 'hospitality' ? <Hotel className="h-5 w-5 text-amber-400" /> : <BriefcaseBusiness className="h-5 w-5 text-cyan-400" />}
            {mode === 'hospitality' ? 'Hotel Guest Journey' : 'Office Visitor Journey'}
          </h3>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-3"><span className="text-cyan-400 font-mono">1.</span>Pre-registration &amp; ID verification (e-KYC)</li>
            <li className="flex gap-3"><span className="text-cyan-400 font-mono">2.</span>Digital key / visitor badge issuance</li>
            <li className="flex gap-3"><span className="text-cyan-400 font-mono">3.</span>Access policy &amp; escort rules enforcement</li>
            <li className="flex gap-3"><span className="text-cyan-400 font-mono">4.</span>Service tickets &amp; SLA tracking</li>
            <li className="flex gap-3"><span className="text-cyan-400 font-mono">5.</span>Check-out &amp; badge revoke (audit trail)</li>
          </ol>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100 mb-3">Live Queue</h3>
          <div className="space-y-2 text-sm">
            <QueueRow label="Waiting check-in"   value={q ? `${q.waitingCheckIn} visitors`   : '—'} tone="amber" onClick={() => openDrill('queue:waiting')} />
            <QueueRow label="Active in building" value={q ? `${q.activeInBuilding} visitors` : '—'} tone="blue"  onClick={() => openDrill('queue:in_building')} />
            <QueueRow label="Escort required"    value={q ? `${q.escortRequired} visitors`   : '—'} tone="cyan"  onClick={() => openDrill('queue:escort')} />
            <QueueRow label="Issue reported"     value={q ? `${q.issueReported} tickets`     : '—'} tone="red"   onClick={() => openDrill('queue:issue')} />
          </div>
        </div>
      </div>

      <DrilldownModal
        open={drill !== null}
        onClose={() => setDrill(null)}
        title={drillTitle(drill)}
        subtitle={drill && summary ? drillSubtitle(drill, summary) : undefined}
      >
        {drillLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {drill === 'passes' && drillData && 'items' in drillData && 'preRegistered' in drillData && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-slate-400">Pre-registered</span><p className="text-emerald-300 font-mono text-2xl">{drillData.preRegistered}</p></div>
              <div><span className="text-slate-400">Walk-in</span><p className="text-amber-300 font-mono text-2xl">{drillData.walkIn}</p></div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-cyan-400 mb-2">By Purpose</h4>
              <table className="w-full text-xs">
                <thead><tr className="text-slate-500"><th className="text-left">Purpose</th><th className="text-right">Count</th></tr></thead>
                <tbody>
                  {drillData.items.map((p) => (
                    <tr key={p.purpose} className="border-t border-slate-800"><td className="py-1.5 text-slate-200">{p.purpose}</td><td className="text-right font-mono text-cyan-300">{p.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {drill !== 'passes' && drillData && 'items' in drillData && Array.isArray((drillData as VisitorList).items) && (
          <div>
            <p className="text-xs text-slate-400 mb-2">{(drillData as VisitorList).total} visitor(s)</p>
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700"><th className="text-left py-1.5">Name</th><th className="text-left">Company</th><th className="text-left">Host</th><th>Purpose</th><th>Status</th><th>Escort</th><th>Badge</th></tr></thead>
              <tbody>
                {(drillData as VisitorList).items.map((v) => (
                  <tr key={v.id} className="border-t border-slate-800">
                    <td className="py-1.5 text-slate-200">{v.name}</td>
                    <td className="text-slate-400">{v.company}</td>
                    <td className="text-slate-400">{v.host}</td>
                    <td className="text-center text-cyan-300">{v.purpose}</td>
                    <td className="text-center text-slate-300">{v.status}</td>
                    <td className="text-center">{v.escortRequired ? <span className="text-amber-300">required</span> : <span className="text-slate-500">—</span>}</td>
                    <td className="text-center font-mono text-slate-300">{v.badge ?? '—'}</td>
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

function drillTitle(d: Drill): string {
  switch (d) {
    case 'active': return 'Active Guests in Building';
    case 'checkin': return 'Today Check-in (Pass Issuance)';
    case 'passes': return 'Visitor Passes — by Purpose';
    case 'tickets': return 'Open Guest Tickets';
    case 'queue:waiting': return 'Queue · Waiting check-in';
    case 'queue:in_building': return 'Queue · Active in building';
    case 'queue:escort': return 'Queue · Escort required';
    case 'queue:issue': return 'Queue · Issue reported';
    default: return '';
  }
}
function drillSubtitle(d: Drill, s: Summary): string | undefined {
  if (d === 'active') return `Rule: ${s.kpis.activeGuests.formula}`;
  if (d === 'checkin') return `Rule: ${s.kpis.todayCheckIn.formula}`;
  if (d === 'passes') return `Rule: ${s.kpis.visitorPasses.formula}`;
  if (d === 'tickets' || d === 'queue:issue') return `Rule: ${s.kpis.openGuestTickets.formula}`;
  return undefined;
}

function QueueRow({ label, value, tone, onClick }: { label: string; value: string; tone: 'amber' | 'blue' | 'cyan' | 'red'; onClick: () => void }) {
  const toneClass: Record<typeof tone, string> = { amber: 'text-amber-400', blue: 'text-blue-400', cyan: 'text-cyan-400', red: 'text-red-400' };
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center justify-between rounded-lg bg-slate-700/40 hover:bg-slate-700/70 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-cyan-500">
      <span className="text-slate-300">{label}</span>
      <span className={`font-semibold ${toneClass[tone]}`}>{value}</span>
    </button>
  );
}
