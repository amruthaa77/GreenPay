import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Scale,
  RefreshCw,
  Search,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle,
  X,
  UserX,
  UserCheck,
  UserPlus,
  Edit2
} from 'lucide-react';

interface Supervisor {
  id: string;
  greenpay_id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  ward_id: string | null;
  ward_name: string;
  zone: string;
  weighments_logged_count: number;
  created_at: string | null;
}

export const SupervisorManagementPage: React.FC = () => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modal for Reassign Ward
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [targetWardId, setTargetWardId] = useState('');
  const [reassignReason, setReassignReason] = useState('Operational pilot rebalancing');

  // Modal for Edit Staff ID
  const [staffIdModalOpen, setStaffIdModalOpen] = useState(false);
  const [newStaffId, setNewStaffId] = useState('');
  const [staffIdReason, setStaffIdReason] = useState('Municipal badge identifier update');

  // Modal for Create Supervisor
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('SupervisorSecure2026!');
  const [createWardId, setCreateWardId] = useState('');
  const [createStaffId, setCreateStaffId] = useState('');
  const [createPhone, setCreatePhone] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [supList, wardList] = await Promise.all([
        adminApi.admin.getSupervisors(),
        adminApi.admin.getWards(),
      ]);
      setSupervisors(supList);
      setWards(wardList);
      if (wardList.length > 0 && !createWardId) {
        setCreateWardId(wardList[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load supervisors data.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (sup: Supervisor) => {
    const newStatus = sup.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmPrompt =
      newStatus === 'SUSPENDED'
        ? `Are you sure you want to suspend supervisor ${sup.name}? This will invalidate all active sessions immediately.`
        : `Reactivate supervisor account for ${sup.name}?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setActionLoading(true);
      setErrorMessage(null);
      await adminApi.admin.updateSupervisorStatus(sup.id, {
        status: newStatus,
        reason: newStatus === 'SUSPENDED' ? 'Administrative suspension' : 'Account reactivated by Super Admin',
      });
      setSuccessMessage(
        `Supervisor ${sup.name} successfully ${newStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`
      );
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update supervisor status.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleOpenReassignModal = (sup: Supervisor) => {
    setSelectedSupervisor(sup);
    setTargetWardId(sup.ward_id || (wards[0] ? wards[0].id : ''));
    setReassignReason('Operational pilot rebalancing');
    setReassignModalOpen(true);
  };

  const handleSubmitReassignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupervisor || !targetWardId) return;

    try {
      setActionLoading(true);
      setErrorMessage(null);
      await adminApi.admin.reassignSupervisorWard(selectedSupervisor.id, {
        ward_id: targetWardId,
        reason: reassignReason,
      });
      setSuccessMessage(`Supervisor ${selectedSupervisor.name} successfully reassigned.`);
      setReassignModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reassign supervisor.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleOpenStaffIdModal = (sup: Supervisor) => {
    setSelectedSupervisor(sup);
    setNewStaffId(sup.greenpay_id || '');
    setStaffIdReason('Municipal badge identifier update');
    setStaffIdModalOpen(true);
  };

  const handleSubmitStaffId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupervisor || !newStaffId.trim()) return;

    try {
      setActionLoading(true);
      setErrorMessage(null);
      await adminApi.admin.updateSupervisorStaffId(selectedSupervisor.id, {
        staff_id: newStaffId.trim(),
        reason: staffIdReason,
      });
      setSuccessMessage(`Staff ID updated to ${newStaffId.trim()} for ${selectedSupervisor.name}.`);
      setStaffIdModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update Staff ID.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim() || !createWardId) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage(null);
      await adminApi.admin.createSupervisor({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword.trim(),
        ward_id: createWardId,
        staff_id: createStaffId.trim() || undefined,
        phone_number: createPhone.trim() || undefined,
      });
      setSuccessMessage(`Supervisor account created successfully for ${createName}.`);
      setCreateModalOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreateStaffId('');
      setCreatePhone('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create supervisor account.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const filteredSupervisors = supervisors.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.greenpay_id && s.greenpay_id.toLowerCase().includes(q)) ||
      s.ward_name.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="micro-label text-[#D7FF35]">MUNICIPAL FIELD OPERATIONS</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
              FIELD STAFF GOVERNANCE
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light text-white tracking-tight mt-1">
            Supervisor Management & Governance
          </h1>
          <p className="text-xs text-[#A7B9A8] mt-1 max-w-2xl">
            Supervise field officers across Bengaluru pilot wards. Designate unique Staff IDs (`GP-SUP-001` - `GP-SUP-004`),
            enforce ward assignments, and review doorstep weighment logging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] text-xs font-mono font-bold transition shadow-glow-lime"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Supervisor</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono transition border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D7FF35]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Account Audit Notice Banner */}
      <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs font-mono text-[#A7B9A8] space-y-1">
          <span className="text-white font-semibold">Account Provenance & Foreign-Key Integrity Verified</span>
          <p>
            Multiple supervisor accounts with associated collection histories have been audited and assigned distinctive Staff IDs (`GP-SUP-001`, `GP-SUP-002`, `GP-SUP-003`, `GP-SUP-004`). Accounts are preserved to safeguard immutable collection provenance.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#D7FF35]/10 border border-[#D7FF35]/30 text-[#D7FF35] text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#0D4935] border border-white/10 p-3 rounded-2xl">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#A7B9A8]/60" />
          <input
            type="text"
            placeholder="Search by name, Staff ID, or ward..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#041B15] border border-white/10 text-xs text-white placeholder-[#A7B9A8]/40 focus:outline-none focus:border-[#D7FF35]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-mono text-[#A7B9A8]">Status:</span>
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                statusFilter === st
                  ? 'bg-[#D7FF35]/15 text-[#D7FF35] border border-[#D7FF35]/30'
                  : 'bg-white/5 text-[#A7B9A8] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Supervisors Table */}
      <div className="bg-[#0D4935] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#062B20] border-b border-white/10 text-[#A7B9A8] font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Supervisor Name</th>
                <th className="py-3 px-4">Assigned Ward</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Logged Weighments</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y border-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A7B9A8] font-mono">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#D7FF35]" />
                    Loading municipal supervisors...
                  </td>
                </tr>
              ) : filteredSupervisors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A7B9A8] font-mono">
                    No supervisors found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredSupervisors.map((sup) => (
                  <tr key={sup.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                          {sup.greenpay_id || 'GP-SUP'}
                        </span>
                        <button
                          onClick={() => handleOpenStaffIdModal(sup)}
                          title="Edit Staff ID"
                          className="text-neutral-500 hover:text-white p-0.5"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{sup.name}</div>
                      {sup.email && <div className="text-[10px] text-[#A7B9A8]/70 font-mono">{sup.email}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#F4F7F0]">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#A7B9A8]" />
                        {sup.ward_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#A7B9A8] font-mono">{sup.zone}</td>
                    <td className="py-3.5 px-4 font-mono text-white">
                      <span className="inline-flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-[#D7FF35]" />
                        {sup.weighments_logged_count} weighments
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {sup.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D7FF35]/15 text-[#D7FF35] border border-[#D7FF35]/30 text-[10px] font-mono font-bold">
                          <CheckCircle className="w-3 h-3" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono font-bold">
                          <ShieldAlert className="w-3 h-3" />
                          SUSPENDED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReassignModal(sup)}
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#F4F7F0] hover:text-white border border-white/10 font-mono text-[11px] inline-flex items-center gap-1.5 transition"
                          title="Reassign Ward"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
                          <span>Reassign</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(sup)}
                          disabled={actionLoading}
                          className={`px-2.5 py-1.5 rounded-lg border font-mono text-[11px] inline-flex items-center gap-1.5 transition ${
                            sup.status === 'ACTIVE'
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-[#D7FF35]/10 hover:bg-[#D7FF35]/20 text-[#D7FF35] border-[#D7FF35]/30'
                          }`}
                          title={sup.status === 'ACTIVE' ? 'Suspend Supervisor' : 'Reactivate Supervisor'}
                        >
                          {sup.status === 'ACTIVE' ? (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Suspend</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Reactivate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Supervisor Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D4935] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D7FF35]/10 border border-[#D7FF35]/30 flex items-center justify-center text-[#D7FF35]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Create Field Supervisor</h3>
                  <p className="text-[11px] text-[#A7B9A8] font-mono">Assign municipal Staff ID & Ward</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#A7B9A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupervisor} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Supervisor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Gowda"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white focus:outline-none focus:border-[#D7FF35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="supervisor.name@greenpay.blr"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white focus:outline-none focus:border-[#D7FF35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Staff ID (Optional, auto-generated if blank)</label>
                <input
                  type="text"
                  placeholder="e.g. GP-SUP-005"
                  value={createStaffId}
                  onChange={(e) => setCreateStaffId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono focus:outline-none focus:border-[#D7FF35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono focus:outline-none focus:border-[#D7FF35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Assigned Ward Destination *</label>
                <select
                  value={createWardId}
                  onChange={(e) => setCreateWardId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white focus:outline-none focus:border-[#D7FF35]"
                  required
                >
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.zone} Zone)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#A7B9A8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-glow-lime"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff ID Modal */}
      {staffIdModalOpen && selectedSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D4935] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Update Supervisor Staff ID</h3>
                  <p className="text-[11px] text-[#A7B9A8] font-mono">{selectedSupervisor.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStaffIdModalOpen(false)}
                className="p-1 rounded-lg text-[#A7B9A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitStaffId} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">New Staff ID (e.g. GP-SUP-001)</label>
                <input
                  type="text"
                  required
                  value={newStaffId}
                  onChange={(e) => setNewStaffId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-[#D7FF35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Reason for Identifier Adjustment</label>
                <input
                  type="text"
                  required
                  value={staffIdReason}
                  onChange={(e) => setStaffIdReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white focus:outline-none focus:border-[#D7FF35]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffIdModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#A7B9A8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-glow-lime"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>Save Staff ID</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Ward Modal */}
      {reassignModalOpen && selectedSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D4935] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Reassign Municipal Ward</h3>
                  <p className="text-[11px] text-[#A7B9A8] font-mono">{selectedSupervisor.name} ({selectedSupervisor.greenpay_id})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="p-1 rounded-lg text-[#A7B9A8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReassignment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Current Assigned Ward</label>
                <div className="p-2.5 rounded-xl bg-[#062B20] border border-white/10 text-xs font-mono text-[#F4F7F0]">
                  {selectedSupervisor.ward_name} ({selectedSupervisor.zone})
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Target Ward Destination</label>
                <select
                  value={targetWardId}
                  onChange={(e) => setTargetWardId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-xs text-white focus:outline-none focus:border-[#D7FF35]"
                  required
                >
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#A7B9A8] mb-1">Administrative Justification / Reason</label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#041B15] border border-white/10 text-xs text-white focus:outline-none focus:border-[#D7FF35]"
                  rows={3}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Reassignment is recorded in the immutable audit log under actor ID. Field weighment authorizations will immediately switch to the new ward.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#A7B9A8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-glow-lime"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                  <span>Confirm Reassignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
