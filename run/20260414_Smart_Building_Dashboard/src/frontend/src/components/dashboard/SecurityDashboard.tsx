'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, KeyRound, AlertTriangle, Activity } from 'lucide-react';
import { api } from '@/lib/api';

interface AccessEvent {
  id: string;
  userName: string;
  method: string;
  doorLabel: string;
  result: string;
  latencyMs: number;
  timestamp: string;
}

export default function SecurityDashboard() {
  const [events, setEvents] = useState<AccessEvent[]>([]);

  useEffect(() => {
    api.get<{ data: AccessEvent[] }>('/iam/access-events').then((r) => setEvents(r.data.slice(0, 10))).catch(() => {});
  }, []);

  const denied = events.filter((e) => e.result === 'denied').length;

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Doors Online" value="48 / 48" tone="text-emerald-400" />
        <Stat label="Active Credentials" value="4,128" tone="text-blue-400" />
        <Stat label="Denials (24h)" value={`${denied}`} tone="text-amber-400" />
        <Stat label="Patrols Tonight" value="3" tone="text-cyan-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
            <KeyRound className="h-5 w-5 text-cyan-400" /> Live Access Stream
          </h3>
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <ul className="divide-y divide-slate-700/40">
              {events.map((e) => (
                <li key={e.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-100">
                      {e.userName} <span className="text-slate-500">via {e.method}</span>
                    </p>
                    <p className="text-xs text-slate-500">{e.doorLabel}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      e.result === 'granted' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {e.result.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-amber-400" /> Today's Watchlist
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> 3 visitors awaiting badge collection</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> CCTV NVR healthy</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-400" /> Door-Server-Room held open 4m at 02:14</li>
          </ul>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickLink href="/access-control" icon={KeyRound} label="Access Control" />
        <QuickLink href="/alerts" icon={AlertTriangle} label="Active Alerts" />
        <QuickLink href="/hse-compliance" icon={ShieldCheck} label="HSE Compliance" />
        <QuickLink href="/alerts/incidents" icon={Activity} label="Incidents" />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href} className="card hover:border-blue-400/40 transition flex items-center gap-3">
      <Icon className="h-5 w-5 text-cyan-400" />
      <span className="text-sm text-slate-100 font-medium">{label}</span>
    </Link>
  );
}
