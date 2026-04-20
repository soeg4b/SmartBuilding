'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Zap,
  Thermometer,
  Wrench,
  Map,
  Globe,
  Box,
  AlertTriangle,
  BookOpen,
  ShieldCheck,
  FileText,
  Settings,
  X,
  Activity,
} from 'lucide-react';
import { useAuth, UserRole } from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['financial_decision_maker', 'sys_admin', 'technician'] },
  { label: 'Energy', href: '/energy', icon: Zap, roles: ['financial_decision_maker', 'sys_admin'] },
  { label: 'Environment', href: '/environment', icon: Thermometer, roles: ['sys_admin', 'technician'] },
  { label: 'Assets', href: '/assets', icon: Wrench, roles: ['sys_admin', 'technician'] },
  { label: 'Floor Plans', href: '/floor-plans', icon: Map, roles: ['sys_admin', 'technician'] },
  { label: 'Building Map', href: '/building-map', icon: Globe, roles: ['financial_decision_maker', 'sys_admin', 'technician'] },
  { label: 'Digital Twin', href: '/digital-twin', icon: Box, roles: ['sys_admin', 'technician'] },
  { label: 'Alerts', href: '/alerts', icon: AlertTriangle, roles: ['sys_admin', 'technician'] },
  { label: 'Incidents', href: '/alerts/incidents', icon: Activity, roles: ['sys_admin', 'technician'] },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, roles: ['technician', 'sys_admin'] },
  { label: 'HSE Compliance', href: '/hse-compliance', icon: ShieldCheck, roles: ['sys_admin', 'technician'] },
  { label: 'Reports', href: '/reports', icon: FileText, roles: ['financial_decision_maker', 'sys_admin'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['financial_decision_maker', 'sys_admin', 'technician'] },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={clsx(
          'fixed top-16 left-0 bottom-0 w-64 bg-slate-800 border-r border-slate-700 z-50 transition-transform duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button for mobile */}
        <div className="flex items-center justify-end p-2 lg:hidden">
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export { navItems };
