'use client';

import { useAuth } from '@/lib/auth';
import ExecutiveDashboard from '@/components/dashboard/ExecutiveDashboard';
import SysAdminDashboard from '@/components/dashboard/SysAdminDashboard';
import TechnicianDashboard from '@/components/dashboard/TechnicianDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Welcome back, {user?.name}</p>
      </div>

      {user?.role === 'financial_decision_maker' && <ExecutiveDashboard />}
      {user?.role === 'sys_admin' && <SysAdminDashboard />}
      {user?.role === 'technician' && <TechnicianDashboard />}
    </div>
  );
}
