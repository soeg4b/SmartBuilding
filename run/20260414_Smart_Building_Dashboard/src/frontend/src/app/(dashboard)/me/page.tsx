'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  KeyRound,
  CalendarCheck,
  Ticket,
  Car,
  UserPlus,
  Wifi,
  Sparkles,
  CheckCircle2,
  Hotel,
  ConciergeBell,
  Coffee,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface TenantSummary {
  company: string | null;
  floorId: string | null;
  bookingsToday: number;
  openTickets: number;
  accessPasses: number;
  parkingSlot: string;
  digitalKey: { active: boolean; expires: string };
}

interface GuestStay {
  roomNumber: string;
  checkIn: string | null;
  checkOut: string | null;
  services: string[];
  mobileKey: { active: boolean; doors: string[] };
  bill: { current: number; currency: string };
}

export default function MePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [stay, setStay] = useState<GuestStay | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'tenant') {
      api.get<{ data: TenantSummary }>('/tenant/me/summary').then((r) => setSummary(r.data)).catch(() => {});
    }
    if (user?.role === 'guest') {
      api.get<{ data: GuestStay }>('/guest/me/stay').then((r) => setStay(r.data)).catch(() => {});
    }
  }, [user?.role]);

  const handleUnlock = async (doorId: string, label: string) => {
    setUnlocking(doorId);
    try {
      await api.post('/iam/unlock', { doorId, method: 'mobile_key' });
      window.alert(`✓ ${label} unlocked`);
    } catch {
      window.alert('Unlock failed');
    } finally {
      setUnlocking(null);
    }
  };

  if (user?.role === 'guest') {
    return (
      <div>
        <Header
          title={`Welcome, ${user.name.split(' ')[2] ?? user.name}`}
          subtitle={`Room ${stay?.roomNumber ?? '—'} · ${stay?.checkIn ?? ''} → ${stay?.checkOut ?? ''}`}
          icon={<Hotel className="h-6 w-6 text-amber-400" />}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Stay Status" value="In-house" tone="green" />
          <Stat label="Mobile Key" value={stay?.mobileKey.active ? 'Active' : 'Inactive'} tone={stay?.mobileKey.active ? 'green' : 'amber'} />
          <Stat label="Doors Unlocked" value={`${stay?.mobileKey.doors.length ?? 0}`} tone="cyan" />
          <Stat label="Folio" value={`$${stay?.bill.current.toFixed(2) ?? '0.00'}`} tone="blue" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-cyan-400" /> Mobile Key
            </h3>
            <div className="space-y-2">
              {(stay?.mobileKey.doors ?? ['room', 'gym', 'pool', 'lift']).map((d) => (
                <button
                  key={d}
                  onClick={() => handleUnlock(`door-${d}`, d.toUpperCase())}
                  disabled={unlocking === `door-${d}`}
                  className="w-full text-left bg-slate-700/40 hover:bg-slate-700 rounded-lg p-3 flex items-center justify-between transition"
                >
                  <span className="text-sm text-slate-100 capitalize">{d}</span>
                  <span className="text-xs text-cyan-400 font-bold">
                    {unlocking === `door-${d}` ? 'Unlocking…' : 'Tap to unlock'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <ConciergeBell className="h-5 w-5 text-amber-400" /> Guest Services
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Housekeeping', icon: Sparkles },
                { label: 'Concierge', icon: ConciergeBell },
                { label: 'Order Food', icon: Coffee },
                { label: 'Spa Booking', icon: CalendarCheck },
              ].map((s) => (
                <button key={s.label} className="bg-slate-700/40 hover:bg-slate-700 rounded-lg p-3 text-left transition">
                  <s.icon className="h-5 w-5 text-cyan-400" />
                  <p className="mt-2 text-xs text-slate-200 font-semibold">{s.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tenant view
  return (
    <div>
      <Header
        title={`Welcome back, ${user?.name?.split(' ')[1] ?? 'Tenant'}`}
        subtitle={`${summary?.company ?? user?.tenantCompany ?? 'Tenant'} · Floor ${summary?.floorId?.toUpperCase() ?? '—'}`}
        icon={<UserPlus className="h-6 w-6 text-emerald-400" />}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Bookings Today" value={`${summary?.bookingsToday ?? 0}`} tone="blue" />
        <Stat label="Open Tickets" value={`${summary?.openTickets ?? 0}`} tone="amber" />
        <Stat label="Access Passes" value={`${summary?.accessPasses ?? 0}`} tone="cyan" />
        <Stat label="Parking Slot" value={summary?.parkingSlot ?? '—'} tone="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-cyan-400" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton label="Unlock Office" icon={KeyRound} onClick={() => handleUnlock('door-office-3a', 'Office 3A')} loading={unlocking === 'door-office-3a'} />
            <ActionLink label="Book Room" icon={CalendarCheck} href="/booking" />
            <ActionLink label="Report Issue" icon={Ticket} href="/helpdesk" />
            <ActionLink label="My Parking" icon={Car} href="/parking" />
            <ActionButton label="Invite Visitor" icon={UserPlus} onClick={() => alert('Visitor invitation flow opened.')} />
            <ActionButton label="Wi-Fi Voucher" icon={Wifi} onClick={() => alert('Voucher: GUEST-2026-XYZ')} />
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Today's Plan
          </h3>
          <ul className="space-y-2">
            {[
              { time: '09:30', text: 'Stand-up — Meeting Room 3A' },
              { time: '11:00', text: 'Client call — Phone Booth 2' },
              { time: '13:00', text: 'Lunch order — Cafeteria delivery' },
              { time: '15:00', text: 'Workshop — Training Room L4' },
            ].map((i) => (
              <li key={i.time} className="flex gap-3 text-sm">
                <span className="text-cyan-400 font-bold w-12">{i.time}</span>
                <span className="text-slate-200">{i.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-100 mb-3">Building Announcements</h3>
        <div className="space-y-2 text-sm">
          <p className="text-slate-300">📢 Scheduled HVAC maintenance on Floor 5 — Saturday 09:00–12:00.</p>
          <p className="text-slate-300">🎉 New cafeteria menu available this week.</p>
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-[10px] tracking-widest text-cyan-400 uppercase">My Building · INTEGRA</p>
        <h1 className="text-3xl font-bold text-slate-50 mt-1 flex items-center gap-2">
          {icon} {title}
        </h1>
        <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
      </div>
      <Link href="/settings" className="text-xs text-blue-300 hover:underline">Manage profile</Link>
    </div>
  );
}

const toneClass: Record<string, string> = {
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
};

function Stat({ label, value, tone }: { label: string; value: string; tone: keyof typeof toneClass }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${toneClass[tone]}`}>{value}</p>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, loading }: { label: string; icon: React.ElementType; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="bg-slate-700/40 hover:bg-slate-700 rounded-lg p-3 text-left transition disabled:opacity-60"
    >
      <Icon className="h-5 w-5 text-cyan-400" />
      <p className="mt-2 text-xs text-slate-200 font-semibold">{loading ? 'Working…' : label}</p>
    </button>
  );
}

function ActionLink({ label, icon: Icon, href }: { label: string; icon: React.ElementType; href: string }) {
  return (
    <Link href={href} className="bg-slate-700/40 hover:bg-slate-700 rounded-lg p-3 text-left transition block">
      <Icon className="h-5 w-5 text-cyan-400" />
      <p className="mt-2 text-xs text-slate-200 font-semibold">{label}</p>
    </Link>
  );
}
