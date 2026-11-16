import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  Info,
  Users,
  Scale,
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileText,
  Calendar,
  Layers,
  ShoppingBag,
  Coins,
  ShieldCheck,
  RefreshCw,
  Box,
  Truck
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  aluminium_metal: '#E2E8F0',
  pet_bottles: '#38BDF8',
  other_recyclable_plastics: '#34D399',
  newspapers_magazines: '#FBBF24',
  cardboard: '#FB923C',
  glass_bottles: '#A78BFA',
  textiles: '#F472B6',
  mixed_paper: '#94A3B8',
};

export const WardAnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [period, setPeriod] = useState<'all' | '30d' | '90d' | 'year'>('all');
  const [loading, setLoading] = useState(true);

  const fetchStats = async (p = period) => {
    try {
      setLoading(true);
      const res = await adminApi.admin.getDashboardStats(p);
      setStats(res);
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(period);
  }, [period]);

  const handlePeriodChange = (newPeriod: 'all' | '30d' | '90d' | 'year') => {
    setPeriod(newPeriod);
  };

  const chartData = (stats?.categories_breakdown || []).map((cat: any) => ({
    name: cat.name,
    code: cat.code,
    weight: cat.total_weight_kg,
    points: cat.total_points_awarded,
    rate: cat.rate_per_kg,
    fill: CATEGORY_COLORS[cat.code] || '#D7FF35',
  }));

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 transition-colors duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">SUPER-ADMIN GOVERNANCE</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
              MUNICIPAL INTELLIGENCE
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight mt-1">
            Super Admin Governance Dashboard
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
            Real-time dry-recyclables collection, grocery rewards ecosystem, and municipal ward governance intelligence.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10">
          {(['all', '30d', '90d', 'year'] as const).map((pKey) => {
            const labels = {
              all: 'All Time',
              '30d': 'Last 30 Days',
              '90d': 'Last 90 Days',
              year: 'This Year',
            };
            const active = period === pKey;
            return (
              <button
                key={pKey}
                onClick={() => handlePeriodChange(pKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition ${
                  active
                    ? 'bg-white dark:bg-[#0D4935] text-emerald-800 dark:text-white font-semibold border border-slate-200 dark:border-[#D7FF35]/30 shadow-sm'
                    : 'text-slate-600 dark:text-[#A7B9A8] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {labels[pKey]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 8 Authoritative KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Registered Citizens */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            1. Registered Citizens
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{stats?.total_citizens?.toLocaleString() ?? '—'}</span>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">households</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">BESCOM meter bound residents</p>
        </div>

        {/* 2. Active Field Supervisors */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            2. Active Supervisors
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{stats?.active_supervisors?.toLocaleString() ?? '—'}</span>
            <span className="text-xs font-mono text-purple-700 dark:text-purple-400">staff</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">Unique Staff IDs & ward assigned</p>
        </div>

        {/* 3. Total Verified Collections */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            3. Verified Collections
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{stats?.total_collections?.toLocaleString() ?? '—'}</span>
            <span className="text-xs font-mono text-emerald-700 dark:text-[#D7FF35]">receipts</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">Doorstep weighment records</p>
        </div>

        {/* 4. Dry Recyclables Collected (kg) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            4. Dry Recyclables Collected
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{stats?.total_collected_kg?.toFixed(1) ?? '—'}</span>
            <span className="text-xs font-mono text-emerald-700 dark:text-[#D7FF35]">kg</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">Strictly 8 dry categories</p>
        </div>

        {/* 5. Green Points Awarded */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            5. Green Points Awarded
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{stats ? Math.round(stats.total_gp_awarded).toLocaleString() : '—'}</span>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">GP</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">Issued via snapshot rate schedule</p>
        </div>

        {/* 6. Green Points Redeemed */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            6. Green Points Redeemed
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{stats ? Math.round(stats.total_gp_redeemed).toLocaleString() : '—'}</span>
            <span className="text-xs font-mono text-amber-700 dark:text-amber-400">GP</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">Debited for essential groceries</p>
        </div>

        {/* 7. Available Grocery Inventory */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            7. Grocery Inventory Units
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{stats?.available_inventory_units?.toLocaleString() ?? '—'}</span>
            <span className="text-xs font-mono text-blue-700 dark:text-blue-400">units</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">Stock in civil supplies depot</p>
        </div>

        {/* 8. Successful Grocery Redemptions */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            8. Grocery Redemptions
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{stats?.successful_redemptions?.toLocaleString() ?? '—'}</span>
            <span className="text-xs font-mono text-emerald-700 dark:text-[#D7FF35]">orders</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">Vouchers claimed by residents</p>
        </div>
      </div>

      {/* 8 Dry-Waste Category Breakdown Section */}
      <div className="rounded-3xl bg-white dark:bg-[#0D4935]/40 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">APPROVED DRY WASTE ENGINE</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-neutral-300">
                8 CATEGORIES ONLY
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-light text-slate-900 dark:text-white mt-1">
              Dry Recyclable Material Breakdown
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#A7B9A8]">
              Verified weighments across all 8 dry recyclable categories. No wet, organic, hazardous, or e-waste is accepted.
            </p>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                stroke="#A7B9A8"
                fontSize={10}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis stroke="#A7B9A8" fontSize={11} unit=" kg" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#062B20',
                  borderColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any, item: any) => [
                  `${value} kg (${item.payload.rate} GP/kg)`,
                  'Measured Weight'
                ]}
              />
              <Bar dataKey="weight" radius={[6, 6, 0, 0]}>
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Detail Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-[10px] font-mono uppercase text-[#A7B9A8] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Approved Tariff</th>
                <th className="py-3 px-4 text-right">Weight (kg)</th>
                <th className="py-3 px-4 text-right">Points Issued</th>
                <th className="py-3 px-4 text-right">% of Dry Waste</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {(stats?.categories_breakdown || []).map((cat: any) => (
                <tr key={cat.code} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 text-white font-medium flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.code] || '#D7FF35' }}
                    />
                    <span>{cat.name}</span>
                  </td>
                  <td className="py-2.5 px-4 text-center text-[#D7FF35] font-semibold">
                    {cat.rate_per_kg.toFixed(0)} GP/kg
                  </td>
                  <td className="py-2.5 px-4 text-right text-white">
                    {cat.total_weight_kg.toFixed(2)} kg
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">
                    +{cat.total_points_awarded.toFixed(1)} GP
                  </td>
                  <td className="py-2.5 px-4 text-right text-neutral-300">
                    {cat.percentage_of_dry_waste.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ward-Level Collection Intelligence */}
        <div className="rounded-3xl bg-[#0D4935]/40 border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="micro-label text-[#D7FF35]">OPERATIONAL REPORT</span>
              <h3 className="text-lg font-light text-white">Ward Collection Performance</h3>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-[10px] font-mono uppercase text-[#A7B9A8] border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Ward</th>
                  <th className="py-2.5 px-3 text-right">Collections</th>
                  <th className="py-2.5 px-3 text-right">Dry Waste</th>
                  <th className="py-2.5 px-3 text-right">GP Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {(stats?.wards_breakdown || []).map((w: any) => (
                  <tr key={w.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white">
                      <div>{w.name}</div>
                      <span className="text-[10px] text-neutral-500">{w.zone} Zone &bull; {w.active_citizens} households</span>
                    </td>
                    <td className="py-2 px-3 text-right text-neutral-300">{w.collections_count}</td>
                    <td className="py-2 px-3 text-right text-white font-medium">{w.total_collected_kg.toFixed(1)} kg</td>
                    <td className="py-2 px-3 text-right text-[#D7FF35] font-semibold">+{w.total_points_awarded.toFixed(0)} GP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grocery Inventory Availability */}
        <div className="rounded-3xl bg-[#0D4935]/40 border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="micro-label text-[#D7FF35]">SUPPLY CHAIN REPORT</span>
              <h3 className="text-lg font-light text-white">Grocery Inventory Status</h3>
            </div>
            <span className="text-xs font-mono text-[#A7B9A8]">Karnataka Civil Supplies</span>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-[10px] font-mono uppercase text-[#A7B9A8] border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Approved Product</th>
                  <th className="py-2.5 px-3 text-center">Tariff</th>
                  <th className="py-2.5 px-3 text-right">Available Stock</th>
                  <th className="py-2.5 px-3 text-right">Redeemed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {(stats?.inventory_breakdown || []).map((g: any) => (
                  <tr key={g.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white font-medium">
                      {g.title}
                    </td>
                    <td className="py-2 px-3 text-center text-[#D7FF35] font-semibold">
                      {g.credit_cost.toFixed(0)} GP
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="text-white font-bold">{g.stock_remaining}</span>
                      <span className="text-neutral-500 text-[10px] ml-1">units</span>
                    </td>
                    <td className="py-2 px-3 text-right text-amber-400 font-semibold">
                      {g.total_redeemed_count} orders
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Supervisor Field Staff Activity Summary */}
      <div className="rounded-3xl bg-[#0D4935]/40 border border-white/10 p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="micro-label text-[#D7FF35]">FIELD OPERATIONS</span>
            <h3 className="text-lg font-light text-white">Field Supervisor Activity</h3>
          </div>
          <span className="text-xs font-mono text-[#A7B9A8]">Staff IDs Verified</span>
        </div>

        <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-[10px] font-mono uppercase text-[#A7B9A8] border-b border-white/10">
              <tr>
                <th className="py-2.5 px-4">Staff ID</th>
                <th className="py-2.5 px-4">Supervisor Name</th>
                <th className="py-2.5 px-4">Assigned Ward</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Collections Logged</th>
                <th className="py-2.5 px-4 text-right">Weight Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {(stats?.supervisors_summary || []).map((sup: any) => (
                <tr key={sup.id} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {sup.staff_id || 'GP-SUP'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-white font-medium">{sup.name}</td>
                  <td className="py-2.5 px-4 text-neutral-300">{sup.ward_name}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {sup.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-white">{sup.collections_logged_count}</td>
                  <td className="py-2.5 px-4 text-right text-[#D7FF35] font-semibold">{sup.total_weight_verified_kg.toFixed(1)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
