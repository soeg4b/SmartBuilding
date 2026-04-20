'use client';

import Link from 'next/link';
import { Activity, TrendingUp, Ticket, Users, Leaf, FileText, KeyRound } from 'lucide-react';

export default function ManagerDashboard() {
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Building Health" value="94" tone="text-emerald-400" />
        <Stat label="Open Tickets" value="17" tone="text-amber-400" />
        <Stat label="Tenant CSAT" value="4.7/5" tone="text-blue-400" />
        <Stat label="OPEX vs Plan" value="−12%" tone="text-cyan-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card title="Daily Operations" icon={Activity}>
          <Item ok label="HVAC running optimally" />
          <Item ok label="2 maintenance windows scheduled" />
          <Item warn label="Generator-01 awaiting service" />
        </Card>
        <Card title="Financial Snapshot" icon={TrendingUp}>
          <p className="text-xs text-slate-400">Energy cost MTD</p>
          <p className="text-2xl font-extrabold text-emerald-400">$182,400</p>
          <p className="text-xs text-emerald-400 mt-1">−18% vs baseline</p>
        </Card>
        <Card title="Tenant Pulse" icon={Users}>
          <p className="text-xs text-slate-400">Active tenants</p>
          <p className="text-2xl font-extrabold text-blue-400">24 / 26</p>
          <p className="text-xs text-slate-400 mt-1">2 leases up for renewal</p>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickLink href="/helpdesk" icon={Ticket} label="Triage Tickets" />
        <QuickLink href="/operational-excellence" icon={Activity} label="OpEx Dashboard" />
        <QuickLink href="/esg" icon={Leaf} label="ESG Report" />
        <QuickLink href="/access-control" icon={KeyRound} label="Access Audit" />
        <QuickLink href="/financial" icon={TrendingUp} label="Financial KPIs" />
        <QuickLink href="/reports" icon={FileText} label="Monthly Report" />
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

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-cyan-400" /> {title}
      </h3>
      {children}
    </div>
  );
}

function Item({ label, ok, warn }: { label: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm py-1">
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : warn ? 'bg-amber-400' : 'bg-red-400'}`} />
      <span className="text-slate-300">{label}</span>
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
