import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Award,
  QrCode,
  Layers,
  History,
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertCircle,
  Info,
  ChevronRight,
  Truck,
  ShoppingBag,
  Scale,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  X,
  Coins,
  Milk,
  Recycle,
  Newspaper,
  Box,
  Wine,
  Shirt
} from 'lucide-react';
import { DisputeModal } from '../components/DisputeModal';

interface CitizenDashboardProps {
  navigate: (path: string) => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [scoreData, setScoreData] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [recentCollections, setRecentCollections] = useState<any[]>([]);
  const [recentCredits, setRecentCredits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [missedDisputeOpen, setMissedDisputeOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      api.citizen.getPointsBalance(),
      api.citizen.getCollections(5, 0),
      api.citizen.getCreditsLedger(5, 0),
      api.citizen.getDryWasteCategories(),
      api.citizen.getGreenScore(),
      api.citizen.getSchedule(),
    ]).then(([balRes, colRes, credRes, catRes, scoreRes, schedRes]) => {
      if (!isMounted) return;

      if (balRes.status === 'fulfilled' && balRes.value) {
        setBalanceData(balRes.value);
      }
      if (colRes.status === 'fulfilled' && Array.isArray(colRes.value)) {
        setRecentCollections(colRes.value);
      } else {
        // Fallback to waste history if collections empty
        api.citizen.getWasteHistory(5, 0).then((wh) => {
          if (isMounted && Array.isArray(wh)) {
            setRecentCollections(wh);
          }
        }).catch(() => {});
      }
      if (credRes.status === 'fulfilled' && Array.isArray(credRes.value)) {
        setRecentCredits(credRes.value);
      }
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
        setCategories(catRes.value);
      }
      if (scoreRes.status === 'fulfilled' && scoreRes.value) {
        setScoreData(scoreRes.value);
      }
      if (schedRes.status === 'fulfilled' && schedRes.value) {
        setScheduleData(schedRes.value);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const getCategoryIcon = (code: string) => {
    switch (code) {
      case 'aluminium_metal':
        return <Coins className="w-4 h-4 text-[#D7FF35]" />;
      case 'pet_bottles':
        return <Milk className="w-4 h-4 text-[#D7FF35]" />;
      case 'other_recyclable_plastics':
        return <Recycle className="w-4 h-4 text-[#D7FF35]" />;
      case 'newspapers_magazines':
        return <Newspaper className="w-4 h-4 text-[#D7FF35]" />;
      case 'cardboard':
        return <Box className="w-4 h-4 text-[#D7FF35]" />;
      case 'glass_bottles':
        return <Wine className="w-4 h-4 text-[#D7FF35]" />;
      case 'textiles':
        return <Shirt className="w-4 h-4 text-[#D7FF35]" />;
      default:
        return <FileText className="w-4 h-4 text-[#D7FF35]" />;
    }
  };

  const availableGP = balanceData?.current_balance ?? (
    recentCredits.reduce((acc, t) => acc + (t.credits_amount || 0), 0)
  );
  const totalEarnedGP = balanceData?.total_earned ?? (
    recentCredits.filter(t => t.credits_amount > 0 && !t.is_reversal).reduce((acc, t) => acc + t.credits_amount, 0)
  );
  const totalRedeemedGP = balanceData?.total_redeemed ?? (
    recentCredits.filter(t => t.credits_amount < 0).reduce((acc, t) => acc + Math.abs(t.credits_amount), 0)
  );
  const totalWeightKg = balanceData?.total_weight_kg ?? (
    recentCollections.reduce((acc, c) => acc + (c.total_weight_kg || 0), 0)
  );
  const totalWeighmentsCount = balanceData?.total_weighments_count ?? recentCollections.length;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      
      {/* Pending Account Notice (Amendment #3) */}
      {user?.status === 'PENDING' && (
        <div
          role="alert"
          className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2"
        >
          <div className="flex items-center gap-2 font-semibold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>Account Status: Pending Doorstep Verification</span>
          </div>
          <p className="leading-relaxed">
            Welcome to GreenPay! Your registration is complete, but your account is pending physical identity confirmation at your first doorstep collection. Please present your permanent QR card (<code className="font-mono text-white font-bold">{user?.greenpay_id}</code>) to your ward supervisor tomorrow morning. Once confirmed, dry-waste collections will immediately credit Green Points!
          </p>
        </div>
      )}

      {/* Top Welcome & Citizen Identity Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-md transition-colors duration-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">WARD: {user?.ward_name || balanceData?.ward_name || 'BENGALURU'}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#A7B9A8]">
              Meter: {user?.masked_meter || '[ENCRYPTED]'}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              user?.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
            }`}>
              {user?.status === 'ACTIVE' ? 'Verified Household' : 'Pending Activation'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user?.name || balanceData?.citizen_name || 'Citizen'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8]">
            Permanent Citizen ID:{' '}
            <button
              type="button"
              onClick={() => navigate('/qr-card')}
              className="font-mono text-emerald-700 dark:text-[#D7FF35] font-bold hover:underline"
            >
              {user?.greenpay_id || balanceData?.greenpay_id} &rarr;
            </button>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/rewards')}
            className="px-4 py-2.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition shadow-sm dark:shadow-glow-lime"
          >
            <ShoppingBag className="w-4 h-4 text-white dark:text-[#041B15]" />
            <span>Redeem Groceries</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/qr-card')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#0D4935] dark:hover:bg-[#14543D] border border-slate-200 dark:border-white/15 text-xs font-semibold dark:text-white flex items-center gap-2 transition"
          >
            <QrCode className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
            <span>Citizen QR Card</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-[#A7B9A8] dark:hover:text-white transition"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (4 Distinct Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Available Green Points (Grocery Balance) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg flex flex-col justify-between backdrop-blur-md relative overflow-hidden transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A7B9A8] font-mono">
              Available Green Points
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] dark:border-transparent font-bold">
              Grocery Balance
            </span>
          </div>

          <div className="my-3 space-y-1">
            <div className="text-3xl sm:text-4xl font-bold font-mono text-emerald-700 dark:text-[#D7FF35] tracking-tight">
              {Number(availableGP).toFixed(1)} <span className="text-sm text-slate-500 dark:text-[#A7B9A8] font-normal">GP</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] leading-tight">
              Points, NOT money. Redeemable for verified kitchen groceries.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/rewards')}
            className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-[#D7FF35]/20 dark:hover:bg-[#D7FF35]/30 dark:border-[#D7FF35]/40 dark:text-[#D7FF35] text-xs font-bold font-mono uppercase tracking-wider transition text-center flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Redeem Staples</span>
          </button>
        </div>

        {/* Card 2: Earning & Redemption Ledger Summary */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg flex flex-col justify-between backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A7B9A8] font-mono">
              Points Ledger
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#A7B9A8]">
              Immutable
            </span>
          </div>

          <div className="my-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-[#A7B9A8]">Total Earned:</span>
              <span className="font-bold text-slate-900 dark:text-white">+{Number(totalEarnedGP).toFixed(1)} GP</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-[#A7B9A8]">Total Redeemed:</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">-{Number(totalRedeemedGP).toFixed(1)} GP</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-600 dark:text-[#A7B9A8]">
              <span>Net Available:</span>
              <span className="font-bold font-mono text-emerald-700 dark:text-[#D7FF35]">{Number(availableGP).toFixed(1)} GP</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/credits')}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold dark:text-white flex items-center justify-center gap-1 transition text-center"
          >
            <span>View Full Ledger</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-[#A7B9A8]" />
          </button>
        </div>

        {/* Card 3: Verified Dry Recyclables Collected */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg flex flex-col justify-between backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A7B9A8] font-mono">
              Dry Recyclables
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
              Verified
            </span>
          </div>

          <div className="my-3 space-y-1">
            <div className="text-3xl sm:text-4xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {Number(totalWeightKg).toFixed(1)} <span className="text-sm text-slate-500 dark:text-[#A7B9A8] font-normal">kg</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">
              {totalWeighmentsCount} verified doorstep collection{totalWeighmentsCount === 1 ? '' : 's'} recorded.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/history')}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold dark:text-white flex items-center justify-center gap-1 transition text-center"
          >
            <span>Collection History</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-[#A7B9A8]" />
          </button>
        </div>

        {/* Card 4: Green Score (0–100 Civic Performance Metric) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg flex flex-col justify-between backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A7B9A8] font-mono">
              Green Score (0–100)
            </span>
            <button
              type="button"
              onClick={() => setScoreModalOpen(true)}
              className="text-slate-500 dark:text-[#A7B9A8] hover:text-emerald-700 dark:hover:text-[#D7FF35] transition"
              title="Formula breakdown"
              aria-label="Formula breakdown"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 my-2">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-600 dark:border-[#D7FF35] flex items-center justify-center font-bold text-2xl text-slate-900 dark:text-white bg-emerald-50 dark:bg-[#D7FF35]/10 shadow-sm dark:shadow-glow-lime shrink-0">
              {scoreData ? Math.round(scoreData.total_score) : Math.round(user?.green_score || 50)}
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {scoreData?.level_label || 'Eco Recycler'}
              </div>
              <p className="text-[10px] text-slate-600 dark:text-[#A7B9A8]">
                Civic rating based on segregation quality & regularity.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/5 text-[10px] font-mono text-slate-600 dark:text-[#A7B9A8] flex justify-between">
            <span>Purity: {scoreData?.segregation_score || 20}/40</span>
            <span>Consistency: {scoreData?.consistency_score || 15}/30</span>
            <span>Diversion: {scoreData?.diversion_score || 15}/30</span>
          </div>
        </div>
      </div>

      {/* Green Points Transparency: 8 Categories & Live Earning Rates */}
      <div className="p-8 rounded-3xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl space-y-6 backdrop-blur-md transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">OFFICIAL DRY-WASTE EARNING RATES</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                Authoritative Rates
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-light text-slate-900 dark:text-white tracking-tight mt-1">
              Green Points Transparency & Tariffs
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
              Points are awarded strictly per kilogram of verified dry recyclables at calibrated doorstep weighments.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-[#A7B9A8] max-w-sm">
            <span className="text-slate-900 dark:text-white font-semibold">Award Formula:</span>{' '}
            <span className="text-emerald-700 dark:text-[#D7FF35]">GP = Weight (kg) × Rate (GP/kg)</span>
          </div>
        </div>

        {/* 8 Uniform Category Cards (4x2 Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(categories.length > 0 ? categories : [
            { code: 'aluminium_metal', name: 'Aluminium & Metal', rate_per_kg: 22.0 },
            { code: 'pet_bottles', name: 'PET Bottles', rate_per_kg: 18.0 },
            { code: 'other_recyclable_plastics', name: 'Other Recyclable Plastics', rate_per_kg: 15.0 },
            { code: 'newspapers_magazines', name: 'Newspapers & Magazines', rate_per_kg: 10.0 },
            { code: 'cardboard', name: 'Cardboard', rate_per_kg: 10.0 },
            { code: 'glass_bottles', name: 'Glass Bottles', rate_per_kg: 8.0 },
            { code: 'textiles', name: 'Textiles', rate_per_kg: 8.0 },
            { code: 'mixed_paper', name: 'Mixed Paper', rate_per_kg: 7.0 },
          ]).map((cat) => (
            <div
              key={cat.code}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-[#D7FF35]/40 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  {getCategoryIcon(cat.code)}
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] dark:border-transparent font-bold">
                  Active
                </span>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {cat.name}
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8] mt-0.5">
                  CODE: {cat.code.toUpperCase()}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-baseline justify-between">
                <span className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8]">RATE:</span>
                <span className="text-lg font-bold font-mono text-emerald-700 dark:text-[#D7FF35]">
                  {cat.rate_per_kg} <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8] font-normal">GP/kg</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Doorstep Schedule Card */}
      {scheduleData?.next_pickup && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden backdrop-blur-md transition-colors duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">DOORSTEP SCHEDULE</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-100 text-blue-800 border-blue-200 dark:bg-[#3B82F6]/20 dark:text-[#3B82F6] dark:border-[#3B82F6]/30">
                Dry Recyclables Collection Route
              </span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-emerald-600 dark:text-[#D7FF35]" />
                <span>Next Pickup: {scheduleData.next_pickup.countdown}</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-0.5">
                Window: <span className="text-slate-900 dark:text-white font-mono">{scheduleData.next_pickup.start_time} – {scheduleData.next_pickup.end_time}</span> • Vehicle: <span className="text-slate-900 dark:text-white font-mono">{scheduleData.next_pickup.vehicle_number}</span>
              </p>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] line-clamp-1 max-w-xl">
              {scheduleData.next_pickup.instructions}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {scheduleData.next_pickup.can_report_missed && (
              <button
                type="button"
                onClick={() => setMissedDisputeOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/25 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Not collected?</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/schedule')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold dark:text-white flex items-center gap-1.5 transition"
            >
              <span>Weekly Calendar</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-[#A7B9A8]" />
            </button>
          </div>
        </div>
      )}

      {/* Recent Verified Collections Section */}
      <div className="p-8 rounded-3xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl space-y-6 backdrop-blur-md transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Verified Collections</h2>
            <p className="text-xs text-slate-600 dark:text-[#A7B9A8]">Click any collection to inspect the category-wise weight breakdown.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="text-xs font-mono text-emerald-700 dark:text-[#D7FF35] hover:underline flex items-center gap-1"
          >
            <span>View all collection history</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCollections.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-slate-500 dark:text-[#A7B9A8] text-xs font-mono bg-slate-50 dark:bg-[#041B15] rounded-2xl border border-slate-200 dark:border-white/5 p-6">
            <Clock className="w-8 h-8 mx-auto text-slate-400 dark:text-[#A7B9A8]/50" />
            <div className="text-slate-900 dark:text-white font-semibold">No doorstep collections recorded yet</div>
            <div className="text-[11px] text-slate-500 dark:text-[#A7B9A8]/70">Your collections will appear here once weighed and verified by your ward supervisor.</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5">
            <table className="w-full text-left text-xs font-mono text-slate-700 dark:text-neutral-300">
              <thead className="bg-slate-50 dark:bg-[#041B15] border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A7B9A8] text-[11px] uppercase">
                <tr>
                  <th scope="col" className="p-3.5">Reference ID</th>
                  <th scope="col" className="p-3.5">Date & Time</th>
                  <th scope="col" className="p-3.5">Ward / Supervisor</th>
                  <th scope="col" className="p-3.5">Measured Weight</th>
                  <th scope="col" className="p-3.5">Verification Status</th>
                  <th scope="col" className="p-3.5">Points Awarded</th>
                  <th scope="col" className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {recentCollections.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedCollection(item)}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition"
                  >
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{item.transaction_id}</td>
                    <td className="p-3.5 text-slate-500 dark:text-[#A7B9A8]">
                      {new Date(item.collection_date).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-neutral-300">
                      <div>{item.ward_name || user?.ward_name || 'Bengaluru Ward'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">{item.supervisor_name || 'Municipal Supervisor'}</div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {(item.total_weight_kg || item.dry_kg || 0).toFixed(1)} kg
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300">
                        {item.verification_status || item.dispute_status || 'VERIFIED'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-emerald-700 dark:text-[#D7FF35]">
                      +{Number(item.total_points_earned ?? item.credits_earned ?? 0).toFixed(1)} GP
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="text-emerald-700 dark:text-[#D7FF35] hover:underline text-[11px]">Inspect &rarr;</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Ledger Transactions */}
      <div className="p-8 rounded-3xl bg-white dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl space-y-6 backdrop-blur-md transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Points Activity</h2>
            <p className="text-xs text-slate-600 dark:text-[#A7B9A8]">Append-only ledger entries for earning awards and grocery redemptions.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/credits')}
            className="text-xs font-mono text-emerald-700 dark:text-[#D7FF35] hover:underline flex items-center gap-1"
          >
            <span>View complete ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCredits.length === 0 ? (
          <div className="text-center py-10 text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">
            No points transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5">
            <table className="w-full text-left text-xs font-mono text-slate-700 dark:text-neutral-300">
              <thead className="bg-slate-50 dark:bg-[#041B15] border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A7B9A8] text-[11px] uppercase">
                <tr>
                  <th scope="col" className="p-3.5">Timestamp</th>
                  <th scope="col" className="p-3.5">Transaction Type</th>
                  <th scope="col" className="p-3.5">Description / Formula</th>
                  <th scope="col" className="p-3.5">Points</th>
                  <th scope="col" className="p-3.5">Resulting Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {recentCredits.map((tx) => {
                  const isRedemption = tx.credits_amount < 0;
                  const isReversal = tx.is_reversal;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="p-3.5 text-slate-500 dark:text-[#A7B9A8]">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isRedemption
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                            : isReversal
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                        }`}>
                          {tx.transaction_type || (isRedemption ? 'GROCERY REDEMPTION' : isReversal ? 'REVERSAL' : 'COLLECTION CREDIT')}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-900 dark:text-white max-w-md truncate">
                        {tx.calculation_formula}
                      </td>
                      <td className={`p-3.5 font-bold ${isRedemption ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-[#D7FF35]'}`}>
                        {isRedemption ? `${tx.credits_amount.toFixed(1)} GP` : `+${tx.credits_amount.toFixed(1)} GP`}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 dark:text-[#A7B9A8]">
                        {tx.resulting_balance !== undefined && tx.resulting_balance !== null
                          ? `${Number(tx.resulting_balance).toFixed(1)} GP`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedCollection(null);
          }}
        >
          <div className="bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/15 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl text-left text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">VERIFIED COLLECTION DOSSIER</span>
                <h3 className="text-xl font-bold tracking-tight mt-0.5 text-slate-900 dark:text-white">
                  {selectedCollection.transaction_id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCollection(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-[#A7B9A8] hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Collection Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8] block text-[10px] uppercase">Date & Time</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {new Date(selectedCollection.collection_date).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8] block text-[10px] uppercase">Ward</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {selectedCollection.ward_name || user?.ward_name || 'Koramangala'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8] block text-[10px] uppercase">Supervisor</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {selectedCollection.supervisor_name || 'Ramesh Gowda'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8] block text-[10px] uppercase">Status</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  {selectedCollection.verification_status || selectedCollection.dispute_status || 'CONFIRMED'}
                </span>
              </div>
            </div>

            {/* Itemized Categories Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#A7B9A8]">
                Itemized Dry Recyclables Breakdown
              </h4>

              {selectedCollection.items && selectedCollection.items.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 dark:bg-[#041B15] text-slate-600 dark:text-[#A7B9A8] text-[10px] uppercase">
                      <tr>
                        <th className="p-3">Material Category</th>
                        <th className="p-3">Measured Weight</th>
                        <th className="p-3">Applied Rate</th>
                        <th className="p-3 text-right">Points Awarded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-[#0D4935]/50">
                      {selectedCollection.items.map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {it.category_name || it.category_code}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-neutral-200">
                            {Number(it.weight_kg).toFixed(2)} kg
                          </td>
                          <td className="p-3 text-slate-500 dark:text-[#A7B9A8]">
                            {Number(it.rate_per_kg).toFixed(1)} GP/kg
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 dark:text-[#D7FF35]">
                            +{Number(it.points_earned).toFixed(1)} GP
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5 text-xs font-mono text-slate-600 dark:text-[#A7B9A8] space-y-1">
                  <div className="text-slate-900 dark:text-white font-semibold">Summary Breakdown</div>
                  <div>Formula: {selectedCollection.calculation_formula || 'Calculated via municipal tariff schedule'}</div>
                  <div>Total Dry Weight: {Number(selectedCollection.total_weight_kg || selectedCollection.dry_kg || 0).toFixed(2)} kg</div>
                </div>
              )}
            </div>

            {/* Total Award Banner */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#041B15] border border-emerald-300 dark:border-[#D7FF35]/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] block">Verified Net Earning</span>
                <span className="text-xl font-bold font-mono text-emerald-700 dark:text-[#D7FF35]">
                  +{Number(selectedCollection.total_points_earned ?? selectedCollection.credits_earned ?? 0).toFixed(1)} Green Points
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCollection(null);
                  navigate('/rewards');
                }}
                className="px-4 py-2 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] text-xs font-bold font-mono uppercase transition"
              >
                Redeem Now
              </button>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setSelectedCollection(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Breakdown Modal */}
      {scoreModalOpen && scoreData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="score-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setScoreModalOpen(false);
          }}
        >
          <div className="bg-[#151923] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 id="score-modal-title" className="text-base font-semibold text-white">
                Green Score Mathematical Breakdown
              </h3>
              <button
                type="button"
                onClick={() => setScoreModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                [ESC to Close]
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#A7B9A8]">
              <div className="p-3.5 rounded-xl bg-[#0D4935]/80 border border-white/10 space-y-1">
                <div className="flex justify-between font-semibold text-white">
                  <span>1. Segregation Purity</span>
                  <span className="font-mono text-[#D7FF35]">{scoreData.segregation_score} / 40</span>
                </div>
                <p className="text-[11px] text-[#A7B9A8]">
                  Measures the segregation accuracy and clean separation of dry recyclable categories.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D4935]/80 border border-white/10 space-y-1">
                <div className="flex justify-between font-semibold text-white">
                  <span>2. Collection Consistency</span>
                  <span className="font-mono text-[#D7FF35]">{scoreData.consistency_score} / 30</span>
                </div>
                <p className="text-[11px] text-[#A7B9A8]">
                  Reflects consecutive weekly handovers without missing scheduled ward collections.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D4935]/80 border border-white/10 space-y-1">
                <div className="flex justify-between font-semibold text-white">
                  <span>3. Landfill Diversion</span>
                  <span className="font-mono text-[#D7FF35]">{scoreData.diversion_score} / 30</span>
                </div>
                <p className="text-[11px] text-[#A7B9A8]">
                  Percentage of household dry recyclables recovered by certified industrial circular processors.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="font-semibold text-white block">Tips to Raise Your Score:</span>
                <ul className="list-disc pl-5 space-y-1 text-[#A7B9A8] text-[11px]">
                  {scoreData.tips && scoreData.tips.map((tip: string, i: number) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setScoreModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-medium text-white border border-white/10 transition"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missed Pickup Dispute Modal */}
      <DisputeModal
        isOpen={missedDisputeOpen}
        onClose={() => setMissedDisputeOpen(false)}
        onSuccess={() => setMissedDisputeOpen(false)}
      />
    </div>
  );
};
