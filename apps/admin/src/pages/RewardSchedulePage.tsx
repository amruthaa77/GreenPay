import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  Award,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Gift,
  FileCheck,
  Tag,
  RefreshCw,
  Coins,
  Milk,
  Recycle,
  Newspaper,
  Box,
  Wine,
  Shirt,
  FileText,
  ShoppingBag,
  Package,
  Layers,
  ShieldCheck,
  Info,
  Scale,
  Sliders
} from 'lucide-react';

interface DryWasteCategory {
  id: string;
  code: string;
  name: string;
  rate_per_kg: number;
  is_active: boolean;
  updated_at?: string;
}

interface RewardSchedule {
  id?: string;
  version: number;
  wet_rate?: number;
  dry_rate?: number;
  hazardous_rate?: number;
  ewaste_rate?: number;
  rates?: Record<string, number>;
  effective_from: string;
  change_reason?: string;
  is_active?: boolean;
}

interface RedemptionItem {
  id: string;
  title: string;
  description: string;
  item_type: string;
  credit_cost: number;
  stock_remaining: number | null;
  partner_name?: string;
  badge_text?: string;
  is_active: boolean;
}

interface RedemptionTx {
  id: string;
  pseudonymous_owner: string;
  ward_name: string;
  item_title: string;
  credits_spent: number;
  certificate_number?: string;
  coupon_code?: string;
  donor_display_name?: string;
  created_at: string;
}

const ORDERED_CATEGORY_CODES = [
  'aluminium_metal',
  'pet_bottles',
  'other_recyclable_plastics',
  'newspapers_magazines',
  'cardboard',
  'glass_bottles',
  'textiles',
  'mixed_paper',
];

const CATEGORY_NAMES: Record<string, string> = {
  aluminium_metal: 'Aluminium & Metal',
  pet_bottles: 'PET Bottles',
  other_recyclable_plastics: 'Other Recyclable Plastics',
  newspapers_magazines: 'Newspapers & Magazines',
  cardboard: 'Cardboard',
  glass_bottles: 'Glass Bottles',
  textiles: 'Textiles',
  mixed_paper: 'Mixed Paper',
};

const getCategoryIcon = (code: string) => {
  switch (code.toLowerCase()) {
    case 'aluminium_metal':
      return Coins;
    case 'pet_bottles':
      return Milk;
    case 'other_recyclable_plastics':
      return Recycle;
    case 'newspapers_magazines':
      return Newspaper;
    case 'cardboard':
      return Box;
    case 'glass_bottles':
      return Wine;
    case 'textiles':
      return Shirt;
    case 'mixed_paper':
      return FileText;
    default:
      return Recycle;
  }
};

