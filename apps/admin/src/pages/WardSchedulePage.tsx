import React, { useEffect, useState } from 'react';
import { adminApi, api } from '../services/api';
import {
  Calendar,
  Clock,
  PlusCircle,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Truck,
  Download,
  CalendarCheck,
  CalendarX
} from 'lucide-react';

interface ScheduleSlot {
  id: string;
  ward_id: string;
  waste_type: 'WET' | 'DRY' | 'HAZARDOUS_EWASTE';
  day_of_week: number;
  start_time: string;
  end_time: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'FIRST_SATURDAY';
  vehicle_number?: string;
  supervisor_name?: string;
  supervisor_contact?: string;
  instructions?: string;
  is_active: boolean;
}

interface ScheduleOverride {
  id: string;
  ward_id: string;
  override_date: string;
  waste_type: string;
  is_cancelled: boolean;
  rescheduled_date?: string;
  rescheduled_start_time?: string;
  rescheduled_end_time?: string;
  reason: string;
  created_at: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WardSchedulePage: React.FC = () => {
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SCHEDULES' | 'OVERRIDES'>('SCHEDULES');

  // Modal state for Create / Edit slot
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleSlot | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    waste_type: 'WET',
    day_of_week: 1,
    start_time: '07:00',
    end_time: '10:00',
    frequency: 'DAILY',
    vehicle_number: 'KA-01-EA-1024',
    supervisor_name: 'Field Supervisor',
    supervisor_contact: '+919845012345',
    instructions: 'Keep bins outside gate by 6:45 AM.',
  });

  // Modal state for Create Override
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    override_date: new Date().toISOString().slice(0, 10),
    waste_type: 'WET',
    is_cancelled: true,
    rescheduled_date: '',
    rescheduled_start_time: '07:00',
    rescheduled_end_time: '10:00',
    reason: 'Public Holiday (BBMP Sanitation Holiday)',
  });

  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadWards();
  }, []);

  useEffect(() => {
    if (selectedWardId) {
      loadSchedulesAndOverrides(selectedWardId);
    }
  }, [selectedWardId]);

  const loadWards = async () => {
    try {
      const data = await adminApi.admin.getWards();
      setWards(data);
      if (data && data.length > 0) {
        setSelectedWardId(data[0].id || data[0].ward_id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load wards');
    }
  };

  const loadSchedulesAndOverrides = async (wardId: string) => {
    try {
      setLoading(true);
      const data = await api.admin.getWardSchedules(wardId);
      setSchedules(data.schedules || []);
      setOverrides(data.overrides || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateSchedule = () => {
    setEditingSchedule(null);
    setScheduleForm({
      waste_type: 'WET',
      day_of_week: 1,
      start_time: '07:00',
      end_time: '10:00',
      frequency: 'DAILY',
      vehicle_number: 'KA-01-EA-1024',
      supervisor_name: 'Field Supervisor',
      supervisor_contact: '+919845012345',
      instructions: 'Keep bins outside gate by 6:45 AM.',
    });
    setShowScheduleModal(true);
  };

  const handleOpenEditSchedule = (slot: ScheduleSlot) => {
    setEditingSchedule(slot);
    setScheduleForm({
      waste_type: slot.waste_type,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      frequency: slot.frequency,
      vehicle_number: slot.vehicle_number || '',
      supervisor_name: slot.supervisor_name || '',
      supervisor_contact: slot.supervisor_contact || '',
      instructions: slot.instructions || '',
    });
    setShowScheduleModal(true);
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWardId) return;

    try {
      setSubmitting(true);
      if (editingSchedule) {
        await api.admin.updateWardSchedule(editingSchedule.id, scheduleForm);
        setToastMessage('Schedule slot updated successfully.');
      } else {
        await api.admin.createWardSchedule(selectedWardId, scheduleForm);
        setToastMessage('New recurring schedule slot added.');
      }
      setShowScheduleModal(false);
      await loadSchedulesAndOverrides(selectedWardId);
    } catch (err: any) {
      alert(err.message || 'Failed to save schedule slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule slot?')) return;
    try {
      await api.admin.deleteWardSchedule(id);
      setToastMessage('Schedule slot deleted.');
      await loadSchedulesAndOverrides(selectedWardId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete schedule slot');
    }
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWardId) return;

    try {
      setSubmitting(true);
      await api.admin.createWardOverride(selectedWardId, {
        override_date: overrideForm.override_date,
        waste_type: overrideForm.waste_type,
        is_cancelled: overrideForm.is_cancelled,
        rescheduled_date: overrideForm.is_cancelled ? null : overrideForm.rescheduled_date,
        rescheduled_start_time: overrideForm.is_cancelled ? null : overrideForm.rescheduled_start_time,
        rescheduled_end_time: overrideForm.is_cancelled ? null : overrideForm.rescheduled_end_time,
        reason: overrideForm.reason.trim(),
      });
      setToastMessage('Schedule override announced.');
      setShowOverrideModal(false);
      await loadSchedulesAndOverrides(selectedWardId);
    } catch (err: any) {
      alert(err.message || 'Failed to record schedule override');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this override?')) return;
    try {
      await api.admin.deleteWardOverride(id);
      setToastMessage('Override cancelled.');
      await loadSchedulesAndOverrides(selectedWardId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete override');
    }
  };

  const selectedWard = wards.find((w) => (w.id || w.ward_id) === selectedWardId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white dark:bg-[#D7FF35] dark:text-[#041B15] text-sm font-bold shadow-sm dark:shadow-glow-lime flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30 font-bold">
              Phase C • Operations
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">Bengaluru Municipal Schedules</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-emerald-700 dark:text-[#D7FF35]" />
            Ward Collection Schedules
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
            Manage recurring doorstep collection timetables, vehicle deployments, and holiday overrides.
          </p>
        </div>

        {/* Actions & Ward Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Ward Select Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="ward-select" className="text-xs font-mono text-slate-700 dark:text-[#A7B9A8]">
              Ward:
            </label>
            <select
              id="ward-select"
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
            >
              {wards.map((w) => (
                <option key={w.id || w.ward_id} value={w.id || w.ward_id}>
                  {w.name || w.ward_name} ({w.zone || 'Bengaluru'})
                </option>
              ))}
            </select>
          </div>

          {/* iCal Export Button */}
          {selectedWardId && (
            <a
              href={api.admin.getWardIcsUrl(selectedWardId)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-[#F4F7F0] flex items-center gap-1.5 transition"
              title="Download RFC 5545 iCalendar subscription"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-[#D7FF35]" />
              <span>Export .ICS</span>
            </a>
          )}

          {/* Create Buttons */}
          <button
            type="button"
            onClick={handleOpenCreateSchedule}
            className="px-3.5 py-2 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs flex items-center gap-1.5 transition shadow-sm dark:shadow-glow-lime"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Slot</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOverrideModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-medium text-xs flex items-center gap-1.5 hover:bg-amber-200 dark:hover:bg-amber-500/25 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Add Override</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULES')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'SCHEDULES'
              ? 'border-emerald-600 text-emerald-700 dark:border-[#D7FF35] dark:text-[#D7FF35]'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Weekly Recurring Slots ({schedules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('OVERRIDES')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'OVERRIDES'
              ? 'border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white'
          }`}
        >
          <CalendarX className="w-4 h-4" />
          <span>Holiday & Route Overrides ({overrides.length})</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-[#D7FF35] animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-slate-600 dark:text-[#A7B9A8]">Loading schedules for {selectedWard?.name || 'ward'}...</p>
        </div>
      ) : activeTab === 'SCHEDULES' ? (
        /* Schedules Table */
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-[#0D4935] border border-slate-200 dark:border-white/10">
              <Calendar className="w-10 h-10 text-slate-400 dark:text-[#A7B9A8]/50 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No schedules configured</h3>
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-sm mx-auto">
                No active collection slots defined for this ward. Click "Add Slot" above to define doorstep pickup hours.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D4935] shadow-sm dark:shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#062B20] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Day of Week</th>
                    <th className="py-3 px-4">Stream</th>
                    <th className="py-3 px-4">Collection Window</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Vehicle & Supervisor</th>
                    <th className="py-3 px-4">Instructions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-800 dark:text-[#F4F7F0]">
                  {schedules.map((slot) => {
                    const isWet = slot.waste_type === 'WET';
                    const isDry = slot.waste_type === 'DRY';
                    return (
                      <tr key={slot.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {DAY_NAMES[slot.day_of_week]}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                              isWet
                                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                                : isDry
                                ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30'
                                : 'bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30'
                            }`}
                          >
                            {isWet ? 'Wet Organic' : isDry ? 'Dry Recyclables' : 'Hazardous / E-Waste'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-[#F4F7F0]">
                          {slot.start_time} – {slot.end_time}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-[#A7B9A8] font-mono text-[11px]">
                          {slot.frequency}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-slate-900 dark:text-[#F4F7F0] flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-500 dark:text-[#A7B9A8]" />
                            <span>{slot.vehicle_number || 'BBMP-TRUCK'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#A7B9A8] mt-0.5">
                            {slot.supervisor_name} ({slot.supervisor_contact})
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-[#A7B9A8] max-w-xs truncate" title={slot.instructions}>
                          {slot.instructions || 'Standard segregation protocol'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSchedule(slot)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-[#F4F7F0] dark:hover:text-white transition"
                              title="Edit slot"
                              aria-label="Edit schedule slot"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(slot.id)}
                              className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 transition"
                              title="Delete slot"
                              aria-label="Delete schedule slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Overrides Table */
        <div className="space-y-4">
          {overrides.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-[#0D4935] border border-slate-200 dark:border-white/10">
              <CalendarCheck className="w-10 h-10 text-slate-400 dark:text-[#A7B9A8]/50 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No active schedule overrides</h3>
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-sm mx-auto">
                Doorstep collections run on standard schedule. Use "Add Override" to announce festival holidays or route maintenance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D4935] shadow-sm dark:shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#062B20] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Stream</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Rescheduled Details</th>
                    <th className="py-3 px-4">Public Reason</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-800 dark:text-[#F4F7F0]">
                  {overrides.map((ov) => (
                    <tr key={ov.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {ov.override_date}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-[#F4F7F0]">
                        {ov.waste_type}
                      </td>
                      <td className="py-3.5 px-4">
                        {ov.is_cancelled ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30">
                            Suspended / Cancelled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                            Rescheduled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-[#F4F7F0]">
                        {ov.rescheduled_date ? (
                          <span>
                            {ov.rescheduled_date} ({ov.rescheduled_start_time} – {ov.rescheduled_end_time})
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-[#A7B9A8]/50">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-[#F4F7F0] max-w-xs truncate" title={ov.reason}>
                        {ov.reason}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteOverride(ov.id)}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 transition"
                          title="Remove override"
                          aria-label="Remove schedule override"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schedule Slot Modal (Create/Edit) */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/15 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
                <span>{editingSchedule ? 'Edit Collection Slot' : 'Add Collection Slot'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-500 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Waste Stream</label>
                  <select
                    value={scheduleForm.waste_type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, waste_type: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  >
                    <option value="WET">Wet Organic Waste</option>
                    <option value="DRY">Dry Recyclables</option>
                    <option value="HAZARDOUS_EWASTE">Hazardous / E-Waste</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Day of Week</label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value, 10) })
                    }
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  >
                    {DAY_NAMES.map((d, idx) => (
                      <option key={d} value={idx}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Frequency</label>
                  <select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-Weekly</option>
                    <option value="FIRST_SATURDAY">1st Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Vehicle Registration Number</label>
                  <input
                    type="text"
                    value={scheduleForm.vehicle_number}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, vehicle_number: e.target.value })}
                    placeholder="KA-01-EA-1024"
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Supervisor Name</label>
                  <input
                    type="text"
                    value={scheduleForm.supervisor_name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, supervisor_name: e.target.value })}
                    placeholder="Supervisor Name"
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Supervisor Phone (+91)</label>
                <input
                  type="text"
                  value={scheduleForm.supervisor_contact}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, supervisor_contact: e.target.value })}
                  placeholder="+919845012345"
                  className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Segregation Instructions</label>
                <textarea
                  rows={2}
                  value={scheduleForm.instructions}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, instructions: e.target.value })}
                  placeholder="Instructions shown to citizens in mobile app..."
                  className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-[#F4F7F0] dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold shadow-sm dark:shadow-glow-lime transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingSchedule ? 'Update Slot' : 'Create Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/15 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <span>Add Schedule Override / Exception</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-500 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOverride} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Target Date</label>
                  <input
                    type="date"
                    value={overrideForm.override_date}
                    onChange={(e) => setOverrideForm({ ...overrideForm, override_date: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">Waste Stream</label>
                  <select
                    value={overrideForm.waste_type}
                    onChange={(e) => setOverrideForm({ ...overrideForm, waste_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  >
                    <option value="WET">Wet Organic</option>
                    <option value="DRY">Dry Recyclables</option>
                    <option value="HAZARDOUS_EWASTE">Hazardous / E-Waste</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-[#062B20] border border-slate-200 dark:border-white/10">
                <input
                  type="checkbox"
                  id="cancel_chk"
                  checked={overrideForm.is_cancelled}
                  onChange={(e) => setOverrideForm({ ...overrideForm, is_cancelled: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-500 bg-white dark:bg-[#041B15] border-slate-300 dark:border-white/20 focus:ring-rose-500"
                />
                <label htmlFor="cancel_chk" className="text-slate-800 dark:text-[#F4F7F0] font-medium cursor-pointer">
                  Suspend / Cancel collection entirely (Holiday or Emergency)
                </label>
              </div>

              {!overrideForm.is_cancelled && (
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-100 dark:bg-[#062B20] border border-slate-200 dark:border-white/10">
                  <div>
                    <label className="block text-slate-600 dark:text-[#A7B9A8] font-medium mb-1">Rescheduled Date</label>
                    <input
                      type="date"
                      value={overrideForm.rescheduled_date}
                      onChange={(e) => setOverrideForm({ ...overrideForm, rescheduled_date: e.target.value })}
                      required={!overrideForm.is_cancelled}
                      className="w-full bg-white dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-[#A7B9A8] font-medium mb-1">New Start Time</label>
                    <input
                      type="time"
                      value={overrideForm.rescheduled_start_time}
                      onChange={(e) => setOverrideForm({ ...overrideForm, rescheduled_start_time: e.target.value })}
                      required={!overrideForm.is_cancelled}
                      className="w-full bg-white dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-[#A7B9A8] font-medium mb-1">New End Time</label>
                    <input
                      type="time"
                      value={overrideForm.rescheduled_end_time}
                      onChange={(e) => setOverrideForm({ ...overrideForm, rescheduled_end_time: e.target.value })}
                      required={!overrideForm.is_cancelled}
                      className="w-full bg-white dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-[#F4F7F0] font-medium mb-1">
                  Public Explanation / Reason (required)
                </label>
                <textarea
                  rows={2}
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  placeholder="e.g. Kaveri water pipeline work on main road; rescheduled to Thursday morning."
                  required
                  className="w-full bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-[#F4F7F0] dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-600 dark:bg-amber-400 dark:text-black dark:hover:bg-amber-500 transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Add Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
