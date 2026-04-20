'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  AlertTriangle,
  Zap,
  FileText,
  ShieldCheck,
  Wrench,
  Settings,
  KeyRound,
  CalendarCheck,
  Ticket,
  Car,
  TrendingUp,
  Activity,
  Hotel,
} from 'lucide-react';
import { useAuth, UserRole } from '@/lib/auth';

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const roleBottomNavItems: Record<UserRole, BottomNavItem[]> = {
  sys_admin: [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Alerts', href: '/alerts', icon: AlertTriangle },
    { label: 'Energy', href: '/energy', icon: Zap },
    { label: 'Reports', href: '/reports', icon: FileText },
  ],
  financial_decision_maker: [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Financial', href: '/financial', icon: TrendingUp },
    { label: 'Energy', href: '/energy', icon: Zap },
    { label: 'Reports', href: '/reports', icon: FileText },
  ],
  technician: [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Alerts', href: '/alerts', icon: AlertTriangle },
    { label: 'HSE', href: '/hse-compliance', icon: ShieldCheck },
    { label: 'Assets', href: '/assets', icon: Wrench },
  ],
  building_manager: [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'OpEx', href: '/operational-excellence', icon: Activity },
    { label: 'Tickets', href: '/helpdesk', icon: Ticket },
    { label: 'Reports', href: '/reports', icon: FileText },
  ],
  security_officer: [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Access', href: '/access-control', icon: KeyRound },
    { label: 'Alerts', href: '/alerts', icon: AlertTriangle },
    { label: 'HSE', href: '/hse-compliance', icon: ShieldCheck },
  ],
  tenant: [
    { label: 'My Day', href: '/me', icon: LayoutDashboard },
    { label: 'Key', href: '/access-control', icon: KeyRound },
    { label: 'Book', href: '/booking', icon: CalendarCheck },
    { label: 'Help', href: '/helpdesk', icon: Ticket },
    { label: 'Park', href: '/parking', icon: Car },
  ],
  guest: [
    { label: 'My Stay', href: '/me', icon: Hotel },
    { label: 'Key', href: '/access-control', icon: KeyRound },
    { label: 'Help', href: '/helpdesk', icon: Ticket },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
};

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const items = roleBottomNavItems[user.role] || roleBottomNavItems.sys_admin;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-800 border-t border-slate-700 flex items-center justify-around px-2 lg:hidden z-40">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors min-w-[56px]',
              isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
