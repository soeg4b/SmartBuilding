'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import KpiCard from '@/components/dashboard/KpiCard';
import DrilldownModal from '@/components/dashboard/DrilldownModal';

type Drill = 'roomsToClean' | 'avgCleanMin' | 'activeAttendants' | 'inspectionPassPct' | null;

interface Summary {
  kpis: {
    roomsToClean: { value: number; priorityCount: number; formula: string };
    avgCleanMin: { value: number; unit: string; onTarget: boolean; target: number; formula: string };
    activeAttendants: { value: number; allAssigned: boolean; formula: string };
    inspectionPassPct: { value: number; unit: string; deltaPct: number; formula: string };
  };
}
interface Task {
  id: string; room: string; floor: number; type: string;
  reason: string; priority: 'high' | 'medium' | 'low'; status: 'todo' | 'in_progress' | 'done';
  attendant: string; durationMin: number | null;
}
interface Attendant {
  id: string; name: string; shift: string; floor: number; capacity: number;
  total: number; todo: number; done: number; loadPct: number;
}
interface Inspections {
  total: number; pass: number; fail: number; passPct: number;
  topReasons: { reason: string; count: number }[];
  items: { id: string; date: string; roomId: string; result: 'pass' | 'fail'; issues: string[] }[];
}

const priorityColor = (p: string) =>
  p === 'high' ? 'bg-red-500/10 text-red-300' :
  p === 'medium' ? 'bg-amber-500/10 text-amber-300' :
  'bg-slate-500/10 text-slate-300';
const statusColor = (s: string) =>
  s === 'done' ? 'bg-emerald-500/10 text-emerald-300' :
  s === 'in_progress' ? 'bg-cyan-500/10 text-cyan-300' :
  'bg-amber-500/10 text-amber-300';