export const RewardSchedulePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rates' | 'redemptions'>('rates');

  // Rates & Categories State
  const [categories, setCategories] = useState<DryWasteCategory[]>([]);
  const [schedules, setSchedules] = useState<RewardSchedule[]>([]);
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRates, setEditRates] = useState<Record<string, number>>({});
  const [changeReason, setChangeReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redemptions & Grocery Inventory State
  const [redemptionItems, setRedemptionItems] = useState<RedemptionItem[]>([]);
  const [transactions, setTransactions] = useState<RedemptionTx[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'redemptions') {
      loadRedemptions();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoadingRates(true);
      setError(null);
      const [schedList, catList, histList] = await Promise.all([
        adminApi.admin.getRewardSchedules().catch(() => []),
        adminApi.admin.getDryWasteCategories().catch(() => []),
        adminApi.admin.getCategoryRateHistory().catch(() => []),
      ]);
      setSchedules(schedList);
      setRateHistory(histList);

      // Sort categories according to canonical 8-category order
      const sortedCats = [...catList].sort((a, b) => {
        const idxA = ORDERED_CATEGORY_CODES.indexOf(a.code);
        const idxB = ORDERED_CATEGORY_CODES.indexOf(b.code);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.name.localeCompare(b.name);
      });
      setCategories(sortedCats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dry-waste rates.');
    } finally {
      setLoadingRates(false);
    }
  };

  const loadRedemptions = async () => {
    try {
      setLoadingRedemptions(true);
      const [items, txs] = await Promise.all([
        adminApi.admin.getRedemptionItems().catch(() => []),
        adminApi.admin.getRedemptionTransactions().catch(() => []),
      ]);
      setRedemptionItems(items);
      setTransactions(txs);
    } catch (err: any) {
      setError(err.message || 'Failed to load grocery inventory.');
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleOpenNewScheduleModal = () => {
    const initialRates: Record<string, number> = {};
    categories.forEach((cat) => {
      initialRates[cat.code] = cat.rate_per_kg;
    });
    setEditRates(initialRates);
    setChangeReason('');
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleRateInputChange = (code: string, valueStr: string) => {
    const num = parseFloat(valueStr);
    setEditRates((prev) => ({
      ...prev,
      [code]: isNaN(num) ? 0 : num,
    }));
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim() || changeReason.trim().length < 5) {
      setError('Audit reason must be at least 5 characters long.');
      return;
    }

    for (const [code, rate] of Object.entries(editRates)) {
      if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
        setError(`Rate for category '${CATEGORY_NAMES[code] || code}' must be greater than 0 GP/kg.`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      await adminApi.admin.createRewardSchedule({
        rates: editRates,
        change_reason: changeReason.trim(),
      });
      setModalOpen(false);
      setSuccess('Successfully deployed new schedule version and updated live category earning rates.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to deploy reward schedule version.');
    } finally {
      setSaving(false);
    }
  };

  // Grocery Editing State & Handlers
  const [editingItem, setEditingItem] = useState<RedemptionItem | null>(null);
  const [editCost, setEditCost] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editReason, setEditReason] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const handleOpenEdit = (item: RedemptionItem) => {
    setEditingItem(item);
    setEditCost(item.credit_cost);
    setEditStock(item.stock_remaining ?? 0);
    setEditActive(item.is_active);
    setEditReason('Stock & price verification');
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (editCost <= 0) {
      setError('Civic price must be greater than zero GP.');
      return;
    }
    if (editStock < 0) {
      setError('Inventory stock units cannot be negative.');
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      await adminApi.admin.updateRedemptionItem(editingItem.id, {
        credit_cost: editCost,
        stock_remaining: editStock,
        is_active: editActive,
        change_reason: editReason || 'Admin inventory & price revision',
      });
      setSuccess(`Successfully updated ${editingItem.title} inventory & price.`);
      setEditingItem(null);
      await loadRedemptions();
    } catch (err: any) {
      setError(err.message || 'Failed to update grocery item.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter grocery items for inventory tab
  const groceryItems = redemptionItems.filter((i) => i.item_type === 'GROCERY');

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7FF35]/15 border border-[#D7FF35]/30 text-[#D7FF35] text-xs font-mono font-semibold tracking-wider mb-2">
            <Scale className="w-3.5 h-3.5" />
            <span>AUTHORITATIVE REWARD GOVERNANCE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
            Dry-Waste Earning Rates & Grocery Rewards
          </h1>
          <p className="text-xs text-[#A7B9A8] mt-1.5 max-w-2xl leading-relaxed">
            Manage Green Points earned from verified dry recyclable collections and oversee the essential grocery rewards catalogue.
          </p>
        </div>

        {activeTab === 'rates' && (
          <button
            type="button"
            onClick={handleOpenNewScheduleModal}
            className="px-4 py-2.5 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition shadow-glow-lime self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Rate Schedule Version</span>
          </button>
        )}
      </div>

      {/* Global Status Notices */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-[#D7FF35]/10 border border-[#D7FF35]/30 text-[#D7FF35] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#D7FF35] shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('rates')}
          className={`pb-3 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === 'rates'
              ? 'border-[#D7FF35] text-[#D7FF35]'
              : 'border-transparent text-[#A7B9A8] hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Dry-Waste Category Rates</span>
          <span className="px-2 py-0.5 rounded-full bg-[#D7FF35]/15 text-[#D7FF35] text-[10px]">
            8 Categories
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('redemptions')}
          className={`pb-3 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeTab === 'redemptions'
              ? 'border-[#D7FF35] text-[#D7FF35]'
              : 'border-transparent text-[#A7B9A8] hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Grocery Rewards & Inventory</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px]">
            5 Staples
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: 8 DRY-WASTE CATEGORY RATES & VERSIONED SCHEDULE HISTORY      */}
      {/* =================================================================== */}
      {activeTab === 'rates' && (
        <div className="space-y-8">
          {/* Section A: Live Active Rates Cards (8 Uniform Compact Cards) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase font-mono tracking-wider text-[#A7B9A8]">
                  Active Earning Rates (Official Dry-Waste Recyclables)
                </span>
                <p className="text-[11px] text-[#A7B9A8]/70 mt-0.5">
                  Authoritative points per kilogram credited to household ledgers upon calibrated doorstep weighment.
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#D7FF35] font-bold px-2.5 py-1 rounded-full bg-[#D7FF35]/10 border border-[#D7FF35]/20">
                Authoritative Backend Engine
              </span>
            </div>

            {loadingRates ? (
              <div className="p-16 text-center text-[#A7B9A8]">
                <div className="w-8 h-8 border-2 border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-mono">Loading active dry-waste categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="p-12 text-center text-[#A7B9A8] bg-[#062B20] rounded-3xl border border-white/10">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <p className="text-xs font-mono">No dry-waste categories configured in database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.code);
                  return (
                    <div
                      key={cat.id}
                      className="h-full p-5 rounded-2xl bg-[#062B20] border border-white/10 hover:border-[#D7FF35]/40 transition flex flex-col justify-between shadow-lg group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-[#041B15] border border-white/10 flex items-center justify-center text-[#D7FF35] group-hover:scale-105 transition">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              cat.is_active
                                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                                : 'bg-white/10 text-[#A7B9A8]'
                            }`}
                          >
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight">{cat.name}</h3>
                          <span className="text-[10px] font-mono text-[#A7B9A8]/70 uppercase tracking-wider">
                            Code: {cat.code}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t border-white/10 flex items-baseline justify-between">
                        <span className="text-[10px] font-mono uppercase text-[#A7B9A8]">
                          Earning Rate
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-[#D7FF35] font-mono">
                            {cat.rate_per_kg.toFixed(0)}
                          </span>
                          <span className="text-xs font-mono font-bold text-white">GP / kg</span>
                        </div>
                      </div>

                      {cat.updated_at && (
                        <div className="pt-2 text-[10px] font-mono text-[#A7B9A8]/60 text-right">
                          Updated{' '}
                          {new Date(cat.updated_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Versioned Schedule History */}
          <div className="rounded-3xl bg-[#0D4935] border border-white/10 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase font-mono tracking-wider text-[#A7B9A8]">
                Versioned Schedule History
              </span>
              <span className="text-[10px] font-mono text-[#A7B9A8]/70">Immutable Ledger Rules</span>
            </div>

            {loadingRates ? (
              <div className="p-16 text-center text-[#A7B9A8]">
                <div className="w-8 h-8 border-2 border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-mono">Loading schedule versions...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-16 text-center text-[#A7B9A8]">
                <Award className="w-8 h-8 mx-auto mb-2 text-[#A7B9A8]/50" />
                <p className="text-xs">No reward schedules deployed.</p>
              </div>
            ) : (
              <div className="divide-y border-white/5">
                {schedules.map((s, index) => {
                  const isCurrent = index === 0;
                  const schedRates = s.rates || {};

                  return (
                    <div
                      key={s.id || s.version}
                      className={`p-6 transition ${isCurrent ? 'bg-[#D7FF35]/5' : 'hover:bg-white/[0.02]'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                              isCurrent
                                ? 'bg-[#D7FF35] text-[#041B15]'
                                : 'bg-white/10 text-[#A7B9A8]'
                            }`}
                          >
                            v{s.version}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#D7FF35] uppercase tracking-wider font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active Engine Rule
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-[#A7B9A8]">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(s.effective_from).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* 8-Category Rates Breakdown for this version */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                        {ORDERED_CATEGORY_CODES.map((code) => {
                          const rateVal = schedRates[code] ?? (categories.find((c) => c.code === code)?.rate_per_kg ?? 0);
                          return (
                            <div
                              key={code}
                              className="p-3 rounded-xl bg-[#041B15] border border-white/10 flex items-center justify-between"
                            >
                              <span className="text-[11px] text-[#A7B9A8] font-sans truncate pr-2">
                                {CATEGORY_NAMES[code] || code}
                              </span>
                              <span className="text-xs font-mono font-bold text-white whitespace-nowrap">
                                {rateVal.toFixed(0)} <span className="text-[#D7FF35] text-[10px]">GP/kg</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Audit Reason */}
                      <div className="text-xs text-[#A7B9A8] bg-[#062B20] p-3 rounded-xl border border-white/5">
                        <strong className="text-[#F4F7F0] font-mono">Audit Reason: </strong>
                        {s.change_reason || 'Initial schedule release.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section C: Itemized Category Rate Change History */}
          <div className="rounded-3xl bg-[#0D4935] border border-white/10 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase font-mono tracking-wider text-[#A7B9A8]">
                  Rate-Change Audit Trail
                </span>
                <p className="text-[11px] text-[#A7B9A8]/70 mt-0.5">
                  Immutable record of per-category rate modifications with justification notes and administrator provenance.
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#D7FF35] font-bold px-2.5 py-1 rounded-full bg-[#D7FF35]/10 border border-[#D7FF35]/20">
                Audit Trail
              </span>
            </div>

            {rateHistory.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#A7B9A8]">
                No individual rate changes recorded yet. Standard baseline schedule in effect.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/20 text-[10px] font-mono uppercase text-[#A7B9A8] border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Dry Waste Category</th>
                      <th className="py-3 px-4 text-center">Previous Rate</th>
                      <th className="py-3 px-4 text-center">New Rate</th>
                      <th className="py-3 px-4">Changed By</th>
                      <th className="py-3 px-4">Audit Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {rateHistory.map((h: any) => (
                      <tr key={h.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 text-neutral-400">
                          {new Date(h.changed_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-white font-medium">
                          {h.category_name}
                        </td>
                        <td className="py-2.5 px-4 text-center text-neutral-400">
                          {h.previous_rate.toFixed(1)} GP/kg
                        </td>
                        <td className="py-2.5 px-4 text-center text-[#D7FF35] font-bold">
                          {h.new_rate.toFixed(1)} GP/kg
                        </td>
                        <td className="py-2.5 px-4 text-purple-300">
                          {h.changed_by_name}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-300">
                          {h.change_reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: GROCERY REWARDS CATALOGUE & INVENTORY MANAGEMENT              */}
      {/* =================================================================== */}
      {activeTab === 'redemptions' && (
        <div className="space-y-8">
          {/* Inventory Table */}
          <div className="rounded-3xl bg-[#0D4935] border border-white/10 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase font-mono tracking-wider text-[#A7B9A8]">
                  Official Grocery Rewards & Inventory Catalogue
                </span>
                <p className="text-[11px] text-[#A7B9A8]/70 mt-0.5">
                  Authoritative stock levels and redemption prices for the five essential Bengaluru household grocery rations.
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#D7FF35] font-bold px-2.5 py-1 rounded-full bg-[#D7FF35]/10 border border-[#D7FF35]/20">
                Non-Monetary Rations Only
              </span>
            </div>

            {loadingRedemptions ? (
              <div className="p-16 text-center text-[#A7B9A8]">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#D7FF35]" />
                <p className="text-xs font-mono">Loading grocery rewards inventory...</p>
              </div>
            ) : groceryItems.length === 0 ? (
              <div className="p-16 text-center text-[#A7B9A8]">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-[#A7B9A8]/50" />
                <p className="text-xs font-mono">No grocery redemption products found in database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#F4F7F0]">
                  <thead className="bg-[#062B20] text-[#A7B9A8] font-mono uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3 px-6">Product Title</th>
                      <th className="py-3 px-4">Standard Ration</th>
                      <th className="py-3 px-4">Civic Price</th>
                      <th className="py-3 px-4">Remaining Inventory</th>
                      <th className="py-3 px-4">Supply Partner</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-white/5">
                    {groceryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-white text-sm">{item.title}</div>
                          <div className="text-[11px] text-[#A7B9A8] line-clamp-1 max-w-md mt-0.5">
                            {item.description}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-[#A7B9A8]">
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-white">
                            {item.badge_text ? item.badge_text.split('•')[0].trim() : '1 kg'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold text-white">{item.credit_cost}</span>
                            <span className="text-xs font-bold text-[#D7FF35]">GP</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          {item.stock_remaining !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                item.stock_remaining > 50
                                  ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {item.stock_remaining} units
                            </span>
                          ) : (
                            <span className="text-[#A7B9A8]/70">Unlimited / On-Demand</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[#F4F7F0] font-sans">
                          {item.partner_name || 'Karnataka Food & Civil Supplies'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              item.is_active
                                ? 'bg-[#D7FF35]/15 text-[#D7FF35] border border-[#D7FF35]/30'
                                : 'bg-white/5 text-[#A7B9A8]'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="px-3 py-1.5 rounded-xl bg-[#D7FF35]/15 hover:bg-[#D7FF35]/25 border border-[#D7FF35]/30 text-[#D7FF35] font-mono text-xs font-bold transition inline-flex items-center gap-1.5"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Redemptions Table */}
          <div className="rounded-3xl bg-[#0D4935] border border-white/10 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase font-mono tracking-wider text-[#A7B9A8]">
                Recent Citizen Grocery Redemptions Ledger
              </span>
              <span className="text-[10px] font-mono text-[#A7B9A8]/70">DPDP Pseudonymised</span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-16 text-center text-[#A7B9A8]">
                <FileCheck className="w-8 h-8 mx-auto mb-2 text-[#A7B9A8]/50" />
                <p className="text-xs">No redemptions recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#062B20] text-[#A7B9A8] font-mono uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3 px-6">Timestamp</th>
                      <th className="py-3 px-4">Citizen / Pseudonym</th>
                      <th className="py-3 px-4">Ward</th>
                      <th className="py-3 px-4">Item Redeemed</th>
                      <th className="py-3 px-4">Points Debited</th>
                      <th className="py-3 px-6">Voucher Fulfillment Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-white/5 font-mono">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-6 text-[#A7B9A8] text-[11px]">
                          {new Date(tx.created_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-[#F4F7F0]">
                          <code className="text-[#A7B9A8]">{tx.pseudonymous_owner || 'anon-citizen'}</code>
                        </td>
                        <td className="py-3.5 px-4 text-[#A7B9A8]">{tx.ward_name || 'Koramangala'}</td>
                        <td className="py-3.5 px-4 text-white font-sans font-semibold">{tx.item_title}</td>
                        <td className="py-3.5 px-4 text-rose-400 font-bold">-{tx.credits_spent} GP</td>
                        <td className="py-3.5 px-6 text-[#A7B9A8] text-[11px]">
                          {tx.coupon_code ? (
                            <code className="px-2 py-0.5 rounded bg-[#041B15] text-[#D7FF35] font-bold">
                              {tx.coupon_code}
                            </code>
                          ) : (
                            <span className="text-[#A7B9A8]/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT GROCERY PRODUCT INVENTORY & REDEMPTION PRICE            */}
      {/* =================================================================== */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-3xl bg-[#0D4935] border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div>
                <span className="micro-label text-[#D7FF35]">INVENTORY & PRICE GOVERNANCE</span>
                <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                  Manage {editingItem.title}
                </h3>
                <p className="text-xs text-[#A7B9A8] mt-0.5">
                  Standard Ration: <span className="text-white font-mono">{editingItem.badge_text || '1 kg'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-[#A7B9A8] hover:text-white text-lg font-mono p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label htmlFor="item-cost" className="text-[#A7B9A8] block">Civic Redemption Price (GP)</label>
                <input
                  id="item-cost"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={editCost}
                  onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono focus:outline-none focus:border-[#D7FF35]"
                />
                <span className="text-[10px] text-[#A7B9A8]/70">Rate in Green Points per standard ration package.</span>
              </div>

              <div className="space-y-1">
                <label htmlFor="item-stock" className="text-[#A7B9A8] block">In-Stock Inventory Units</label>
                <input
                  id="item-stock"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={editStock}
                  onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono focus:outline-none focus:border-[#D7FF35]"
                />
                <span className="text-[10px] text-[#A7B9A8]/70">Units remaining at civil supplies depot counters.</span>
              </div>

              <div className="space-y-1">
                <label className="text-[#A7B9A8] block">Catalogue Status</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={editActive}
                      onChange={() => setEditActive(true)}
                      className="accent-[#D7FF35]"
                    />
                    <span className="text-white text-xs">Active</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={!editActive}
                      onChange={() => setEditActive(false)}
                      className="accent-[#D7FF35]"
                    />
                    <span className="text-[#A7B9A8] text-xs">Archived (Hidden)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="item-reason" className="text-[#A7B9A8] block">Mandatory Audit Change Reason</label>
                <input
                  id="item-reason"
                  type="text"
                  required
                  minLength={4}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Restocked batch from Karnataka Food & Civil Supplies"
                  className="w-full px-3 py-2 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono focus:outline-none focus:border-[#D7FF35]"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#A7B9A8] hover:text-white uppercase font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] uppercase font-bold text-xs flex items-center justify-center gap-1.5 shadow-glow-lime"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: DEPLOY NEW RATE SCHEDULE VERSION (8 APPROVED CATEGORIES)      */}
      {/* =================================================================== */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-[#0D4935] border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-[#D7FF35]" />
                <div>
                  <h3 className="text-lg font-light text-white">
                    Deploy New Rate Schedule Version
                  </h3>
                  <span className="text-[10px] font-mono text-[#A7B9A8]">
                    Configure Authoritative Dry-Waste Earning Rates (8 Categories)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#A7B9A8] hover:text-white text-xs font-mono p-1 rounded-lg hover:bg-white/10 transition"
              >
                &times; Close
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSchedule} className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Category Earning Rates (GP per kg)
                  </span>
                  <span className="text-[11px] font-mono text-[#A7B9A8]/80">
                    Values must be strictly greater than 0
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {ORDERED_CATEGORY_CODES.map((code) => {
                    const currentCat = categories.find((c) => c.code === code);
                    const currentRate = currentCat ? currentCat.rate_per_kg : 0;
                    const Icon = getCategoryIcon(code);
                    const val = editRates[code] ?? currentRate;
                    const isChanged = val !== currentRate;

                    return (
                      <div
                        key={code}
                        className={`p-3.5 rounded-2xl bg-[#041B15] border transition ${
                          isChanged ? 'border-[#D7FF35] shadow-glow-lime' : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-[#D7FF35]" />
                            <label
                              htmlFor={`rate-${code}`}
                              className="text-xs font-bold text-white tracking-tight"
                            >
                              {CATEGORY_NAMES[code] || code}
                            </label>
                          </div>
                          {isChanged && (
                            <span className="text-[10px] font-mono text-[#D7FF35] font-bold">
                              Modified
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id={`rate-${code}`}
                            type="number"
                            step="0.5"
                            min="0.1"
                            required
                            value={val}
                            onChange={(e) => handleRateInputChange(code, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#062B20] border border-white/10 text-sm text-white focus:outline-none focus:border-[#D7FF35] font-mono font-bold"
                          />
                          <span className="text-xs font-mono text-[#A7B9A8] shrink-0 font-bold">
                            GP/kg
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confirmation / Modification Summary */}
              <div className="p-4 rounded-2xl bg-[#062B20] border border-white/10 space-y-2 text-xs">
                <span className="font-mono text-[#A7B9A8] uppercase text-[10px] block font-bold">
                  Schedule Deployment Confirmation
                </span>
                <p className="text-[#A7B9A8] leading-relaxed text-[11px]">
                  Deploying this version immediately updates the live rates for all new doorstep collections across all Bengaluru wards. Existing historical weighments and transactions retain their original snapshot rates.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#F4F7F0]" htmlFor="audit-reason">
                  Mandatory Audit Change Reason
                </label>
                <textarea
                  id="audit-reason"
                  required
                  rows={3}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Municipal tariff revision to incentivise higher PET bottle and aluminium dry waste collection rates."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-xs text-white placeholder-[#A7B9A8]/40 focus:outline-none focus:border-[#D7FF35]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-[#A7B9A8] hover:text-white font-mono text-xs font-semibold uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs tracking-wider uppercase transition shadow-glow-lime"
                >
                  {saving ? 'Deploying Schedule Version...' : 'Deploy & Activate Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
