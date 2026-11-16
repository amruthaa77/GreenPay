import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
  MapPin,
  AlertCircle,
  Download,
  ShieldCheck,
  ShieldAlert,
  Database,
  Calendar,
  Layers,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface WardStat {
  ward_name: string;
  zone: string;
  is_demo_data: boolean;
  total_collected_kg: number;
  wet_kg: number;
  dry_kg: number;
  hazardous_kg: number;
  ewaste_kg: number;
  segregation_percentage: number;
  active_citizens: number;
  collection_count: number;
}

interface OpenDataWard {
  ward_id: string;
  ward_name: string;
  zone: string;
  is_suppressed: boolean;
  suppression_reason: string | null;
  active_households: string;
  collection_count: string;
  total_collected_kg: number | null;
  dry_recyclable_kg: number | null;
  wet_organic_kg: number | null;
  hazardous_kg: number | null;
  ewaste_kg: number | null;
  segregation_compliance_percentage: number | null;
  is_demo_data: boolean;
}

interface MonthlyTrend {
  month: string;
  is_suppressed: boolean;
  suppression_reason: string | null;
  collection_count: string;
  total_kg: number | null;
  dry_kg: number | null;
  wet_kg: number | null;
}

export const WardsPage: React.FC = () => {
  const { t } = useLanguage();
  const [wards, setWards] = useState<WardStat[]>([
    {
      ward_name: 'Koramangala',
      zone: 'South Zone',
      is_demo_data: true,
      total_collected_kg: 52400.0,
      wet_kg: 30400.0,
      dry_kg: 18800.0,
      hazardous_kg: 2100.0,
      ewaste_kg: 1100.0,
      segregation_percentage: 38.0,
      active_citizens: 1420,
      collection_count: 890,
    },
    {
      ward_name: 'Indiranagar',
      zone: 'East Zone',
      is_demo_data: true,
      total_collected_kg: 48900.0,
      wet_kg: 28300.0,
      dry_kg: 17600.0,
      hazardous_kg: 1950.0,
      ewaste_kg: 1050.0,
      segregation_percentage: 38.1,
      active_citizens: 1280,
      collection_count: 760,
    },
    {
      ward_name: 'Jayanagar',
      zone: 'South Zone',
      is_demo_data: true,
      total_collected_kg: 44200.0,
      wet_kg: 26500.0,
      dry_kg: 15100.0,
      hazardous_kg: 1750.0,
      ewaste_kg: 850.0,
      segregation_percentage: 36.1,
      active_citizens: 1100,
      collection_count: 690,
    },
    {
      ward_name: 'Whitefield',
      zone: 'East Zone',
      is_demo_data: true,
      total_collected_kg: 58600.0,
      wet_kg: 33400.0,
      dry_kg: 21200.0,
      hazardous_kg: 2300.0,
      ewaste_kg: 1700.0,
      segregation_percentage: 39.1,
      active_citizens: 1650,
      collection_count: 940,
    },
  ]);

  const [openDataWards, setOpenDataWards] = useState<OpenDataWard[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [openDataLoading, setOpenDataLoading] = useState(true);

  useEffect(() => {
    // Load general ward analytics
    api.public
      .getWardAnalytics()
      .then((res) => {
        if (res && res.wards && res.wards.length > 0) {
          setWards(res.wards);
        }
      })
      .catch(() => {});

    // Load DPDP compliant open data
    loadOpenData();
  }, []);

  const loadOpenData = async () => {
    try {
      setOpenDataLoading(true);
      const [wardsRes, trendsRes] = await Promise.all([
        api.public.getOpenDataWards(),
        api.public.getOpenDataMonthlyTrends(),
      ]);
      if (wardsRes && wardsRes.data) {
        setOpenDataWards(wardsRes.data);
      }
      if (trendsRes && trendsRes.trends) {
        setMonthlyTrends(trendsRes.trends);
      }
    } catch {
      // Fallback
    } finally {
      setOpenDataLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16 text-slate-900 dark:text-[#F4F7F0]">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-xs font-mono">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Demo Data Labelled &bull; Bengaluru Prototype</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-light text-slate-900 dark:text-white tracking-tight">
          Ward-Level Intelligence & Transparency
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-slate-600 dark:text-neutral-400 font-light leading-relaxed">
          Aggregated waste collection metrics across pilot Bengaluru wards. All figures below reflect simulated research demo data.
        </p>
      </div>

      {/* Ward Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {wards.map((w) => (
          <div
            key={w.ward_name}
            className="p-8 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-6 relative overflow-hidden text-slate-900 dark:text-white"
          >
            {/* Demo Data Flag Pill */}
            <div className="absolute top-4 right-4">
              <span className="text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400">
                Demo Data
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#D7FF35]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-slate-900 dark:text-white">{w.ward_name} Ward</h2>
                <span className="text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">{w.zone}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-slate-500 dark:text-[#A7B9A8] text-[10px] block uppercase">Total Collection</span>
                <span className="text-slate-900 dark:text-white text-base font-bold">{w.total_collected_kg.toLocaleString()} kg</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-slate-500 dark:text-[#A7B9A8] text-[10px] block uppercase">Dry Diversion</span>
                <span className="text-emerald-700 dark:text-[#D7FF35] text-base font-bold">{w.segregation_percentage}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-slate-500 dark:text-[#A7B9A8] text-[10px] block uppercase">Wet Organic</span>
                <span className="text-emerald-600 dark:text-[#10B981] text-sm font-semibold">{w.wet_kg.toLocaleString()} kg</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-slate-500 dark:text-[#A7B9A8] text-[10px] block uppercase">Dry Recyclable</span>
                <span className="text-blue-600 dark:text-[#3B82F6] text-sm font-semibold">{w.dry_kg.toLocaleString()} kg</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* Phase E: Civic Open Data & Research Repository with N < 10 Suppression */}
      {/* ===================================================================== */}
      <section className="space-y-8 pt-8 border-t border-slate-200 dark:border-white/10" id="civic-open-data">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-[#D7FF35] uppercase tracking-wider mb-1">
              <Database className="w-3.5 h-3.5" />
              <span>DPDP ACT 2023 CERTIFIED</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white tracking-tight">
              {t('opendata.title')}
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-2xl">
              {t('opendata.subtitle')}
            </p>
          </div>

          <a
            href={api.public.getOpenDataCsvUrl()}
            download="greenpay_bengaluru_open_data.csv"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition shadow-sm dark:shadow-glow-lime shrink-0"
            title="Download full certified open dataset"
          >
            <Download className="w-4 h-4" />
            <span>{t('opendata.btn_download_csv')}</span>
          </a>
        </div>

        {/* Privacy Cell Suppression Banner (DPDP Act Section 9) */}
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold font-mono">
            <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>{t('opendata.suppression_title')}</span>
          </div>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
            {t('opendata.suppression_desc')}
          </p>
        </div>

        {/* Open Data Ward Comparative Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#062B20]/90 overflow-hidden shadow-sm dark:shadow-2xl">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-semibold tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
              <span>Ward Open Data Matrix</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8]">RFC 4180 Format Available</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-600 dark:text-[#A7B9A8]">
              <caption className="sr-only">Public Open Data Ward Metrics Table</caption>
              <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#062B20] text-slate-700 dark:text-[#A7B9A8] text-[10px] uppercase">
                <tr>
                  <th scope="col" className="p-3.5">{t('opendata.col_ward')}</th>
                  <th scope="col" className="p-3.5">{t('opendata.col_zone')}</th>
                  <th scope="col" className="p-3.5 text-right">{t('opendata.col_households')}</th>
                  <th scope="col" className="p-3.5 text-right">{t('opendata.col_collections')}</th>
                  <th scope="col" className="p-3.5 text-right">{t('opendata.col_total_kg')}</th>
                  <th scope="col" className="p-3.5 text-right">{t('opendata.col_dry_kg')}</th>
                  <th scope="col" className="p-3.5 text-right">{t('opendata.col_wet_kg')}</th>
                  <th scope="col" className="p-3.5 text-right">{t('opendata.col_segregation')}</th>
                  <th scope="col" className="p-3.5 text-center">DPDP Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {openDataLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-[#A7B9A8]">
                      <RefreshCw className="w-4 h-4 mx-auto animate-spin mb-1 text-emerald-600 dark:text-[#D7FF35]" />
                      Loading open data records...
                    </td>
                  </tr>
                ) : openDataWards.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-[#A7B9A8]">
                      No open data records published.
                    </td>
                  </tr>
                ) : (
                  openDataWards.map((w) => (
                    <tr key={w.ward_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{w.ward_name}</td>
                      <td className="p-3.5 text-slate-600 dark:text-[#A7B9A8]">{w.zone}</td>
                      <td className="p-3.5 text-right">
                        {w.is_suppressed ? (
                          <span className="text-amber-500 dark:text-amber-400 font-bold">&lt; 10</span>
                        ) : (
                          w.active_households
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {w.is_suppressed ? (
                          <span className="text-amber-500 dark:text-amber-400 font-bold">&lt; 10</span>
                        ) : (
                          w.collection_count
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {w.is_suppressed ? (
                          <span className="text-slate-400 dark:text-[#A7B9A8]/60 italic">Suppressed</span>
                        ) : (
                          <span className="text-slate-900 dark:text-white font-bold">{w.total_collected_kg?.toLocaleString()} kg</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {w.is_suppressed ? (
                          <span className="text-slate-400 dark:text-[#A7B9A8]/60 italic">Suppressed</span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400">{w.dry_recyclable_kg?.toLocaleString()} kg</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {w.is_suppressed ? (
                          <span className="text-slate-400 dark:text-[#A7B9A8]/60 italic">Suppressed</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-[#10B981]">{w.wet_organic_kg?.toLocaleString()} kg</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {w.is_suppressed ? (
                          <span className="text-slate-400 dark:text-[#A7B9A8]/60 italic">Suppressed</span>
                        ) : (
                          <span className="text-emerald-700 dark:text-[#D7FF35] font-bold">
                            {w.segregation_compliance_percentage}%
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {w.is_suppressed ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-[9px] font-bold"
                            title={w.suppression_reason || 'Suppressed under DPDP Section 9'}
                          >
                            <Lock className="w-2.5 h-2.5" />
                            {t('opendata.cell_suppressed')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30 text-[9px] font-bold">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Published (N &ge; 10)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trend Series */}
        {monthlyTrends.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase text-slate-600 dark:text-[#A7B9A8] tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
                <span>{t('opendata.monthly_trends_title')}</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400 dark:text-[#A7B9A8]/60">
                Monthly Aggregations
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {monthlyTrends.map((trend) => (
                <div
                  key={trend.month}
                  className="p-4 rounded-xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 space-y-2 text-xs font-mono shadow-sm dark:shadow-card-dark text-slate-900 dark:text-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-900 dark:text-white font-bold">{trend.month}</span>
                    {trend.is_suppressed ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px]">
                        Suppressed
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30 text-[9px]">
                        {trend.collection_count} logs
                      </span>
                    )}
                  </div>

                  {trend.is_suppressed ? (
                    <p className="text-[10px] text-slate-400 dark:text-[#A7B9A8]/60 italic">
                      Fewer than 10 weighments in monthly bucket.
                    </p>
                  ) : (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-500 dark:text-[#A7B9A8]">
                        <span>Total Weight:</span>
                        <span className="text-slate-900 dark:text-white font-semibold">{trend.total_kg?.toLocaleString()} kg</span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-[#A7B9A8]">
                        <span>Dry Recyclable:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{trend.dry_kg?.toLocaleString()} kg</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
