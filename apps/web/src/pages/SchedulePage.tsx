import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Truck,
  User,
  Phone,
  AlertTriangle,
  Download,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { DisputeModal } from '../components/DisputeModal';

interface SchedulePageProps {
  navigate?: (path: string) => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const SchedulePage: React.FC<SchedulePageProps> = ({ navigate }) => {
  const { t } = useLanguage();
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.citizen.getSchedule();
      setScheduleData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ward collection schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleExportIcs = () => {
    const url = api.citizen.getIcsDownloadUrl();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greenpay-ward-schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getWasteTypeBadge = (type: string) => {
    switch (type) {
      case 'WET':
        return {
          label: t('schedule.type_wet') || 'Wet Organic Waste',
          color: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
          dot: 'bg-[#10B981]',
        };
      case 'DRY':
        return {
          label: t('schedule.type_dry') || 'Dry Recyclables',
          color: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30',
          dot: 'bg-[#3B82F6]',
        };
      case 'HAZARDOUS_EWASTE':
      case 'HAZARDOUS':
      case 'EWASTE':
        return {
          label: t('schedule.type_hazardous') || 'Hazardous & E-Waste',
          color: 'bg-[#EAB308]/15 text-[#EAB308] border-[#EAB308]/30',
          dot: 'bg-[#EAB308]',
        };
      default:
        return {
          label: type,
          color: 'bg-[#041B15] text-[#A7B9A8] border-white/10',
          dot: 'bg-[#A7B9A8]',
        };
    }
  };

  // Filter schedules and upcoming events
  const filteredSchedules = scheduleData?.weekly_schedules?.filter((s: any) => {
    if (filterType === 'ALL') return true;
    return s.waste_type === filterType;
  }) || [];

  const filteredUpcoming = scheduleData?.upcoming_events?.filter((e: any) => {
    if (filterType === 'ALL') return true;
    return e.waste_type === filterType;
  }) || [];

  const nextPickup = scheduleData?.next_pickup;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 text-slate-900 dark:text-[#F4F7F0]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">MUNICIPAL SOLID WASTE LOGISTICS</span>
            {scheduleData?.ward_name && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#A7B9A8] border border-slate-200 dark:border-white/10">
                Ward: {scheduleData.ward_name} • {scheduleData.zone} Zone
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
            {t('schedule.title') || 'Ward Collection Schedules'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-2xl">
            {t('schedule.subtitle') ||
              'Real-time municipal doorstep collection timings, assigned vehicles, and seasonal route adjustments.'}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportIcs}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-2 transition shadow-sm"
            title="Download RFC 5545 calendar subscription file"
          >
            <Download className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
            <span>{t('schedule.btn_export_ics') || 'Export to iCal (.ics)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDisputeOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t('schedule.btn_report_missed') || 'Report Missed Pickup'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Product Identity Clarification Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#062B20] border border-emerald-300 dark:border-[#D7FF35]/30 flex items-start gap-3 text-xs">
        <Sparkles className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-900 dark:text-white">GreenPay Earning Mechanism</span>
          <p className="text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
            Green Points are earned <strong>exclusively during Dry Recyclables collection rounds</strong> when handing over segregated materials from the 8 approved dry categories (Aluminium & Metal, PET Bottles, Other Recyclable Plastics, Newspapers & Magazines, Cardboard, Glass Bottles, Textiles, and Mixed Paper) to authorised staff with calibrated digital scales. Other municipal sanitation rounds support civic hygiene and do not earn Green Points.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {[
          { id: 'ALL', label: t('schedule.filter_all') || 'All Streams' },
          { id: 'WET', label: t('schedule.type_wet') || 'Wet Organic (Green)' },
          { id: 'DRY', label: t('schedule.type_dry') || 'Dry Recyclables (Blue)' },
          { id: 'HAZARDOUS_EWASTE', label: t('schedule.type_hazardous') || 'Hazardous / E-Waste' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-2 rounded-xl transition ${
              filterType === tab.id
                ? 'bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold shadow-sm dark:shadow-glow-lime'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#041B15] dark:text-[#A7B9A8] dark:hover:text-white border border-slate-200 dark:border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3 font-mono text-xs text-slate-500 dark:text-[#A7B9A8]">
          <div className="w-8 h-8 border-2 border-emerald-600 dark:border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading verified ward schedule data...</p>
        </div>
      ) : (
        <>
          {/* Hero Card: Next Scheduled Pickup */}
          {nextPickup && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Truck className="w-48 h-48 text-emerald-800 dark:text-[#D7FF35]" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#A7B9A8] block">
                    {t('schedule.next_pickup_label') || 'Next Doorstep Collection'}
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {nextPickup.countdown}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        getWasteTypeBadge(nextPickup.waste_type).color
                      }`}
                    >
                      {getWasteTypeBadge(nextPickup.waste_type).label}
                    </span>
                  </div>
                </div>

                {nextPickup.can_report_missed && (
                  <button
                    type="button"
                    onClick={() => setIsDisputeOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t('schedule.not_collected_today') || 'Not collected yet today?'}</span>
                  </button>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8] block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-700 dark:text-[#D7FF35]" />
                    Collection Window
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {nextPickup.start_time} – {nextPickup.end_time}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">{nextPickup.day_name}, {nextPickup.date}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8] block flex items-center gap-1">
                    <Truck className="w-3 h-3 text-blue-600 dark:text-[#3B82F6]" />
                    Assigned Vehicle
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{nextPickup.vehicle_number}</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">Dry-Waste Electric Tipper (Pilot)</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8] block flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-600 dark:text-[#10B981]" />
                    Supervisor
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{nextPickup.supervisor_name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">{nextPickup.supervisor_contact}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8] block flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-[#D7FF35]" />
                    Source Segregation
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] font-sans leading-snug line-clamp-2">
                    {nextPickup.instructions}
                  </p>
                </div>
              </div>

              {nextPickup.override_reason && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Notice: {nextPickup.override_reason}</span>
                </div>
              )}
            </div>
          )}

          {/* Active Overrides Notice (if any) */}
          {scheduleData?.overrides?.length > 0 && (
            <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 font-mono uppercase">
                <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Upcoming Municipal Holiday & Route Adjustments</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {scheduleData.overrides.map((ovr: any) => (
                  <div key={ovr.id} className="p-3 rounded-xl bg-white dark:bg-[#041B15] border border-slate-200 dark:border-white/5 space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-900 dark:text-white font-bold">{ovr.override_date}</span>
                      <span className={ovr.is_cancelled ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-blue-600 dark:text-blue-400 font-semibold'}>
                        {ovr.is_cancelled ? 'Collection Cancelled' : 'Rescheduled'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-[#A7B9A8] text-[11px]">{ovr.reason}</p>
                    {ovr.rescheduled_start_time && (
                      <p className="text-slate-500 dark:text-[#A7B9A8]/70 text-[10px] font-mono">
                        New Timing: {ovr.rescheduled_start_time} – {ovr.rescheduled_end_time}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Interactive Schedule Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
                  <span>{t('schedule.weekly_grid_title') || 'Weekly Collection Timetable'}</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-[#A7B9A8]">
                  Standard recurring weekly timetable for Ward {scheduleData?.ward_name}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((item: any) => {
                const dayLabel =
                  item.day_of_week === -1
                    ? 'Daily (Mon–Sun)'
                    : DAYS_OF_WEEK[item.day_of_week] || 'Weekly';
                const badge = getWasteTypeBadge(item.waste_type);

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-3 shadow-sm dark:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{dayLabel}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 font-mono text-[11px] text-slate-600 dark:text-[#A7B9A8] pt-1 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-[#A7B9A8] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-700 dark:text-[#D7FF35]" /> Time:
                        </span>
                        <span className="text-slate-900 dark:text-white font-bold">{item.start_time} – {item.end_time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-[#A7B9A8] flex items-center gap-1">
                          <Truck className="w-3 h-3 text-blue-600 dark:text-[#3B82F6]" /> Vehicle:
                        </span>
                        <span className="text-slate-900 dark:text-white">{item.vehicle_number || 'Route Tipper'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-[#A7B9A8] flex items-center gap-1">
                          <User className="w-3 h-3 text-emerald-600 dark:text-[#10B981]" /> Supervisor:
                        </span>
                        <span className="text-slate-900 dark:text-white">{item.supervisor_name || 'Ward Officer'}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] font-sans leading-relaxed pt-1">
                      {item.instructions}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming 14-Day Calendar Timeline */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
                <span>Next 14 Days Doorstep Chronology</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500 dark:text-[#A7B9A8]">
                {filteredUpcoming.length} scheduled visits
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-mono">
              {filteredUpcoming.slice(0, 7).map((ev: any, idx: number) => {
                const badge = getWasteTypeBadge(ev.waste_type);
                return (
                  <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-[#D7FF35] shrink-0" />
                      <div>
                        <span className="text-slate-900 dark:text-white font-bold">{ev.day_name}, {ev.date}</span>
                        <span className="text-slate-500 dark:text-[#A7B9A8] ml-2">({ev.start_time} – {ev.end_time})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8] truncate max-w-[200px]">
                        {ev.vehicle_number}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Missed Pickup Dispute Modal */}
      <DisputeModal
        isOpen={isDisputeOpen}
        onClose={() => setIsDisputeOpen(false)}
        onSuccess={() => {
          setIsDisputeOpen(false);
          fetchSchedule();
        }}
      />
    </div>
  );
};
