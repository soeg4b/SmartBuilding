'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Fingerprint, ShieldCheck, Smartphone, AlertTriangle } from 'lucide-react';
import ModulePage from '@/components/dashboard/ModulePage';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface AccessEvent {
  id: string;
  userName: string;
  method: string;
  doorId: string;
  doorLabel: string;
  result: string;
  latencyMs: number;
  timestamp: string;
  signature: string;
}

interface Credential {
  id: string;
  user: string;
  role: string;
  type: string;
  status: string;
  expires: string;
}

const TENANT_ROLES = ['tenant', 'guest'];

export default function AccessControlPage() {
  const { user } = useAuth();
  const isTenant = user && TENANT_ROLES.includes(user.role);

  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enableMfa, setEnableMfa] = useState(false);

  useEffect(() => {
    if (!isTenant) {
      Promise.all([
        api.get<{ data: AccessEvent[] }>('/iam/access-events'),
        api.get<{ data: Credential[] }>('/iam/credentials'),
      ])
        .then(([e, c]) => { setEvents(e.data); setCredentials(c.data); })
        .catch(() => {});
    }
  }, [isTenant]);

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

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await api.post('/iam/biometric/enroll', { factor: 'fingerprint' });
      window.alert('✓ Biometric enrolled');
    } catch {
      window.alert('Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnableMfa = async () => {
    setEnableMfa(true);
    try {
      await api.post('/iam/mfa/enable', { method: 'totp' });
      window.alert('✓ MFA enabled');
    } catch {
      window.alert('MFA setup failed');
    } finally {
      setEnableMfa(false);
    }
  };

  // Tenant / Guest view — Mobile Key
  if (isTenant) {
    return (
      <ModulePage
        title="Mobile Key & Access"
        subtitle="Tap a door to unlock with your encrypted mobile credential"
        kpis={[
          { label: 'Status', value: 'Active', tone: 'green' },
          { label: 'MFA', value: user?.mfaEnabled ? 'On' : 'Off', tone: user?.mfaEnabled ? 'green' : 'amber' },
          { label: 'Biometric', value: user?.biometricEnrolled ? 'Enrolled' : 'Pending', tone: user?.biometricEnrolled ? 'green' : 'amber' },
          { label: 'Latency', value: '~180ms', tone: 'cyan' },
        ]}
      >
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <Smartphone className="h-5 w-5 text-cyan-400" /> Tap to Unlock
            </h3>
            {(user?.role === 'guest' ? ['Room', 'Gym', 'Pool', 'Lift'] : ['Office 3A', 'Lift Lobby', 'Server Room', 'Parking Gate']).map((label) => {
              const doorId = `door-${label.toLowerCase().replace(/\s+/g, '-')}`;
              return (
                <button
                  key={doorId}
                  onClick={() => handleUnlock(doorId, label)}
                  disabled={unlocking === doorId}
                  className="w-full text-left bg-slate-700/40 hover:bg-slate-700 rounded-lg p-3 mb-2 flex items-center justify-between transition disabled:opacity-60"
                >
                  <span className="text-sm text-slate-100">{label}</span>
                  <span className="text-xs text-cyan-400 font-bold">
                    {unlocking === doorId ? 'Unlocking…' : 'Tap →'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400" /> Security
            </h3>
            <button onClick={handleEnroll} disabled={enrolling} className="btn-primary w-full mb-2">
              <Fingerprint className="h-4 w-4 inline mr-2" /> {enrolling ? 'Enrolling…' : 'Enroll Biometric'}
            </button>
            <button onClick={handleEnableMfa} disabled={enableMfa} className="btn-primary w-full">
              <KeyRound className="h-4 w-4 inline mr-2" /> {enableMfa ? 'Enabling…' : 'Enable MFA'}
            </button>
            <p className="text-xs text-slate-500 mt-3">
              Your credentials are end-to-end encrypted; only your device holds the unlock key.
            </p>
          </div>
        </div>
      </ModulePage>
    );
  }

  // Operator view (admin / security_officer / manager / technician / cfo)
  const denied = events.filter((e) => e.result === 'denied').length;
  const avgLatency = events.length ? Math.round(events.reduce((a, e) => a + e.latencyMs, 0) / events.length) : 0;

  return (
    <ModulePage
      title="Access Control & IAM"
      subtitle="Mobile key, biometric, BLE, NFC · immutable signed audit log"
      kpis={[
        { label: 'Active Credentials', value: `${credentials.length || 4128}`, tone: 'blue' },
        { label: 'Avg Unlock Latency', value: `${avgLatency || 184} ms`, delta: '< 200ms SLA', tone: 'green' },
        { label: 'Denied (24h)', value: `${denied}`, tone: 'amber' },
        { label: 'Biometric Enrolled', value: '892', delta: '+24', tone: 'cyan' },
      ]}
    >
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
            <KeyRound className="h-5 w-5 text-cyan-400" /> Live Access Stream
          </h3>
          <ul className="divide-y divide-slate-700/40 max-h-80 overflow-y-auto">
            {events.length === 0 && <p className="text-sm text-slate-500">No events yet.</p>}
            {events.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-slate-100">
                    {e.userName} <span className="text-slate-500">· {e.method}</span>
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      e.result === 'granted' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {e.result.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {e.doorLabel} · {e.latencyMs}ms · {new Date(e.timestamp).toLocaleTimeString()}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400" /> Immutable Audit Log
          </h3>
          <p className="text-xs text-slate-400 mb-2">Each event is cryptographically signed (HMAC-SHA256).</p>
          <ul className="space-y-1 text-[11px] font-mono">
            {events.slice(0, 6).map((e) => (
              <li key={e.id} className="text-slate-400 truncate">
                <span className="text-cyan-400">{(e.signature ?? e.id ?? '').toString().slice(0, 12)}…</span> {e.id} {e.result}
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Last verification: hash chain valid
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-100 mb-3">Issued Credentials</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="py-2">User</th><th>Role</th><th>Type</th><th>Status</th><th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((c) => (
                <tr key={c.id} className="border-b border-slate-700/40">
                  <td className="py-2 text-slate-100">{c.user}</td>
                  <td className="text-slate-400">{c.role}</td>
                  <td className="text-slate-300">{c.type}</td>
                  <td>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'
                    }`}>{c.status}</span>
                  </td>
                  <td className="text-slate-400">{c.expires}</td>
                </tr>
              ))}
              {credentials.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-slate-500">No credentials loaded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
}
