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
  Server,
  Snowflake,
  KeyRound,
  CalendarCheck,
  Car,
  Ticket,
  Leaf,
  TrendingUp,
  Trophy,
  BedDouble,
  Sparkles,
  ConciergeBell,
  Building2,
  UsersRound,
} from 'lucide-react';
import { useAuth, UserRole } from '@/lib/auth';
import { useVertical, BuildingVertical, VERTICALS } from '@/lib/vertical';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const ROLES_ALL: UserRole[] = ['financial_decision_maker', 'sys_admin', 'technician', 'building_manager', 'security_officer'];
const ROLES_OPS: UserRole[] = ['sys_admin', 'technician', 'building_manager', 'security_officer'];
const ROLES_EXEC: UserRole[] = ['financial_decision_maker', 'sys_admin', 'building_manager'];
const ROLES_TENANT: UserRole[] = ['tenant', 'guest'];

const tenantNav: NavItem[] = [
  { label: 'My Day', href: '/me', icon: LayoutDashboard, roles: ROLES_TENANT },
  { label: 'Mobile Key', href: '/access-control', icon: KeyRound, roles: ROLES_TENANT },
  { label: 'Book a Room', href: '/booking', icon: CalendarCheck, roles: ROLES_TENANT },
  { label: 'My Parking', href: '/parking', icon: Car, roles: ROLES_TENANT },
  { label: 'Helpdesk', href: '/helpdesk', icon: Ticket, roles: ROLES_TENANT },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ROLES_TENANT },
];

const commonExecutive: NavItem[] = [
  { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard, roles: ROLES_ALL },
  { label: 'ESG & Sustainability', href: '/esg', icon: Leaf, roles: ROLES_EXEC },
  { label: 'Financial Optimization', href: '/financial', icon: TrendingUp, roles: ROLES_EXEC },
  { label: 'Operational Excellence', href: '/operational-excellence', icon: Trophy, roles: ROLES_EXEC },
  { label: 'Reports', href: '/reports', icon: FileText, roles: ROLES_EXEC },
];

const commonInfra: NavItem[] = [
  { label: 'Energy', href: '/energy', icon: Zap, roles: ROLES_ALL },
  { label: 'Environment', href: '/environment', icon: Thermometer, roles: ROLES_OPS },
  { label: 'Assets', href: '/assets', icon: Wrench, roles: ROLES_OPS },
  { label: 'Predictive Maintenance', href: '/predictive-maintenance', icon: Activity, roles: ROLES_OPS },
  { label: 'Floor Plans', href: '/floor-plans', icon: Map, roles: ROLES_OPS },
  { label: 'Digital Twin', href: '/digital-twin', icon: Box, roles: ROLES_OPS },
];

const commonSecurity: NavItem[] = [
  { label: 'Access Control (IAM)', href: '/access-control', icon: KeyRound, roles: ROLES_ALL },
  { label: 'Alerts', href: '/alerts', icon: AlertTriangle, roles: ROLES_OPS },
  { label: 'Incidents', href: '/alerts/incidents', icon: Activity, roles: ROLES_OPS },
  { label: 'HSE Compliance', href: '/hse-compliance', icon: ShieldCheck, roles: ROLES_OPS },
];

const commonFooter: NavItem[] = [
  { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, roles: ROLES_OPS },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ROLES_ALL },
];

const verticalSections: Record<BuildingVertical, NavSection> = {
  data_center: {
    title: 'Data Center Ops',
    items: [
      { label: 'Rack & Power', href: '/datacenter/racks', icon: Server, roles: ROLES_ALL },
      { label: 'Cooling & PUE', href: '/datacenter/cooling', icon: Snowflake, roles: ROLES_ALL },
      { label: 'Building Map', href: '/building-map', icon: Globe, roles: ROLES_ALL },
    ],
  },
  office: {
    title: 'Office Experience',
    items: [
      { label: 'Room Booking', href: '/booking', icon: CalendarCheck, roles: ROLES_ALL },
      { label: 'Smart Parking', href: '/parking', icon: Car, roles: ROLES_ALL },
      { label: 'Guest Management', href: '/guest-management', icon: UsersRound, roles: ROLES_ALL },
      { label: 'Tenant Helpdesk', href: '/helpdesk', icon: Ticket, roles: ROLES_ALL },
      { label: 'Building Map', href: '/building-map', icon: Globe, roles: ROLES_ALL },
    ],
  },
  hospitality: {
    title: 'Hospitality Ops',
    items: [
      { label: 'Rooms & Occupancy', href: '/hospitality/rooms', icon: BedDouble, roles: ROLES_ALL },
      { label: 'Housekeeping', href: '/hospitality/housekeeping', icon: Sparkles, roles: ROLES_OPS },
      { label: 'Guest Services', href: '/hospitality/guest-services', icon: ConciergeBell, roles: ROLES_ALL },
      { label: 'Guest Management', href: '/guest-management', icon: UsersRound, roles: ROLES_ALL },
      { label: 'Mobile Key', href: '/access-control', icon: KeyRound, roles: ROLES_ALL },
      { label: 'Smart Parking', href: '/parking', icon: Car, roles: ROLES_ALL },
    ],
  },
};

function buildSections(vertical: BuildingVertical): NavSection[] {
  return [
    { title: 'Executive', items: commonExecutive },
    verticalSections[vertical],
    { title: 'Infrastructure', items: commonInfra },
    { title: 'Security & Safety', items: commonSecurity },
    { title: 'Workspace', items: commonFooter },
  ];
}

function buildTenantSections(): NavSection[] {
  return [{ title: 'My Building', items: tenantNav }];
}

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { vertical, setVertical, definition } = useVertical();

  const isTenantView = user?.role === 'tenant' || user?.role === 'guest';
  const sections = isTenantView ? buildTenantSections() : buildSections(vertical);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={clsx(
          'fixed top-16 left-0 bottom-0 w-64 bg-slate-800 border-r border-slate-700 z-50 transition-transform duration-200 overflow-y-auto',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-end p-2 lg:hidden">
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isTenantView && (
          <div className="px-3 pt-2 pb-3 border-b border-slate-700/60">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 px-1">Building Vertical</p>
            <div className={clsx('rounded-lg p-2 bg-gradient-to-br', definition.accent)}>
              <div className="flex items-center gap-2 text-white text-xs font-bold">
                <Building2 className="h-4 w-4" />
                {definition.shortLabel}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {VERTICALS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVertical(v.id)}
                  title={v.label}
                  className={clsx(
                    'text-[10px] font-semibold px-1.5 py-1.5 rounded-md transition-colors',
                    vertical === v.id
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  )}
                >
                  {v.shortLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-4 px-3 py-3">
          {sections.map((section) => {
            const visibleItems = section.items.filter((item) => user && item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 px-2">{section.title}</p>
                <div className="flex flex-col gap-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
