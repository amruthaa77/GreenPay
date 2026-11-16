import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

export interface NotificationItem {
  id: string;
  category: string;
  title_key: string;
  message_key: string;
  params: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  navigate?: (path: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ navigate }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiClient.get<NotificationItem[]>('/citizen/notifications?limit=10');
      setNotifications(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // 1 minute poll
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/citizen/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/citizen/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-100 dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 hover:border-emerald-500 dark:hover:border-[#D7FF35]/40 text-slate-700 dark:text-[#A7B9A8] hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center min-w-[36px] min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-[#D7FF35]"
        aria-label={`Notifications: ${unreadCount} unread`}
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white dark:bg-[#D7FF35] dark:text-[#041B15] font-bold text-[10px] flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Notification center"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/15 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-black/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                {t('notifications.title') || 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-emerald-700 dark:text-[#D7FF35] hover:text-emerald-800 dark:hover:text-[#C4F020] font-medium flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('notifications.mark_all_read') || 'Mark all read'}</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-[#A7B9A8]">Loading notices...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-slate-300 dark:text-[#A7B9A8]/40 stroke-1" />
                <p className="text-xs text-slate-500 dark:text-[#A7B9A8]">
                  {t('notifications.empty') || 'You have no notifications right now.'}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                    n.is_read ? 'opacity-75 hover:opacity-100 bg-transparent' : 'bg-emerald-50/60 dark:bg-[#0D4935]/40 hover:bg-emerald-50 dark:hover:bg-[#0D4935]/70'
                  }`}
                >
                  <div className="mt-1">
                    {!n.is_read ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-[#D7FF35] block ring-4 ring-emerald-200 dark:ring-[#D7FF35]/20" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-neutral-600 block" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {t(n.title_key, n.params) || n.title_key}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] mt-0.5 line-clamp-2">
                      {t(n.message_key, n.params) || n.message_key}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-[#A7B9A8]">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(n.created_at)}</span>
                      <span className="mx-1">•</span>
                      <span className="font-mono uppercase text-[9px] text-slate-500 dark:text-[#A7B9A8]">
                        {n.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (navigate) navigate('/settings');
              }}
              className="text-slate-600 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white transition flex items-center gap-1 text-[11px]"
            >
              <span>{t('notifications.preferences') || 'Preferences'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (navigate) navigate('/notifications');
              }}
              className="text-emerald-700 dark:text-[#D7FF35] hover:text-emerald-800 dark:hover:text-[#C4F020] font-medium flex items-center gap-1 text-[11px]"
            >
              <span>{t('notifications.view_all') || 'View all'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
