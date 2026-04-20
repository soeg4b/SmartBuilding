'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Bell, Check, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useRealtime } from '@/hooks/useRealtime';
import { api } from '@/lib/api';
import type { AlertSeverity } from '@smart-building/shared/types';

interface Notification {
  id: string;
  title: string;
  message: string;
  severity?: AlertSeverity | null;
  isRead: boolean;
  alertId?: string | null;
  createdAt: string;
  isNew?: boolean;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const { latestAlert } = useRealtime();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ data: Notification[] }>('/notifications', { limit: 50 });
      setNotifications(res.data.map((n) => ({ ...n, isNew: false })));
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Real-time new alerts → push into notifications
  useEffect(() => {
    if (!latestAlert) return;
    const newNotif: Notification = {
      id: `rt-${latestAlert.id}-${Date.now()}`,
      title: latestAlert.severity === 'critical' ? 'Critical Alert' : 'New Alert',
      message: latestAlert.message,
      severity: latestAlert.severity,
      isRead: false,
      alertId: latestAlert.id,
      createdAt: latestAlert.triggeredAt,
      isNew: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, [latestAlert]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, isNew: false } : n))
    );
    try {
      await api.patch('/notifications/read', { ids: [id] });
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, isNew: false })));
    try {
      await api.patch('/notifications/read', { ids: unreadIds });
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    markRead(notif.id);
    if (notif.alertId) {
      router.push(`/alerts?id=${notif.alertId}`);
      onClose();
    }
  };

  // Group by severity
  const grouped = {
    critical: notifications.filter((n) => n.severity === 'critical'),
    warning: notifications.filter((n) => n.severity === 'warning'),
    info: notifications.filter((n) => !n.severity || n.severity === 'info'),
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const SeverityIcon = ({ severity }: { severity?: AlertSeverity | null }) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" />}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-slate-800 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-50">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-64px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Bell className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {/* Critical section */}
              {grouped.critical.length > 0 && (
                <NotificationGroup
                  title="Critical"
                  items={grouped.critical}
                  icon={<SeverityIcon severity="critical" />}
                  onItemClick={handleNotificationClick}
                  onMarkRead={markRead}
                />
              )}
              {/* Warning section */}
              {grouped.warning.length > 0 && (
                <NotificationGroup
                  title="Warning"
                  items={grouped.warning}
                  icon={<SeverityIcon severity="warning" />}
                  onItemClick={handleNotificationClick}
                  onMarkRead={markRead}
                />
              )}
              {/* Info section */}
              {grouped.info.length > 0 && (
                <NotificationGroup
                  title="Info"
                  items={grouped.info}
                  icon={<SeverityIcon severity="info" />}
                  onItemClick={handleNotificationClick}
                  onMarkRead={markRead}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function NotificationGroup({
  title,
  items,
  icon,
  onItemClick,
  onMarkRead,
}: {
  title: string;
  items: Notification[];
  icon: React.ReactNode;
  onItemClick: (n: Notification) => void;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50">
        {icon}
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</span>
        <span className="text-xs text-slate-500">({items.length})</span>
      </div>
      {items.map((notif) => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onClick={() => onItemClick(notif)}
          onMarkRead={() => onMarkRead(notif.id)}
        />
      ))}
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
  onMarkRead,
}: {
  notification: Notification;
  onClick: () => void;
  onMarkRead: () => void;
}) {
  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-700/30 cursor-pointer transition-all ${
        notification.isNew ? 'animate-slideIn bg-slate-700/20' : ''
      } ${!notification.isRead ? 'border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${notification.isRead ? 'text-slate-400' : 'text-slate-200 font-medium'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-slate-500 mt-1">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
          }}
          className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white shrink-0"
          title="Mark as read"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
