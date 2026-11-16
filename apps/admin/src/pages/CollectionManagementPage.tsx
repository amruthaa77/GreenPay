import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  Scale,
  Search,
  Filter,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  RefreshCw,
  Eye,
  Layers,
  Coins
} from 'lucide-react';

interface CollectionRecord {
  id: string;
  transaction_id: string;
  collection_date: string;
  created_at: string | null;
  citizen: {
    id: string | null;
    greenpay_id: string;
    name: string;
    ward_name: string;
  };
  supervisor: {
    id: string | null;
    staff_id: string;
    name: string;
    email: string | null;
  };
  ward: {
    id: string | null;
    name: string;
    zone: string;
  };
  status: string;
  total_weight_kg: number;
  total_points_awarded: number;
  items: Array<{
    category_code: string;
    category_name: string;
    weight_kg: number;
    rate_per_kg: number;
    points_earned: number;
  }>;
  notes: string | null;
  immutable_ledger_locked: boolean;
}

export const CollectionManagementPage: React.FC = () => {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [wards, setWards] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [wardFilter, setWardFilter] = useState('ALL');
  const [supervisorFilter, setSupervisorFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Breakdown Modal
  const [selectedCollection, setSelectedCollection] = useState<CollectionRecord | null>(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await adminApi.admin.getAdminCollections({
        ward_id: wardFilter !== 'ALL' ? wardFilter : undefined,
        supervisor_id: supervisorFilter !== 'ALL' ? supervisorFilter : undefined,
        category_code: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 100,
      });
      setCollections(res.collections);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      adminApi.admin.getWards(),
      adminApi.admin.getSupervisors(),
    ]).then(([wList, sList]) => {
      setWards(wList);
      setSupervisors(sList);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCollections();
    }, 250);
    return () => clearTimeout(timer);
  }, [wardFilter, supervisorFilter, categoryFilter, statusFilter]);

  const filteredCollections = collections.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.transaction_id.toLowerCase().includes(q) ||
      c.citizen.name.toLowerCase().includes(q) ||
      c.citizen.greenpay_id.toLowerCase().includes(q) ||
      c.supervisor.name.toLowerCase().includes(q) ||
      c.supervisor.staff_id.toLowerCase().includes(q)
    );
  });

  const totalWeight = filteredCollections.reduce((acc, c) => acc + c.total_weight_kg, 0);
  const totalPoints = filteredCollections.reduce((acc, c) => acc + c.total_points_awarded, 0);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">AUDIT & WEIGHMENT VERIFICATION</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
              IMMUTABLE SNAPSHOTS LOCKED
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight mt-1">
            Dry Recyclable Collection Management
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
            Authoritative field weighment records, doorstep supervisor signatures, historical rate snapshots, and immutable ledger locking.
          </p>
        </div>

        <button
          onClick={fetchCollections}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-neutral-300 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-700 dark:text-[#D7FF35]' : ''}`} />
          <span>Refresh Collections</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-md space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">Total Verified Collections</span>
          <div className="text-2xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{total.toLocaleString()}</span>
            <span className="text-xs font-mono text-purple-600 dark:text-purple-400">receipts</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">Doorstep supervisor weighments</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-md space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">Dry Waste Collected</span>
          <div className="text-2xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{totalWeight.toFixed(1)}</span>
            <span className="text-xs font-mono text-emerald-700 dark:text-[#D7FF35]">kg</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">Total 8 dry categories</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-md space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">Total GP Issued</span>
          <div className="text-2xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{Math.round(totalPoints).toLocaleString()}</span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">GP</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">Calculated at snapshot rates</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-md space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">Ledger Security</span>
          <div className="text-2xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>100%</span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">Append-Only</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">Edits strictly forbidden</p>
        </div>
      </div>

      {/* Multi-Criteria Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#A7B9A8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receipt, citizen, or supervisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Ward filter */}
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
          >
            <option value="ALL">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* Supervisor filter */}
          <select
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
          >
            <option value="ALL">All Supervisors</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>{s.greenpay_id || 'SUP'}: {s.name}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
          >
            <option value="ALL">All Categories</option>
            <option value="aluminium_metal">Aluminium & Metal (22 GP)</option>
            <option value="pet_bottles">PET Bottles (18 GP)</option>
            <option value="other_recyclable_plastics">Other Plastics (15 GP)</option>
            <option value="newspapers_magazines">Newspapers & Mags (10 GP)</option>
            <option value="cardboard">Cardboard (10 GP)</option>
            <option value="glass_bottles">Glass Bottles (8 GP)</option>
            <option value="textiles">Textiles (8 GP)</option>
            <option value="mixed_paper">Mixed Paper (7 GP)</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
          </select>
        </div>
      </div>

      {/* Collections Table */}
      <div className="rounded-3xl bg-white dark:bg-[#0D4935]/40 border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 text-[10px] font-mono uppercase tracking-wider text-slate-700 dark:text-[#A7B9A8]">
                <th className="py-3.5 px-4">Receipt / Date</th>
                <th className="py-3.5 px-4">Citizen</th>
                <th className="py-3.5 px-4">Ward</th>
                <th className="py-3.5 px-4">Supervisor</th>
                <th className="py-3.5 px-4 text-right">Total Weight</th>
                <th className="py-3.5 px-4 text-right">Points Issued</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-neutral-300">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-neutral-500 font-mono text-xs">
                    {loading ? 'Querying verified collection ledger...' : 'No collections found matching current filters.'}
                  </td>
                </tr>
              ) : (
                filteredCollections.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-emerald-700 dark:text-[#D7FF35] font-semibold">{col.transaction_id}</div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono mt-0.5">{col.collection_date}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{col.citizen.name}</div>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-[#A7B9A8]">{col.citizen.greenpay_id}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-neutral-300">
                        {col.ward.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 dark:text-white text-xs">{col.supervisor.name}</div>
                      <span className="font-mono text-[10px] text-purple-700 dark:text-purple-300">{col.supervisor.staff_id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                      {col.total_weight_kg.toFixed(2)} kg
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700 dark:text-[#D7FF35]">
                      +{col.total_points_awarded.toFixed(1)} GP
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          col.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        {col.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCollection(col)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white text-xs font-mono transition flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3 h-3 text-emerald-700 dark:text-[#D7FF35]" />
                        <span>Breakdown</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown Inspection Modal */}
      {selectedCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/20 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-white shadow-2xl">
            <button
              onClick={() => setSelectedCollection(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">COLLECTION DOSSIER & ITEMIZATION</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30">
                  {selectedCollection.transaction_id}
                </span>
              </div>
              <h2 className="text-2xl font-light text-slate-900 dark:text-white">Weighment Audit Snapshot</h2>
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] font-mono">
                Citizen: {selectedCollection.citizen.name} ({selectedCollection.citizen.greenpay_id}) &bull; Supervisor: {selectedCollection.supervisor.name} ({selectedCollection.supervisor.staff_id})
              </p>
            </div>

            {/* Immutability Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-emerald-300 dark:border-emerald-500/30 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] font-mono text-slate-600 dark:text-[#A7B9A8] space-y-0.5">
                <span className="text-slate-900 dark:text-white font-semibold">Cryptographically & Trigger Locked</span>
                <p>This earning transaction is recorded in the append-only ledger. Ordinary admin edits to rewrite weights or points are blocked by database trigger constraints.</p>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#A7B9A8]">Itemized Material Lines</span>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-black/20">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-black/40 text-[10px] font-mono uppercase text-slate-700 dark:text-[#A7B9A8] border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Dry Recyclable Category</th>
                      <th className="py-2.5 px-3 text-right">Measured Weight</th>
                      <th className="py-2.5 px-3 text-right">Applied Rate</th>
                      <th className="py-2.5 px-3 text-right">Points Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                    {selectedCollection.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500 dark:text-neutral-500">
                          Summary record: aggregate weight {selectedCollection.total_weight_kg} kg.
                        </td>
                      </tr>
                    ) : (
                      selectedCollection.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-slate-900 dark:text-white">
                            {item.category_name}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700 dark:text-neutral-300">
                            {item.weight_kg.toFixed(2)} kg
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500 dark:text-neutral-400">
                            {item.rate_per_kg.toFixed(0)} GP/kg
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-700 dark:text-[#D7FF35] font-semibold">
                            +{item.points_earned.toFixed(1)} GP
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="border-t border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 font-mono text-xs">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white font-semibold">Total Verified</td>
                      <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white font-semibold">{selectedCollection.total_weight_kg.toFixed(2)} kg</td>
                      <td className="py-2.5 px-3 text-right text-slate-400 dark:text-neutral-500">—</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-[#D7FF35] font-bold">+{selectedCollection.total_points_awarded.toFixed(1)} GP</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedCollection.notes && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 text-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] block">Supervisor Doorstep Notes</span>
                <span className="text-slate-700 dark:text-neutral-300 mt-1 block">{selectedCollection.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
