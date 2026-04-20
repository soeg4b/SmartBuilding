'use client';

import { Bell, Building2, ChevronDown, Menu, LogOut, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useVertical } from '@/lib/vertical';
import { api } from '@/lib/api';

interface Building {
  id: string;
  name: string;
  type?: string;
  vertical?: 'data_center' | 'office' | 'hospitality';
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
  const { definition: vertical, setVertical } = useVertical();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBuildingMenu, setShowBuildingMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const buildingRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ data: Building[] }>('/buildings')
      .then((res) => {
        const list = res.data;
        setBuildings(list);
        if (!selectedBuildingId && list.length > 0) {
          onBuildingChange(list[0].id);
        }
      })
      .catch(() => {});
  }, [selectedBuildingId, onBuildingChange]);

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

      {/* Vertical badge */}
      <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold tracking-wide bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-1 rounded-full mr-2">
        {vertical.shortLabel.toUpperCase()}
      </span>

      {/* Building selector */}
      <div ref={buildingRef} className="relative">
        <button
          onClick={() => setShowBuildingMenu(!showBuildingMenu)}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-1.5 text-sm transition-colors"
        >
          <Building2 className="h-4 w-4 text-slate-400" />
          <span className="max-w-[120px] truncate">{selectedBuilding?.name ?? 'Select building'}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
        {showBuildingMenu && buildings.length > 0 && (
          <div className="absolute top-full mt-1 left-0 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[200px] z-50">
            {buildings.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  onBuildingChange(b.id);
                  if (b.vertical) setVertical(b.vertical);
                  setShowBuildingMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-600 ${b.id === selectedBuildingId ? 'text-blue-400' : 'text-slate-200'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{b.name}</span>
                  {b.type && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600 text-slate-300 uppercase">{b.type}</span>}
                </div>
              </button>
            ))}
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
