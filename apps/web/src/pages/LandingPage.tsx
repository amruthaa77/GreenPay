import React from 'react';
import { 
  QrCode, ShieldCheck, ArrowRight, 
  Check, Lock, Sparkles, Scale, Info,
  ShoppingBag, Coins, Milk, Recycle, Newspaper, Box, Wine, Shirt, FileText
} from 'lucide-react';
import { StationScrollExperience } from '../components/3d/StationScrollExperience';

interface DryCategoryItem {
  id: string;
  name: string;
  tag: string;
  rate: number;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const DRY_RECYCLABLE_CATEGORIES: DryCategoryItem[] = [
  {
    id: 'aluminium-metal',
    name: 'Aluminium & Metal',
    tag: 'Metals',
    rate: 22,
    icon: Coins,
    desc: 'Clean beverage cans, food tins, aluminium foil, and household metallic items rinsed clean.',
  },
  {
    id: 'pet-bottles',
    name: 'PET Bottles',
    tag: 'Resin Code 1',
    rate: 18,
    icon: Milk,
    desc: 'Clear transparent and lightly tinted PET drinking water, juice, and soda beverage bottles.',
  },
  {
    id: 'other-plastics',
    name: 'Other Recyclable Plastics',
    tag: 'HDPE / LDPE / PP',
    rate: 15,
    icon: Recycle,
    desc: 'Rigid plastic containers, shampoo & detergent jugs, household buckets, and plastic tubs.',
  },
  {
    id: 'newspapers-magazines',
    name: 'Newspapers & Magazines',
    tag: 'Publications',
    rate: 10,
    icon: Newspaper,
    desc: 'Dry daily newspapers, printed magazines, periodicals, inserts, and clean paper catalogs.',
  },
  {
    id: 'cardboard',
    name: 'Cardboard',
    tag: 'Corrugated',
    rate: 10,
    icon: Box,
    desc: 'Flattened corrugated shipping boxes, brown carton packaging, and clean kraft paper sheets.',
  },
  {
    id: 'glass-bottles',
    name: 'Glass Bottles',
    tag: 'Glassware',
    rate: 8,
    icon: Wine,
    desc: 'Intact glass beverage bottles and food jars (clear, green, amber) separated from metal lids.',
  },
  {
    id: 'textiles',
    name: 'Textiles',
    tag: 'Fabrics',
    rate: 8,
    icon: Shirt,
    desc: 'Clean, dry unsoiled clothing, fabric offcuts, linen, bedsheets, and recyclable household cloth.',
  },
  {
    id: 'mixed-paper',
    name: 'Mixed Paper',
    tag: 'Office & Pulp',
    rate: 7,
    icon: FileText,
    desc: 'Office white paper, school notebooks, envelopes, brochures, paper bags, and shredded paper.',
  },
];

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {

  return (
    <div className="relative w-full bg-[#041B15] text-[#F4F7F0]">
      
      {/* =================================================================== */}
      {/* 1. CINEMATIC SCROLL-DRIVEN 3D STATION EXPERIENCE (600vh PINNED)     */}
      {/* =================================================================== */}
      <StationScrollExperience navigate={navigate} />

      {/* =================================================================== */}
      {/* 2. EDITORIAL TRANSITION: THE CIVIC MANIFESTO                         */}
      {/* =================================================================== */}
      <section className="relative z-10 py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#F4F7F0] via-emerald-50/50 to-[#F4F7F0] dark:from-[#041B15] dark:via-[#062B20] dark:to-[#041B15] border-t border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pb-16 border-b border-slate-200 dark:border-white/10">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-[#D7FF35]/10 border border-emerald-300 dark:border-[#D7FF35]/30 text-xs font-mono text-emerald-800 dark:text-[#D7FF35]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#D7FF35] animate-ping" />
                <span>BENGALURU CIVIC INFRASTRUCTURE PROTOCOL</span>
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-light tracking-tight text-slate-900 dark:text-white leading-[1.08]">
                Precision waste tracking for India's technological capital.
              </h2>
            </div>
            
            <p className="max-w-md text-sm text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
              Every doorstep transaction is physically anchored to your electricity meter identity, verified by an authorized municipal supervisor, and permanently recorded on an immutable SQLite trigger ledger.
            </p>
          </div>

          {/* Key Metric Pillars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D4935]/40 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-2">
              <div className="font-mono text-3xl sm:text-4xl font-light text-emerald-700 dark:text-[#D7FF35]">10,480+</div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-[#A7B9A8]">Registered Households</div>
              <div className="text-[11px] text-slate-500 dark:text-[#A7B9A8]/70">Anchored via BESCOM ID</div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D4935]/40 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-2">
              <div className="font-mono text-3xl sm:text-4xl font-light text-slate-900 dark:text-white">4 Wards</div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-[#A7B9A8]">Civic Pilot Zones</div>
              <div className="text-[11px] text-slate-500 dark:text-[#A7B9A8]/70">Koramangala, Indiranagar, Jayanagar, Whitefield</div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D4935]/40 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-2">
              <div className="font-mono text-3xl sm:text-4xl font-light text-emerald-700 dark:text-[#D7FF35]">92.4%</div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-[#A7B9A8]">Segregation Purity</div>
              <div className="text-[11px] text-slate-500 dark:text-[#A7B9A8]/70">Verified at doorstep weighment</div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D4935]/40 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-2">
              <div className="font-mono text-3xl sm:text-4xl font-light text-slate-900 dark:text-white">100%</div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-[#A7B9A8]">Non-Monetary Points</div>
              <div className="text-[11px] text-slate-500 dark:text-[#A7B9A8]/70">Zero cash wallets &bull; Pure civic recognition</div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. HOW IT WORKS: THE 4-STEP PHYSICAL-TO-DIGITAL PROTOCOL            */}
      {/* =================================================================== */}
      <section id="how-it-works-section" className="py-28 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#062B20] text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/10 scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">THE COLLECTION PROTOCOL</span>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-slate-900 dark:text-white">
              From doorstep weighment to immutable credit ledger.
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
              GreenPay bridges physical urban logistics with mathematical transparency. Four steps guarantee every gram of waste is accounted for.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between space-y-6 hover:border-emerald-500/50 dark:hover:border-[#D7FF35]/50 transition group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#041B15] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#D7FF35] group-hover:scale-105 transition">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="font-mono text-xs text-emerald-700 dark:text-[#D7FF35] font-semibold tracking-wider">01 // SCAN IDENTITY</div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Doorstep QR Authentication</h3>
                <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
                  Supervisor scans your permanent household QR card (<code className="text-emerald-700 dark:text-[#D7FF35]">GP-XXXXXX</code>) bound directly to your electricity meter account. Zero ghost collections.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-[11px] font-mono text-emerald-700 dark:text-[#D7FF35]">
                &rarr; Tamper-evident card
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between space-y-6 hover:border-emerald-500/50 dark:hover:border-[#D7FF35]/50 transition group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#041B15] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#D7FF35] group-hover:scale-105 transition">
                  <Scale className="w-6 h-6" />
                </div>
                <div className="font-mono text-xs text-emerald-700 dark:text-[#D7FF35] font-semibold tracking-wider">02 // WEIGH & INSPECT</div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Segregated Dry Weighment</h3>
                <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
                  Clean dry recyclables are verified across 8 official categories. Authorised collection staff inspect materials and record calibrated weight on certified digital scales.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-[11px] font-mono text-emerald-700 dark:text-[#D7FF35]">
                &rarr; Certified digital scale
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between space-y-6 hover:border-emerald-500/50 dark:hover:border-[#D7FF35]/50 transition group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#041B15] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#D7FF35] group-hover:scale-105 transition">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="font-mono text-xs text-emerald-700 dark:text-[#D7FF35] font-semibold tracking-wider">03 // MINT CREDITS</div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Deterministic Formula</h3>
                <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
                  Green Points are calculated from the verified weight and category of eligible dry recyclable materials: <code className="text-emerald-700 dark:text-[#D7FF35]">kg &times; rate = GP</code>.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-[11px] font-mono text-emerald-700 dark:text-[#D7FF35]">
                &rarr; Append-only trigger ledger
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between space-y-6 hover:border-emerald-500/50 dark:hover:border-[#D7FF35]/50 transition group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#041B15] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#D7FF35] group-hover:scale-105 transition">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="font-mono text-xs text-emerald-700 dark:text-[#D7FF35] font-semibold tracking-wider">04 // GROCERY REWARDS</div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Essential Groceries</h3>
                <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
                  Redeem your accumulated Green Points for essential grocery items including rice, toor dal, and sunflower cooking oil. Points are reward credits, not cash.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-[11px] font-mono text-emerald-700 dark:text-[#D7FF35]">
                &rarr; 100% non-monetary credits
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 4. ESSENTIAL GROCERY REWARDS SECTION (HOW POINTS WORK & EXAMPLES)    */}
      {/* =================================================================== */}
      <section id="grocery-rewards-section" className="py-28 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#041B15] border-t border-slate-200 dark:border-white/10 scroll-mt-16 text-slate-900 dark:text-white">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">GROCERY REWARDS</span>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-slate-900 dark:text-white leading-tight">
              Exchange Clean Dry Recyclables for Essential Groceries.
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#A7B9A8] leading-relaxed max-w-2xl mx-auto">
              Segregate responsibly. Earn Green Points on verified dry recyclables and redeem them for staple household grocery items delivered through our civic fulfillment network.
            </p>
          </div>

          {/* =============================================================== */}
          {/* WHAT DRY RECYCLABLES CAN YOU GIVE US? (8 COMPACT CATEGORY BOXES) */}
          {/* =============================================================== */}
          <div id="dry-recyclables-section" className="space-y-6 scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
              <div className="space-y-2">
                <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">8 APPROVED RECYCLABLE CATEGORIES</span>
                <h3 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
                  What Dry Recyclables Can You Give Us?
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] max-w-md leading-relaxed">
                GreenPay exclusively handles dry recyclable materials. Green Points are awarded after authorised staff inspect, verify the material category, and record the measured weight on calibrated digital scales.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {DRY_RECYCLABLE_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div
                    key={cat.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-[#D7FF35]/40 transition-colors duration-200 flex flex-col justify-between h-full"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3.5">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#041B15] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#D7FF35] shrink-0">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 dark:bg-[#D7FF35]/15 dark:border-[#D7FF35]/30 font-mono text-xs font-bold text-emerald-800 dark:text-[#D7FF35] tracking-tight">
                          {cat.rate} GP / kg
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8] uppercase tracking-wider mb-1">
                        {cat.tag}
                      </div>

                      <h4 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight leading-snug mb-1.5">
                        {cat.name}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Authorised Staff Verification Explanation Banner */}
            <div className="p-6 rounded-2xl bg-[#0D4935]/50 border border-[#D7FF35]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <ShieldCheck className="w-5 h-5 text-[#D7FF35]" />
                  <span>Authorised Staff Verification & Weighment</span>
                </div>
                <p className="text-xs text-[#A7B9A8] leading-relaxed">
                  Green Points are awarded solely after authorised collection staff inspect the materials, verify the dry recyclable category, and record the measured weight on calibrated digital scales.
                </p>
              </div>
              <div className="shrink-0 font-mono text-xs text-[#041B15] bg-[#D7FF35] px-4 py-2.5 rounded-xl font-bold shadow-glow-lime">
                Formula: Weight (kg) &times; Category Rate (GP/kg) = Green Points
              </div>
            </div>
          </div>

          {/* Grocery Reward Showcase Examples */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="micro-label text-[#D7FF35]">REDEMPTION CATALOGUE EXAMPLES</span>
                <h3 className="text-2xl font-light text-white tracking-tight">
                  Essential Grocery Items
                </h3>
              </div>
              <p className="text-xs text-[#A7B9A8] max-w-md">
                Fixed transparent redemption costs. Redeeming an item deducts only that item's cost; unused points remain in your balance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Product 1: Rice */}
              <div className="p-6 rounded-2xl bg-[#0D4935]/40 border border-white/10 flex flex-col justify-between space-y-4 hover:border-[#D7FF35]/40 transition group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#041B15] border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                    🌾
                  </div>
                  <div className="text-[10px] font-mono text-[#D7FF35] uppercase tracking-wider">Staple Grain</div>
                  <h4 className="text-lg font-medium text-white">Rice</h4>
                  <div className="text-xs text-[#A7B9A8]">Premium polished staple rice, triple-cleaned.</div>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-300">1 kg</span>
                  <span className="font-mono text-base font-bold text-[#D7FF35]">120 GP</span>
                </div>
              </div>

              {/* Product 2: Toor Dal */}
              <div className="p-6 rounded-2xl bg-[#0D4935]/40 border border-white/10 flex flex-col justify-between space-y-4 hover:border-[#D7FF35]/40 transition group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#041B15] border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                    🥣
                  </div>
                  <div className="text-[10px] font-mono text-[#D7FF35] uppercase tracking-wider">Pulse & Protein</div>
                  <h4 className="text-lg font-medium text-white">Toor Dal</h4>
                  <div className="text-xs text-[#A7B9A8]">Unpolished high-protein pigeon peas pulse.</div>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-300">1 kg</span>
                  <span className="font-mono text-base font-bold text-[#D7FF35]">140 GP</span>
                </div>
              </div>

              {/* Product 3: Sunflower Cooking Oil */}
              <div className="p-6 rounded-2xl bg-[#0D4935]/40 border border-white/10 flex flex-col justify-between space-y-4 hover:border-[#D7FF35]/40 transition group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#041B15] border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                    🌻
                  </div>
                  <div className="text-[10px] font-mono text-[#D7FF35] uppercase tracking-wider">Cooking Essential</div>
                  <h4 className="text-lg font-medium text-white">Sunflower Cooking Oil</h4>
                  <div className="text-xs text-[#A7B9A8]">Refined pure edible sunflower oil pouch.</div>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-300">1 litre</span>
                  <span className="font-mono text-base font-bold text-[#D7FF35]">150 GP</span>
                </div>
              </div>

              {/* Product 4: Sugar */}
              <div className="p-6 rounded-2xl bg-[#0D4935]/40 border border-white/10 flex flex-col justify-between space-y-4 hover:border-[#D7FF35]/40 transition group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#041B15] border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                    🍬
                  </div>
                  <div className="text-[10px] font-mono text-[#D7FF35] uppercase tracking-wider">Pantry Staple</div>
                  <h4 className="text-lg font-medium text-white">Sugar</h4>
                  <div className="text-xs text-[#A7B9A8]">Refined crystal white granulated sugar.</div>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-300">1 kg</span>
                  <span className="font-mono text-base font-bold text-[#D7FF35]">80 GP</span>
                </div>
              </div>

              {/* Product 5: Iodized Salt */}
              <div className="p-6 rounded-2xl bg-[#0D4935]/40 border border-white/10 flex flex-col justify-between space-y-4 hover:border-[#D7FF35]/40 transition group">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#041B15] border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                    🧂
                  </div>
                  <div className="text-[10px] font-mono text-[#D7FF35] uppercase tracking-wider">Daily Essential</div>
                  <h4 className="text-lg font-medium text-white">Iodized Salt</h4>
                  <div className="text-xs text-[#A7B9A8]">Vacuum-evaporated iodized household cooking salt.</div>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-300">1 kg</span>
                  <span className="font-mono text-base font-bold text-[#D7FF35]">60 GP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Important Rules & Supported Dry Categories Shelf */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
            
            {/* Rules Note */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0D4935]/30 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold text-xs font-mono">
                <Info className="w-4 h-4 text-[#D7FF35]" />
                <span className="uppercase tracking-wider">Important Earning & Redemption Rules</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#A7B9A8] leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#D7FF35] shrink-0 mt-0.5" />
                  <span><strong>Green Points are reward credits, not cash</strong>: They cannot be converted to money.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#D7FF35] shrink-0 mt-0.5" />
                  <span><strong>Earned on verified dry recyclables only</strong>: Handing over clean dry materials earns points per kilogram.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#D7FF35] shrink-0 mt-0.5" />
                  <span><strong>Fixed transparent costs</strong>: Redeeming an item deducts only that item's displayed cost.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#D7FF35] shrink-0 mt-0.5" />
                  <span><strong>Unused points remain in balance</strong>: Unused Green Points carry over indefinitely.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#D7FF35] shrink-0 mt-0.5" />
                  <span><strong>Dry recyclables only</strong>: GreenPay is exclusively dedicated to dry recyclables across 8 categories. Organic and wet kitchen waste are handled through separate municipal rounds and do not earn Green Points.</span>
                </li>
              </ul>
            </div>

            {/* 8 Supported Dry Categories Shelf */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0D4935]/30 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold text-xs font-mono">
                  <Sparkles className="w-4 h-4 text-[#D7FF35]" />
                  <span className="uppercase tracking-wider">Supported Dry Recyclable Earning Categories</span>
                </div>
                <span className="text-[10px] font-mono text-[#D7FF35]">Official Municipal Rates</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#041B15] border border-white/5 space-y-1">
                  <span className="text-xs font-medium text-white block">Aluminium & Metal</span>
                  <span className="font-mono text-xs text-[#D7FF35] font-bold">22 GP / kg</span>
                </div>
                <div className="p-3 rounded-xl bg-[#041B15] border border-white/5 space-y-1">
                  <span className="text-xs font-medium text-white block">PET Bottles</span>
                  <span className="font-mono text-xs text-[#D7FF35] font-bold">18 GP / kg</span>
                </div>
                <div className="p-3 rounded-xl bg-[#041B15] border border-white/5 space-y-1">
                  <span className="text-xs font-medium text-white block">Other Plastics</span>
                  <span className="font-mono text-xs text-[#D7FF35] font-bold">15 GP / kg</span>
                </div>
                <div className="p-3 rounded-xl bg-[#041B15] border border-white/5 space-y-1">
                  <span className="text-xs font-medium text-white block">Newspapers</span>
                  <span className="font-mono text-xs text-[#D7FF35] font-bold">10 GP / kg</span>
                </div>
                <div className="p-3 rounded-xl bg-[#041B15] border border-white/5 space-y-1">
                  <span className="text-xs font-medium text-white block">Cardboard</span>
                  <span className="font-mono text-xs text-[#D7FF35] font-bold">10 GP / kg</span>
                </div>
                <div className="p-3 rounded-xl bg-[#041B15] border border-white/5 space-y-1">
                  <span className="text-xs font-medium text-white block">Glass Bottles</span>
                  <span className="font-mono text-xs text-[#D7FF35] font-bold">8 GP / kg</span>
                </div>
                <div className="p-3 rounded-xl bg-[#041B15] border border-white/5 space-y-1">
                  <span className="text-xs font-medium text-white block">Textiles</span>
                  <span className="font-mono text-xs text-[#D7FF35] font-bold">8 GP / kg</span>
                </div>
                <div className="p-3 rounded-xl bg-[#041B15] border border-white/5 space-y-1">
                  <span className="text-xs font-medium text-white block">Mixed Paper</span>
                  <span className="font-mono text-xs text-[#D7FF35] font-bold">7 GP / kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 5. DOORSTEP IDENTITY BINDING (BESCOM METER & PERMANENT QR)           */}
      {/* =================================================================== */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-[#062B20] border-t border-white/10 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual Physical QR Card Preview */}
            <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
              <div className="w-80 h-96 rounded-2xl bg-gradient-to-b from-[#0D4935] to-[#041B15] border-2 border-[#D7FF35]/40 p-6 flex flex-col justify-between shadow-glow-lime relative overflow-hidden">
                
                {/* Glow watermark */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#D7FF35]/10 rounded-full blur-2xl" />

                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#041B15] border border-white/20 flex items-center justify-center text-[#D7FF35] font-bold text-xs">
                      GP
                    </div>
                    <span className="font-mono text-xs uppercase tracking-widest text-white font-semibold">GREENPAY</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#D7FF35]/20 text-[#D7FF35] font-mono text-[9px] font-bold">
                    VERIFIED RESIDENT
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center space-y-3 z-10">
                  <div className="w-36 h-36 bg-white p-3 rounded-xl flex items-center justify-center shadow-lg">
                    {/* High contrast SVG QR */}
                    <svg viewBox="0 0 100 100" className="w-full h-full text-black" fill="currentColor">
                      <rect x="0" y="0" width="30" height="30" rx="4" />
                      <rect x="70" y="0" width="30" height="30" rx="4" />
                      <rect x="0" y="70" width="30" height="30" rx="4" />
                      <rect x="8" y="8" width="14" height="14" fill="white" />
                      <rect x="78" y="8" width="14" height="14" fill="white" />
                      <rect x="8" y="78" width="14" height="14" fill="white" />
                      <rect x="40" y="10" width="20" height="10" />
                      <rect x="40" y="40" width="20" height="20" fill="#0D4935" />
                      <rect x="70" y="50" width="15" height="15" />
                      <rect x="15" y="45" width="15" height="15" />
                      <rect x="50" y="70" width="20" height="20" />
                    </svg>
                  </div>
                  <div className="font-mono text-sm font-bold text-[#D7FF35] tracking-widest">
                    GP-104928
                  </div>
                </div>

                <div className="space-y-1 z-10 pt-2 border-t border-white/10 text-left font-mono text-[10px]">
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>BESCOM METER:</span>
                    <span className="text-white font-medium">BESCOM-IND-******28</span>
                  </div>
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>WARD:</span>
                    <span className="text-white font-medium">112 - Indiranagar</span>
                  </div>
                  <div className="flex justify-between text-[#A7B9A8]">
                    <span>STATUS:</span>
                    <span className="text-[#D7FF35] font-medium">Doorstep Bound</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Security and Integrity Details */}
            <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
              <div className="space-y-3">
                <span className="micro-label text-[#D7FF35]">DOORSTEP IDENTITY BINDING</span>
                <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white leading-[1.12]">
                  Permanent QR card.<br />
                  <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-[#D7FF35]">
                    Physically tied to your premises.
                  </span>
                </h2>
                <p className="text-sm text-[#A7B9A8] leading-relaxed">
                  Traditional civic waste programs suffer from phantom reporting and impersonation. GreenPay permanently binds every household QR to the property's official BESCOM electricity meter account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0D4935]/40 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#D7FF35]" />
                    <span>Anti-Fraud Proof</span>
                  </div>
                  <p className="text-xs text-[#A7B9A8] leading-relaxed">
                    Supervisors must physically scan the QR at your doorstep before inputting certified weight.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0D4935]/40 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <Lock className="w-4 h-4 text-[#D7FF35]" />
                    <span>DPDP Act 2023 Masking</span>
                  </div>
                  <p className="text-xs text-[#A7B9A8] leading-relaxed">
                    Full meter identifiers are encrypted; supervisor screens only see masked sequences with zero PII.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-6 py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-glow-lime"
                >
                  <span>Register Household & Get Card</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/qr-card')}
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-xs uppercase tracking-widest transition"
                >
                  View QR Card Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 6. CINEMATIC FINAL CALL TO ACTION                                   */}
      {/* =================================================================== */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#041B15] via-[#062B20] to-[#041B15] border-t border-white/10 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="w-16 h-16 rounded-2xl bg-[#0D4935] border border-[#D7FF35]/30 flex items-center justify-center mx-auto text-[#D7FF35] shadow-glow-lime">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl sm:text-6xl font-light tracking-tight text-white leading-[1.08]">
              Ready to verify your household?<br />
              <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-[#D7FF35]">
                Start earning Green Points today.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[#A7B9A8] max-w-2xl mx-auto leading-relaxed">
              Join thousands of Bengaluru households building a cleaner, transparent city. Register your electricity meter account to receive your doorstep QR verification card.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition shadow-glow-lime flex items-center justify-center gap-2 group"
            >
              <span>Get Your Citizen QR Card</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0D4935] hover:bg-[#14543D] border border-white/15 text-white font-semibold text-xs uppercase tracking-widest transition"
            >
              Sign In to Citizen Dashboard
            </button>
          </div>

          <div className="pt-8 text-[11px] font-mono text-[#A7B9A8]">
            <span>Points, NOT money &bull; DPDP Act 2023 Compliant &bull; WCAG 2.2 AA Verified</span>
          </div>
        </div>
      </section>
    </div>
  );
};
