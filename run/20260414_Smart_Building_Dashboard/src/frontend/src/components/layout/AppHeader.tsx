'use client';

import { Bell, Building2, ChevronDown, Menu, LogOut, User, Server, Briefcase, Hotel } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useVertical } from '@/lib/vertical';
import { api } from '@/lib/api';

interface Building {
  id: string;
  name: string;
  type?: string;
  vertical?: 'data_center' | 'office' | 'hospitality';
  address?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  severity?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface AppHeaderProps {
  onMenuClick: () => void;
  selectedBuildingId: string | null;
  onBuildingChange: (id: string) => void;
}

export default function AppHeader({ onMenuClick, selectedBuildingId, onBuildingChange }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const { vertical: currentVertical, definition: vertical, setVertical } = useVertical();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBuildingMenu, setShowBuildingMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const buildingRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'sys_admin';

  // Fetch buildings — admin fetches filtered by vertical; others get their single building
  useEffect(() => {
    const params: Record<string, string> = {};
    if (isAdmin) params.vertical = currentVertical;

    api.get<{ data: Building[] }>('/buildings', params)
      .then((res) => {
        const list = res.data;
        setBuildings(list);
        // Auto-select first building of this vertical if current selection is not in the list
        if (list.length > 0 && !list.some(b => b.id === selectedBuildingId)) {
          onBuildingChange(list[0].id);
        }
      })
      .catch(() => {});
  }, [currentVertical, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // For non-admin: lock vertical to their building's vertical on first load
  useEffect(() => {
    if (!isAdmin && buildings.length === 1 && buildings[0].vertical) {
      setVertical(buildings[0].vertical);
    }
  }, [buildings, isAdmin, setVertical]);

  useEffect(() => {
    api.get<{ data: Notification[]; meta?: { total: number } }>('/notifications', { limit: 10 })
      .then((res) => {
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (buildingRef.current && !buildingRef.current.contains(e.target as Node)) setShowBuildingMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await api.patch('/notifications/read', { ids: unreadIds });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const VERTICAL_COLORS: Record<string, string> = {
    data_center: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    office: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    hospitality: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };
  const VERTICAL_ICONS: Record<string, React.ElementType> = {
    data_center: Server,
    office: Briefcase,
    hospitality: Hotel,
  };
  const VERTICAL_LABELS: Record<string, string> = {
    data_center: 'Data Center',
    office: 'Office',
    hospitality: 'Hospitality',
  };

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4 fixed top-0 left-0 right-0 z-40">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-400 hover:text-white">
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo */}
      <a href="/" className="flex items-center gap-2 mr-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="text-base font-bold text-slate-50">INTEGRA</p>
          <p className="text-[9px] tracking-widest text-cyan-400">SMART BUILDING</p>
        </div>
      </a>

      {/* Vertical badge — always shows current vertical */}
      {(() => {
        const v = currentVertical;
        const VIcon = VERTICAL_ICONS[v] ?? Building2;
        return (
          <span className={`hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide border px-2.5 py-1 rounded-full ${VERTICAL_COLORS[v] || ''}`}>
            <VIcon className="h-3.5 w-3.5" />
            {VERTICAL_LABELS[v]?.toUpperCase() ?? v.toUpperCase()}
          </span>
        );
      })()}

      {/* Building selector */}
      <div ref={buildingRef} className="relative">
        {isAdmin ? (
          <>
            <button
              onClick={() => setShowBuildingMenu(!showBuildingMenu)}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="max-w-[180px] truncate">{selectedBuilding?.name ?? 'Select building'}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            {showBuildingMenu && buildings.length > 0 && (
              <div className="absolute top-full mt-1 left-0 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[280px] z-50">
                {buildings.map((b) => {
                  const bv = b.vertical || 'office';
                  const BIcon = VERTICAL_ICONS[bv] ?? Building2;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        onBuildingChange(b.id);
                        setShowBuildingMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-600 ${b.id === selectedBuildingId ? 'bg-slate-600/50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <BIcon className={`h-4 w-4 flex-shrink-0 ${b.id === selectedBuildingId ? 'text-blue-400' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`truncate ${b.id === selectedBuildingId ? 'text-blue-400 font-medium' : 'text-slate-200'}`}>{b.name}</div>
                          <div className="text-[10px] text-slate-500">{b.address}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Non-admin: locked to their assigned building */
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5 text-sm cursor-default">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="max-w-[180px] truncate text-slate-200">{selectedBuilding?.name ?? 'Loading...'}</span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-slate-400 hover:text-white transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <div className="absolute top-full mt-1 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-xl w-80 max-h-96 overflow-y-auto z-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-600">
              <span className="text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2 border-b border-slate-600/50 last:border-0 ${!n.isRead ? 'bg-slate-600/30' : ''}`}
                >
                  <p className="text-sm font-medium text-slate-200">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* User menu */}
      <div ref={userRef} className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 hover:bg-slate-700 rounded-lg px-2 py-1 transition-colors"
        >
          <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm text-slate-200 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-400">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </button>
        {showUserMenu && (
          <div className="absolute top-full mt-1 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[160px] z-50">
            <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600">
              <User className="h-4 w-4" /> Settings
            </a>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-600"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
