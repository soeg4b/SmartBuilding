'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ExecutiveDashboard from '@/components/dashboard/ExecutiveDashboard';
import SysAdminDashboard from '@/components/dashboard/SysAdminDashboard';
import TechnicianDashboard from '@/components/dashboard/TechnicianDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import SecurityDashboard from '@/components/dashboard/SecurityDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'tenant' || user?.role === 'guest') {
      router.replace('/me');
    }
  }, [user?.role, router]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Command Center</h1>
        <p className="text-sm text-slate-400 mt-1">Welcome back, {user?.name}</p>
      </div>

      {user?.role === 'financial_decision_maker' && <ExecutiveDashboard />}
      {user?.role === 'sys_admin' && <SysAdminDashboard />}
      {user?.role === 'technician' && <TechnicianDashboard />}
      {user?.role === 'building_manager' && <ManagerDashboard />}
      {user?.role === 'security_officer' && <SecurityDashboard />}
    </div>
  );
}
