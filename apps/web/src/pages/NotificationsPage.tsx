import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, Shield, Award, RefreshCw, Calendar, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiClient } from '../services/api';

interface NotificationItem {
  id: string;
  category: string;
  title_key: string;
  message_key: string;
  params: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

interface NotificationsPageProps {
  navigate?: (path: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ navigate }) => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<NotificationItem[]>('/citizen/notifications?limit=50');
      setNotifications(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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

  const filtered =
    filter === 'ALL'
      ? notifications
      : notifications.filter((n) => n.category === filter);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'SECURITY_NOTICE':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case 'COLLECTION_LOGGED':
        return <Award className="w-4 h-4 text-[#D7FF35]" />;
      case 'CREDITS_MODIFIED':
        return <RefreshCw className="w-4 h-4 text-sky-400" />;
      case 'SCHEDULE_CHANGE':
      case 'REMINDER':
        return <Calendar className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#A7B9A8]" />;
    }
  };

  const categories = [
    { key: 'ALL', label: t('notifications.all') || 'All Notices' },
    { key: 'COLLECTION_LOGGED', label: t('notifications.collections') || 'Collections' },
    { key: 'CREDITS_MODIFIED', label: t('notifications.credits') || 'Credits' },
    { key: 'SECURITY_NOTICE', label: t('notifications.security') || 'Security' },
    { key: 'REMINDER', label: t('notifications.reminders') || 'Reminders' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 text-slate-900 dark:text-[#F4F7F0]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            type="button"
            onClick={() => navigate?.('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('action.back_to_dashboard') || 'Back to Dashboard'}</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>{t('notifications.title') || 'Notification Centre'}</span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30 font-bold">
              {notifications.filter((n) => !n.is_read).length} {t('notifications.unread') || 'unread'}
            </span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
            {t('notifications.subtitle') || 'Audit log of doorstep collections, score calculations, and security notices.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={notifications.every((n) => n.is_read)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 dark:hover:border-white/20 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium dark:text-[#F4F7F0] flex items-center gap-2 transition"
          >
            <CheckCheck className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
            <span>{t('notifications.mark_all_read') || 'Mark all as read'}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filter === c.key
                ? 'bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold shadow-sm dark:shadow-glow-lime'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#062B20] dark:text-[#A7B9A8] dark:hover:text-white border border-slate-200 dark:border-white/10'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 dark:text-[#A7B9A8] flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-emerald-600 dark:border-[#D7FF35] border-t-transparent rounded-full animate-spin" />
          <span>Loading notifications...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 text-center flex flex-col items-center gap-3 shadow-sm dark:shadow-md">
          <Bell className="w-10 h-10 text-slate-300 dark:text-[#A7B9A8]/40 stroke-1" />
          <p className="text-sm text-slate-900 dark:text-white font-medium">
            {t('notifications.empty') || 'No notifications in this view.'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#A7B9A8] max-w-sm">
            {t('notifications.empty_desc') || 'Verified collections and updates will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className={`p-4 rounded-2xl border transition flex items-start gap-4 ${
                !n.is_read
                  ? 'bg-emerald-50/70 dark:bg-[#0D4935] border-emerald-300 dark:border-[#D7FF35]/30 shadow-sm'
                  : 'bg-white dark:bg-[#062B20]/60 border-slate-200 dark:border-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#041B15] border border-slate-200 dark:border-white/10 flex-shrink-0">
                {getCategoryIcon(n.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t(n.title_key, n.params) || n.title_key}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-[#A7B9A8] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-[#D7FF35] ring-4 ring-emerald-200 dark:ring-[#D7FF35]/20" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 leading-relaxed">
                  {t(n.message_key, n.params) || n.message_key}
                </p>

                <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-[#A7B9A8] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-transparent">
                    {n.category.replace('_', ' ')}
                  </span>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 dark:text-[#D7FF35] dark:hover:text-[#C4F020] transition font-medium"
                    >
                      {t('notifications.mark_read') || 'Mark read'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
