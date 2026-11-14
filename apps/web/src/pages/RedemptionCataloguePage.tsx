import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Package,
  Layers,
  Scale,
  QrCode,
  ArrowRight,
  Clock,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface RedemptionCataloguePageProps {
  navigate?: (path: string) => void;
}

// 5 Approved Official Grocery Products
interface GroceryProduct {
  id: string;
  title: string;
  quantity: string;
  description: string;
  credit_cost: number;
  stock_remaining: number;
  partner_name: string;
  badge_text: string;
  image_url: string;
  category: string;
}

const OFFICIAL_GROCERIES: GroceryProduct[] = [
  {
    id: 'groc-dal-01',
    title: 'Toor Dal',
    quantity: '1 kg',
    description: '1 kg High-Protein Polished Toor Dal (Pigeon Pea). Unpolished, chemical-free essential legume packed with essential plant protein.',
    credit_cost: 140,
    stock_remaining: 310,
    partner_name: 'Karnataka Food & Civil Supplies',
    badge_text: '1 kg • High Protein',
    image_url: '/groceries/toor-dal.png',
    category: 'Pulses & Legumes'
  },
  {
    id: 'groc-rice-02',
    title: 'Rice',
    quantity: '1 kg',
    description: '1 kg Premium Sona Masoori Rice. Clean, aged high-yield staple sourced directly through verified Karnataka agricultural cooperatives.',
    credit_cost: 120,
    stock_remaining: 420,
    partner_name: 'Karnataka Food & Civil Supplies',
    badge_text: '1 kg • Staple Ration',
    image_url: '/groceries/rice.png',
    category: 'Grains & Cereals'
  },
  {
    id: 'groc-oil-03',
    title: 'Sunflower Cooking Oil',
    quantity: '1 litre',
    description: '1 litre Refined Sunflower Cooking Oil Pouch. Fortified with Vitamins A & D, ultra-pure, heart-healthy cold-filtered culinary oil.',
    credit_cost: 150,
    stock_remaining: 225,
    partner_name: 'Karnataka Food & Civil Supplies',
    badge_text: '1 Litre • Fortified Oil',
    image_url: '/groceries/cooking-oil.jpg',
    category: 'Cooking Oils'
  },
  {
    id: 'groc-sugar-04',
    title: 'Sugar',
    quantity: '1 kg',
    description: '1 kg Pure Refined White Cane Sugar. Sulfur-free crystalline cane sugar processed under certified national food safety standards.',
    credit_cost: 80,
    stock_remaining: 380,
    partner_name: 'Karnataka Food & Civil Supplies',
    badge_text: '1 kg • Sulfur Free',
    image_url: '/groceries/sugar.jpg',
    category: 'Cooking Staples'
  },
  {
    id: 'groc-salt-05',
    title: 'Iodized Salt',
    quantity: '1 kg',
    description: '1 kg Vacuum Evaporated Pure Cooking Salt. Micro-filtered and fortified with essential dietary minerals for household health.',
    credit_cost: 60,
    stock_remaining: 510,
    partner_name: 'Karnataka Food & Civil Supplies',
    badge_text: '1 kg • Essential Mineral',
    image_url: '/groceries/salt.png',
    category: 'Cooking Staples'
  }
];