export default function HousekeepingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [inspections, setInspections] = useState<Inspections | null>(null);
  const [drill, setDrill] = useState<Drill>(null);
  const [drillTasks, setDrillTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ data: Summary }>('/housekeeping/summary'),
      apiFetch<{ data: Attendant[] }>('/housekeeping/attendants'),
      apiFetch<{ data: Inspections }>('/housekeeping/inspections'),
    ])
      .then(([s, a, i]) => { if (!alive) return; setSummary(s.data); setAttendants(a.data); setInspections(i.data); })
      .catch((e) => alive && setError(e?.message ?? 'Failed to load housekeeping data'));
    return () => { alive = false; };
  }, []);

  function openDrill(metric: Exclude<Drill, null>) {
    setDrill(metric);
    setDrillTasks(null);
    if (metric === 'inspectionPassPct') return;
    let scope = 'all';
    if (metric === 'roomsToClean') scope = 'todo';
    if (metric === 'avgCleanMin') scope = 'done';
    if (metric === 'activeAttendants') scope = 'in_progress';
    apiFetch<{ data: { items: Task[] } }>('/housekeeping/tasks', { params: { scope } })
      .then((r) => setDrillTasks(r.data.items))
      .catch((e) => setError(e?.message ?? 'Drilldown failed'));
  }

  const k = summary?.kpis;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">Hospitality · INTEGRA</p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">Housekeeping Workflow</h1>
          <p className="text-sm text-slate-400 mt-1">Tugas pembersihan kamar, inspeksi, dan beban kerja attendant — klik kartu untuk drill-down.</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">● Live</span>
      </div>

      {error && <div className="card mb-4 border-red-500/40 text-red-300 text-sm">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Rooms To Clean" value={k?.roomsToClean.value ?? '—'} delta={k ? `${k.roomsToClean.priorityCount} priority` : undefined} tone="amber" formula={k?.roomsToClean.formula} loading={!k} onClick={() => openDrill('roomsToClean')} />
        <KpiCard label="Avg Clean Time" value={k ? `${k.avgCleanMin.value} ${k.avgCleanMin.unit}` : '—'} delta={k ? (k.avgCleanMin.onTarget ? 'on target' : `> ${k.avgCleanMin.target}m`) : undefined} tone={k?.avgCleanMin.onTarget ? 'green' : 'amber'} formula={k?.avgCleanMin.formula} loading={!k} onClick={() => openDrill('avgCleanMin')} />
        <KpiCard label="Active Attendants" value={k?.activeAttendants.value ?? '—'} delta={k?.activeAttendants.allAssigned ? 'all assigned' : 'partial'} tone="blue" formula={k?.activeAttendants.formula} loading={!k} onClick={() => openDrill('activeAttendants')} />
        <KpiCard label="Inspection Pass" value={k ? `${k.inspectionPassPct.value}%` : '—'} delta={k ? `+${k.inspectionPassPct.deltaPct}%` : undefined} tone="green" formula={k?.inspectionPassPct.formula} loading={!k} onClick={() => openDrill('inspectionPassPct')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100">Attendant Workload</h3>
          <p className="mt-1 text-xs text-slate-400">Beban kerja per attendant — kapasitas vs tugas yang ditugaskan hari ini.</p>
          <table className="w-full text-sm mt-4">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Attendant</th><th className="text-left">Shift</th><th className="text-right">Floor</th><th className="text-right">Tasks</th><th className="text-right">Done</th><th className="text-right">Load</th></tr></thead>
            <tbody>
              {attendants.map((a) => (
                <tr key={a.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200">{a.name}</td>
                  <td className="text-slate-400">{a.shift}</td>
                  <td className="text-right text-slate-300 font-mono">F{a.floor}</td>
                  <td className="text-right text-slate-300 font-mono">{a.total}</td>
                  <td className="text-right text-emerald-300 font-mono">{a.done}</td>
                  <td className="text-right">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${a.loadPct >= 90 ? 'bg-red-500/10 text-red-300' : a.loadPct >= 70 ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{a.loadPct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-100">Inspection Failures</h3>
          <p className="mt-1 text-xs text-slate-400">Top failure reasons (7d) dengan recurrence count.</p>
          {inspections && (
            <>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div className="card !p-2 text-center"><span className="text-slate-400">Total</span><p className="text-lg text-slate-100 font-bold">{inspections.total}</p></div>
                <div className="card !p-2 text-center"><span className="text-slate-400">Pass</span><p className="text-lg text-emerald-300 font-bold">{inspections.pass}</p></div>
                <div className="card !p-2 text-center"><span className="text-slate-400">Fail</span><p className="text-lg text-red-300 font-bold">{inspections.fail}</p></div>
              </div>
              <ul className="mt-4 space-y-2">
                {inspections.topReasons.length === 0 && <li className="text-xs text-slate-500">No failures recorded.</li>}
                {inspections.topReasons.map((r) => (
                  <li key={r.reason} className="flex items-center justify-between text-sm border-b border-slate-800 pb-1.5">
                    <span className="text-slate-200">{r.reason}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">×{r.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <DrilldownModal
        open={drill !== null && drill !== 'inspectionPassPct'}
        onClose={() => setDrill(null)}
        title={drill === 'roomsToClean' ? 'Rooms To Clean (todo)' : drill === 'avgCleanMin' ? 'Completed Cleans' : drill === 'activeAttendants' ? 'In-Progress Tasks' : ''}
        subtitle={drill && k ? `Rule: ${(k as any)[drill]?.formula}` : undefined}
      >
        {!drillTasks && <p className="text-sm text-slate-400">Loading…</p>}
        {drillTasks && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Room</th><th className="text-left">Type</th><th className="text-left">Reason</th><th className="text-left">Attendant</th><th className="text-right">Priority</th><th className="text-right">Status</th><th className="text-right">Min</th></tr></thead>
            <tbody>
              {drillTasks.map((t) => (
                <tr key={t.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-200 font-mono">{t.room} <span className="text-slate-500 text-[10px]">F{t.floor}</span></td>
                  <td className="text-slate-300">{t.type}</td>
                  <td className="text-slate-400 text-xs">{t.reason}</td>
                  <td className="text-slate-300">{t.attendant}</td>
                  <td className="text-right"><span className={`text-[10px] font-mono px-2 py-0.5 rounded ${priorityColor(t.priority)}`}>{t.priority}</span></td>
                  <td className="text-right"><span className={`text-[10px] font-mono px-2 py-0.5 rounded ${statusColor(t.status)}`}>{t.status}</span></td>
                  <td className="text-right text-slate-300 font-mono">{t.durationMin ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrilldownModal>

      <DrilldownModal
        open={drill === 'inspectionPassPct'}
        onClose={() => setDrill(null)}
        title="Inspection Records"
        subtitle={k ? `Rule: ${k.inspectionPassPct.formula}` : undefined}
      >
        {inspections && (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2">Date</th><th className="text-left">Room</th><th className="text-left">Result</th><th className="text-left">Issues</th></tr></thead>
            <tbody>
              {inspections.items.map((i) => (
                <tr key={i.id} className="border-b border-slate-800">
                  <td className="py-2 text-slate-300">{i.date}</td>
                  <td className="text-slate-200 font-mono">{i.roomId}</td>
                  <td><span className={`text-[10px] font-mono px-2 py-0.5 rounded ${i.result === 'pass' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>{i.result}</span></td>
                  <td className="text-slate-400 text-xs">{i.issues.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrilldownModal>
    </div>
  );
}