export const RedemptionCataloguePage: React.FC<RedemptionCataloguePageProps> = ({ navigate = () => {} }) => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'catalogue' | 'history'>('catalogue');
  const [balance, setBalance] = useState<number>(0);
  const [products, setProducts] = useState<GroceryProduct[]>(OFFICIAL_GROCERIES);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isPending = user?.status === 'PENDING';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch catalogue & balance from API
      const catData = await api.citizen.getRedemptionCatalogue().catch(() => ({ balance: 0, items: [] }));
      setBalance(catData.balance || 0);

      // Order strictly as: Toor Dal, Rice, Cooking Oil, Sugar, Salt
      if (catData.items && catData.items.length > 0) {
        const ordered = OFFICIAL_GROCERIES.map((official) => {
          const serverItem = catData.items.find((it: any) => {
            const sTitle = (it.title || '').toLowerCase().trim();
            const oTitle = official.title.toLowerCase().trim();
            if (sTitle === oTitle) return true;
            if ((official.title.includes('Oil') || official.title.includes('oil')) && (sTitle.includes('oil') || sTitle.includes('cooking'))) return true;
            if ((official.title.includes('Salt') || official.title.includes('salt')) && sTitle.includes('salt')) return true;
            if (official.title.includes('Dal') && (sTitle.includes('dal') || sTitle.includes('toor'))) return true;
            if (official.title.includes('Rice') && sTitle.includes('rice')) return true;
            if (official.title.includes('Sugar') && sTitle.includes('sugar')) return true;
            return false;
          });

          if (serverItem) {
            return {
              ...official,
              id: serverItem.id,
              title: serverItem.title || official.title,
              credit_cost: serverItem.credit_cost ?? official.credit_cost,
              stock_remaining: serverItem.stock_remaining ?? official.stock_remaining,
              partner_name: serverItem.partner_name || official.partner_name,
              badge_text: serverItem.badge_text || official.badge_text,
              description: serverItem.description || official.description,
            };
          }
          return official;
        });
        setProducts(ordered);
      } else {
        setProducts(OFFICIAL_GROCERIES);
      }

      // 2. Fetch citizen redemption history if authenticated
      if (user) {
        const histData = await api.citizen.getRedemptionHistory().catch(() => []);
        setHistory(histData || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load grocery rewards catalogue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOpenRedeemModal = (product: GroceryProduct) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedProduct(product);
    setSuccessResult(null);
    setError(null);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedProduct || !user) return;
    setRedeeming(true);
    setError(null);

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp-groc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        item_id: selectedProduct.id,
        idempotency_key: idempotencyKey,
      };

      const res = await api.citizen.redeemItem(payload);
      setSuccessResult({
        ...res,
        product_title: res.item_title || selectedProduct.title,
        quantity: res.item_quantity || selectedProduct.quantity,
        credits_spent: res.credits_spent ?? selectedProduct.credit_cost,
        redemption_reference: res.redemption_reference || res.coupon_code || `GP-GROC-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        voucher_code: res.coupon_code || `GP-GROC-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        previous_balance: res.previous_balance ?? balance,
        remaining_balance: res.remaining_balance ?? Math.max(0, balance - selectedProduct.credit_cost),
        citizen_name: res.citizen_name || user?.name || 'Citizen Household',
        citizen_greenpay_id: res.citizen_greenpay_id || user?.greenpay_id || 'GP-CITIZEN',
        status: res.status || 'CONFIRMED',
        timestamp: res.created_at || new Date().toISOString(),
      });

      // Update local balance immediately
      setBalance((prev) => Math.max(0, prev - selectedProduct.credit_cost));
      
      // Refresh backend state
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Grocery redemption transaction failed. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      
      {/* =================================================================== */}
      {/* 1. CINEMATIC HERO BANNER & AUTHORITATIVE BALANCE                    */}
      {/* =================================================================== */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#062B20] via-[#0D4935] to-[#062B20] border border-white/10 p-8 sm:p-10 shadow-2xl overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-[#D7FF35]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7FF35]/15 border border-[#D7FF35]/30 text-[#D7FF35] text-xs font-mono font-semibold tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>OFFICIAL BENGALURU GROCERY REWARDS</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-[1.1]">
              Civic Grocery Rewards
            </h1>
            
            <p className="text-[#A7B9A8] text-sm sm:text-base leading-relaxed">
              Exchange your verified Green Points for essential household groceries: Toor Dal, Rice, Cooking Oil, Sugar, and Salt. Sourced directly through verified Karnataka cooperative ration supply chains.
            </p>
          </div>

          {/* Authoritative Individual Balance Card */}
          <div className="p-6 rounded-2xl bg-[#041B15]/90 border border-white/10 flex flex-col justify-between shrink-0 min-w-[240px] shadow-lg">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#A7B9A8] tracking-wider block">
                Available Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                  {user ? balance.toFixed(1) : '—'}
                </span>
                <span className="text-sm font-bold text-[#D7FF35] font-mono">GP</span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A7B9A8]">
              <span className="inline-flex items-center gap-1.5 text-[#D7FF35]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{user ? 'Verified Individual Ledger' : 'Login to View Balance'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Non-Monetary Strict Disclaimer */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-start gap-3 text-xs text-[#A7B9A8]">
          <ShieldCheck className="w-4 h-4 text-[#D7FF35] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Strict Non-Monetary Policy:</strong> Green Points are non-monetary civic ration credits earned exclusively by handing over verified dry recyclables. Green Points carry zero cash value, cannot be converted to currency, and cannot be transferred to UPI, Paytm, or bank accounts.
          </p>
        </div>
      </div>

      {/* Account Pending Doorstep Verification Warning */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-300 block mb-0.5 font-semibold">Account Pending Doorstep Verification</strong>
            Your account is currently pending initial doorstep supervisor verification. You can browse the grocery catalogue now; redemptions will unlock immediately after your first verified doorstep collection.
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. HOW GREEN POINTS WORK: STEP-BY-STEP CIVIC PROTOCOL                */}
      {/* =================================================================== */}
      <div className="p-8 rounded-3xl bg-[#062B20] border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="micro-label text-[#D7FF35]">THE COLLECTION-TO-GROCERY PROTOCOL</span>
            <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight mt-1">
              How You Earn and Redeem Green Points
            </h2>
          </div>
          <p className="text-xs text-[#A7B9A8] max-w-md leading-relaxed">
            Bengaluru households earn Green Points solely on verified dry recyclable materials. Follow these 5 steps to collect fresh kitchen rations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-[#0D4935]/60 border border-white/10 space-y-2">
            <div className="font-mono text-xs text-[#D7FF35] font-bold">STEP 01</div>
            <h3 className="text-sm font-semibold text-white">Source-Segregate</h3>
            <p className="text-[11px] text-[#A7B9A8] leading-relaxed">
              Sort clean dry recyclables into the 8 approved categories (metals, PET bottles, plastics, papers, cardboard, glass, and textiles).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D4935]/60 border border-white/10 space-y-2">
            <div className="font-mono text-xs text-[#D7FF35] font-bold">STEP 02</div>
            <h3 className="text-sm font-semibold text-white">Doorstep Weighment</h3>
            <p className="text-[11px] text-[#A7B9A8] leading-relaxed">
              Supervisor scans your permanent QR ID and weighs segregated dry recyclables on calibrated digital scales.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D4935]/60 border border-white/10 space-y-2">
            <div className="font-mono text-xs text-[#D7FF35] font-bold">STEP 03</div>
            <h3 className="text-sm font-semibold text-white">Points Credited</h3>
            <p className="text-[11px] text-[#A7B9A8] leading-relaxed">
              Points are calculated by verified category rate (e.g. 22 GP/kg metal, 18 GP/kg PET) and written to your ledger.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D4935]/60 border border-white/10 space-y-2">
            <div className="font-mono text-xs text-[#D7FF35] font-bold">STEP 04</div>
            <h3 className="text-sm font-semibold text-white">Select Ration</h3>
            <p className="text-[11px] text-[#A7B9A8] leading-relaxed">
              Choose required everyday grocery staples from this catalogue: Toor Dal, Rice, Cooking Oil, Sugar, or Salt.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D4935]/60 border border-white/10 space-y-2">
            <div className="font-mono text-xs text-[#D7FF35] font-bold">STEP 05</div>
            <h3 className="text-sm font-semibold text-white">Pickup / Delivery</h3>
            <p className="text-[11px] text-[#A7B9A8] leading-relaxed">
              Receive a secure voucher code with QR fulfillment to claim at ward ration depots or during morning route delivery.
            </p>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. NAVIGATION TABS: GROCERY CATALOGUE & REDEMPTION HISTORY          */}
      {/* =================================================================== */}
      <div className="flex border-b border-white/10 space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('catalogue')}
          className={`pb-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'catalogue'
              ? 'border-[#D7FF35] text-[#D7FF35]'
              : 'border-transparent text-[#A7B9A8] hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Grocery Catalogue</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#D7FF35]/15 text-[#D7FF35] font-mono">
            5 Items
          </span>
        </button>

        {user && (
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-[#D7FF35] text-[#D7FF35]'
                : 'border-transparent text-[#A7B9A8] hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Redemption History</span>
            {history.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-white font-mono">
                {history.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: GROCERY CATALOGUE (EXACTLY 5 PRODUCTS)                       */}
      {/* =================================================================== */}
      {activeTab === 'catalogue' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-24 text-center space-y-3 text-[#A7B9A8]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#D7FF35]" />
              <p className="text-xs font-mono">Loading verified grocery catalogue...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((item) => {
                const canAfford = user ? balance >= item.credit_cost : true;
                const isOutOfStock = item.stock_remaining <= 0;
                const canRedeem = user && canAfford && !isPending && !isOutOfStock;

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl bg-[#0D4935]/80 border border-white/10 overflow-hidden shadow-card-dark flex flex-col justify-between hover:border-[#D7FF35]/50 transition group"
                  >
                    {/* Product Image & Badge Header */}
                    <div>
                      <div className="relative h-48 w-full overflow-hidden bg-[#041B15]">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0D4935] via-transparent to-black/30" />
                        
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#041B15]/90 border border-white/20 text-[#D7FF35] backdrop-blur-md">
                            {item.quantity}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] backdrop-blur-md">
                            In Stock ({item.stock_remaining})
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                          <span className="text-xs font-mono uppercase text-[#A7B9A8]">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white tracking-tight">
                            {item.title}
                          </h3>
                          <span className="text-xs font-mono text-[#D7FF35] font-semibold">
                            {item.quantity}
                          </span>
                        </div>

                        <p className="text-xs text-[#A7B9A8] leading-relaxed line-clamp-3">
                          {item.description}
                        </p>

                        <div className="pt-2 text-[11px] font-mono text-[#A7B9A8]/70 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-[#D7FF35]" />
                          <span>Supply Partner: {item.partner_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost & Action Footer */}
                    <div className="p-6 pt-4 border-t border-white/10 bg-[#062B20]/50 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-[#A7B9A8] block">
                          Civic Ration Cost
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-black text-white font-mono">
                            {item.credit_cost}
                          </span>
                          <span className="text-xs font-bold text-[#D7FF35] font-mono">GP</span>
                        </div>
                      </div>

                      {user ? (
                        <button
                          type="button"
                          onClick={() => handleOpenRedeemModal(item)}
                          disabled={!canRedeem}
                          className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition shadow-sm ${
                            canRedeem
                              ? 'bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] shadow-glow-lime'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-not-allowed'
                              : 'bg-white/5 text-[#A7B9A8]/40 border border-white/10 cursor-not-allowed'
                          }`}
                        >
                          {isPending
                            ? 'Pending Verification'
                            : !canAfford
                            ? `Need ${item.credit_cost - balance} GP`
                            : 'Redeem Item'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate('/login')}
                          className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] transition shadow-glow-lime flex items-center gap-1.5"
                        >
                          <span>Login to Redeem</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: REDEMPTION HISTORY (VOUCHER CODES & FULFILLMENT)              */}
      {/* =================================================================== */}
      {activeTab === 'history' && user && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Your Grocery Redemptions</h2>
            <span className="text-xs font-mono text-[#A7B9A8]">
              {history.length} {history.length === 1 ? 'redemption' : 'redemptions'} recorded
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-16 bg-[#0D4935] rounded-3xl border border-white/10 p-8 space-y-3">
              <ShoppingBag className="w-12 h-12 text-[#A7B9A8]/40 mx-auto" />
              <h3 className="text-base font-bold text-white">No Grocery Redemptions Yet</h3>
              <p className="text-xs text-[#A7B9A8] max-w-sm mx-auto">
                Your redeemed grocery items, voucher codes, and collection receipts will appear here once you redeem items using your Green Points.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('catalogue')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#D7FF35] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider"
              >
                Browse Catalogue
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((tx) => (
                <div
                  key={tx.id}
                  className="p-5 rounded-2xl bg-[#0D4935] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#062B20] border border-white/10 flex items-center justify-center text-[#D7FF35] shrink-0 mt-0.5">
                      <ShoppingBag className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                          Confirmed Ration
                        </span>
                        <span className="text-xs text-[#A7B9A8]/70 font-mono">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white">
                        {tx.item_title || 'Civic Grocery Ration'} {tx.item_quantity ? `(${tx.item_quantity})` : ''}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#A7B9A8] font-mono">
                        {tx.redemption_reference && (
                          <span>Ref: <strong className="text-white">{tx.redemption_reference}</strong></span>
                        )}
                        {tx.coupon_code && (
                          <div className="flex items-center gap-1.5">
                            <span>Voucher:</span>
                            <code className="px-2 py-0.5 rounded bg-[#041B15] text-[#D7FF35] font-bold">
                              {tx.coupon_code}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-[#A7B9A8] block">Debited</span>
                      <span className="text-sm font-bold font-mono text-rose-400">
                        -{tx.credits_spent} GP
                      </span>
                    </div>

                    {tx.coupon_code && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tx.coupon_code)}
                        className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#D7FF35]/15 hover:bg-[#D7FF35]/25 border border-[#D7FF35]/30 text-[#D7FF35] flex items-center gap-1.5 transition"
                      >
                        {copiedCode === tx.coupon_code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#D7FF35]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Voucher</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. REDEMPTION CONFIRMATION & OFFICIAL RECEIPT MODAL                  */}
      {/* =================================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#062B20] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-white/10 relative max-h-[90vh] overflow-y-auto">
            {successResult ? (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-[#D7FF35]/20 text-[#D7FF35] rounded-full flex items-center justify-center mx-auto shadow-glow-lime">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  
                  <span className="micro-label text-[#D7FF35]">CIVIC TRANSACTION CONFIRMED</span>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Official Redemption Receipt
                  </h3>
                  <p className="text-xs text-[#A7B9A8] max-w-sm mx-auto leading-relaxed">
                    Transaction written to the append-only ledger. Present this digital fulfillment voucher at your ward ration depot.
                  </p>
                </div>

                {/* Official Receipt Box */}
                <div className="p-5 rounded-2xl bg-[#041B15] border border-white/10 space-y-3 font-mono text-xs">
                  {/* Reference & Status */}
                  <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                    <div>
                      <span className="text-[10px] uppercase text-[#A7B9A8] block">Redemption Reference</span>
                      <span className="text-white font-bold">{successResult.redemption_reference}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 uppercase">
                      {successResult.status}
                    </span>
                  </div>

                  {/* Citizen Details */}
                  <div className="flex justify-between items-center text-[#A7B9A8]">
                    <span>Household / Citizen:</span>
                    <span className="text-white font-bold font-sans">
                      {successResult.citizen_name} ({successResult.citizen_greenpay_id})
                    </span>
                  </div>

                  {/* Product & Quantity */}
                  <div className="flex justify-between items-center text-[#A7B9A8]">
                    <span>Ration Item:</span>
                    <span className="text-white font-bold font-sans">
                      {successResult.product_title} ({successResult.quantity})
                    </span>
                  </div>

                  {/* Price at Redemption */}
                  <div className="flex justify-between items-center text-[#A7B9A8]">
                    <span>Price at Redemption:</span>
                    <span className="text-white font-bold">{successResult.credits_spent} GP</span>
                  </div>

                  {/* Points Deducted */}
                  <div className="flex justify-between items-center text-[#A7B9A8]">
                    <span>Points Deducted:</span>
                    <span className="text-rose-400 font-bold">-{successResult.credits_spent} GP</span>
                  </div>

                  {/* Previous Balance */}
                  <div className="flex justify-between items-center text-[#A7B9A8]">
                    <span>Previous Balance:</span>
                    <span className="text-white">{Number(successResult.previous_balance).toFixed(1)} GP</span>
                  </div>

                  {/* Remaining Balance */}
                  <div className="flex justify-between items-center pt-2 border-t border-white/10 text-white font-bold">
                    <span>Remaining Balance:</span>
                    <span className="text-[#D7FF35]">{Number(successResult.remaining_balance).toFixed(1)} GP</span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex justify-between items-center text-[11px] text-[#A7B9A8]/70 pt-1">
                    <span>Timestamp:</span>
                    <span>
                      {new Date(successResult.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })}
                    </span>
                  </div>

                  {/* Voucher Box */}
                  <div className="pt-3 border-t border-white/10 space-y-1">
                    <span className="text-[10px] uppercase text-[#A7B9A8] block">
                      Digital Voucher Code
                    </span>
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#062B20] border border-[#D7FF35]/30">
                      <code className="text-base font-black text-[#D7FF35] tracking-wider">
                        {successResult.voucher_code}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(successResult.voucher_code)}
                        className="px-3 py-1 rounded-lg bg-[#D7FF35] text-[#041B15] text-[11px] font-bold flex items-center gap-1 shadow-glow-lime hover:bg-[#C4F020] transition"
                      >
                        {copiedCode === successResult.voucher_code ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSuccessResult(null);
                    }}
                    className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-[#A7B9A8] hover:text-white font-mono text-xs font-semibold uppercase tracking-wider transition"
                  >
                    Close Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSuccessResult(null);
                      setActiveTab('history');
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition shadow-glow-lime"
                  >
                    View History
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="micro-label text-[#D7FF35]">CONFIRM GROCERY REDEMPTION</span>
                  <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                    Redeem {selectedProduct.title} ({selectedProduct.quantity})
                  </h3>
                  <p className="text-xs text-[#A7B9A8] mt-1 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* Ledger Debit Summary */}
                <div className="p-4 rounded-2xl bg-[#041B15] border border-white/10 space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>Product & Quantity:</span>
                    <span className="text-white font-bold font-sans">{selectedProduct.title} ({selectedProduct.quantity})</span>
                  </div>
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>Civic Redemption Price:</span>
                    <span className="text-white font-bold">{selectedProduct.credit_cost.toFixed(1)} GP</span>
                  </div>
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>Current Available Balance:</span>
                    <span className="text-white font-bold">{balance.toFixed(1)} GP</span>
                  </div>
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>Points to Debit:</span>
                    <span className="text-rose-400 font-bold">-{selectedProduct.credit_cost.toFixed(1)} GP</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
                    <span>Remaining Balance:</span>
                    <span className={balance >= selectedProduct.credit_cost ? "text-[#D7FF35]" : "text-rose-400"}>
                      {(balance - selectedProduct.credit_cost).toFixed(1)} GP
                    </span>
                  </div>
                </div>

                {balance < selectedProduct.credit_cost ? (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Insufficient points. You need {(selectedProduct.credit_cost - balance).toFixed(1)} more GP to redeem this item.</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#A7B9A8] leading-relaxed">
                    By confirming, your household ledger will be atomically debited {selectedProduct.credit_cost} GP. An official digital voucher will be generated immediately.
                  </p>
                )}

                {/* Modal Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    disabled={redeeming}
                    className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-[#A7B9A8] hover:text-white font-mono text-xs font-semibold uppercase tracking-wider transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRedeem}
                    disabled={redeeming || balance < selectedProduct.credit_cost}
                    className="flex-1 py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] disabled:opacity-40 disabled:cursor-not-allowed text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition shadow-glow-lime flex items-center justify-center gap-2"
                  >
                    {redeeming ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Debiting Ledger...</span>
                      </>
                    ) : (
                      <span>Confirm Redemption</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
