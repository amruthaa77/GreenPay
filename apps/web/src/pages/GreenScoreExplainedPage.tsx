import React, { useState } from 'react';
import { Award, Info, Sliders, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';

export const GreenScoreExplainedPage: React.FC = () => {
  // Simulator state
  const [wetKg, setWetKg] = useState<number>(4.0);
  const [dryKg, setDryKg] = useState<number>(3.0);
  const [hazardousKg, setHazardousKg] = useState<number>(0.2);
  const [ewasteKg, setEwasteKg] = useState<number>(0.5);
  const [streakWeeks, setStreakWeeks] = useState<number>(6);

  // Score Calculation Math
  const totalWeight = wetKg + dryKg + hazardousKg + ewasteKg;
  
  // 1. Segregation Purity (0–40 pts)
  const hazardousRatio = totalWeight > 0 ? hazardousKg / totalWeight : 0;
  const purityFactor = Math.max(0, 1 - (hazardousRatio * 3.5));
  const segregationScore = Math.round(purityFactor * 40 * 10) / 10;

  // 2. Consistency & Streak (0–30 pts)
  const consistencyScore = Math.min(30, Math.round((10 + Math.min(streakWeeks, 10) * 2) * 10) / 10);

  // 3. Landfill Diversion (0–30 pts)
  const diversionRatio = totalWeight > 0 ? (dryKg + ewasteKg) / totalWeight : 0;
  const diversionScore = Math.min(30, Math.round((diversionRatio * 50) * 10) / 10);

  const totalScore = Math.min(100, Math.max(0, Math.round((segregationScore + consistencyScore + diversionScore) * 10) / 10));

  const getBadge = (score: number) => {
    if (score >= 85) return { title: 'Eco Champion', color: 'text-[#D7FF35]', border: 'border-[#D7FF35]' };
    if (score >= 70) return { title: 'Consistent Recycler', color: 'text-[#10B981]', border: 'border-[#10B981]' };
    if (score >= 55) return { title: 'Active Contributor', color: 'text-[#3B82F6]', border: 'border-[#3B82F6]' };
    return { title: 'Improving Citizen', color: 'text-amber-400', border: 'border-amber-400' };
  };

  const badge = getBadge(totalScore);

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-[#D7FF35]">DEMOCRATIZED CIVIC ALGORITHM</span>
        <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
          The Explainable Green Score
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-[#A7B9A8] leading-relaxed font-light">
          No opaque algorithms. Every point on your 0–100 Green Score directly reflects your household segregation quality and consistent waste diversion.
        </p>
      </div>

      {/* Formula Breakdown Cards (3 Pillars) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Component 1 */}
        <div className="p-6 rounded-2xl bg-[#0D4935] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#D7FF35] font-bold">MAX 40 PTS</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#D7FF35]/15 text-[#D7FF35]">
              Quality
            </span>
          </div>
          <h2 className="text-base font-semibold text-white">1. Segregation Purity</h2>
          <p className="text-xs text-[#A7B9A8] leading-relaxed">
            Measures clean segregation and category purity across dry recyclable streams. Non-recyclable contamination severely degrades purity points.
          </p>
          <div className="font-mono text-[11px] text-[#D7FF35] pt-2 border-t border-white/5">
            Formula: (1 - 3.5 &times; ContamRatio) &times; 40
          </div>
        </div>

        {/* Component 2 */}
        <div className="p-6 rounded-2xl bg-[#0D4935] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#D7FF35] font-bold">MAX 30 PTS</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#D7FF35]/15 text-[#D7FF35]">
              Habit
            </span>
          </div>
          <h2 className="text-base font-semibold text-white">2. Collection Consistency</h2>
          <p className="text-xs text-[#A7B9A8] leading-relaxed">
            Regular doorstep handovers build consecutive weekly streaks. Households that reliably hand over waste each week earn maximum habit credits.
          </p>
          <div className="font-mono text-[11px] text-[#D7FF35] pt-2 border-t border-white/5">
            Formula: 10 + (min(Weeks, 10) &times; 2)
          </div>
        </div>

        {/* Component 3 */}
        <div className="p-6 rounded-2xl bg-[#0D4935] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#D7FF35] font-bold">MAX 30 PTS</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#D7FF35]/15 text-[#D7FF35]">
              Circularity
            </span>
          </div>
          <h2 className="text-base font-semibold text-white">3. Landfill Diversion</h2>
          <p className="text-xs text-[#A7B9A8] leading-relaxed">
            Directly measures clean dry recyclables diverted to certified circular material processors, keeping Bengaluru landfills clear.
          </p>
          <div className="font-mono text-[11px] text-[#D7FF35] pt-2 border-t border-white/5">
            Formula: min(30, CleanDry/Total &times; 50)
          </div>
        </div>
      </div>

      {/* Interactive Simulator Card */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#062B20] border border-white/15 space-y-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#D7FF35]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Interactive Score Simulator</h2>
              <p className="text-xs text-[#A7B9A8]">Adjust weekly kilograms to see your calculated Green Score live.</p>
            </div>
          </div>

          {/* Computed Output Ring & Badge */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className={`text-xs font-semibold ${badge.color}`}>{badge.title}</span>
              <span className="block text-[10px] font-mono text-[#A7B9A8]">Calculated Score</span>
            </div>
            <div className={`w-14 h-14 rounded-2xl border-2 ${badge.border} flex items-center justify-center font-bold text-xl text-white bg-white/5 shadow-inner`}>
              {totalScore.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
          
          {/* Fiber & Paper Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[#F4F7F0]">
              <label htmlFor="wet-range" className="font-medium text-[#10B981]">Paper, Cardboard & Textiles</label>
              <span className="font-mono font-semibold">{wetKg.toFixed(1)} kg</span>
            </div>
            <input
              id="wet-range"
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={wetKg}
              onChange={(e) => setWetKg(parseFloat(e.target.value))}
              className="w-full accent-[#10B981] cursor-pointer"
            />
            <span className="text-[10px] text-[#A7B9A8]">Clean paper, cardboard, newsprint & textiles</span>
          </div>

          {/* Rigid & Metal Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[#F4F7F0]">
              <label htmlFor="dry-range" className="font-medium text-[#3B82F6]">Metals, PET & Plastics</label>
              <span className="font-mono font-semibold">{dryKg.toFixed(1)} kg</span>
            </div>
            <input
              id="dry-range"
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={dryKg}
              onChange={(e) => setDryKg(parseFloat(e.target.value))}
              className="w-full accent-[#3B82F6] cursor-pointer"
            />
            <span className="text-[10px] text-[#A7B9A8]">Aluminium cans, PET bottles & rigid recyclables</span>
          </div>

          {/* Contamination Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[#F4F7F0]">
              <label htmlFor="haz-range" className="font-medium text-[#EF4444]">Unsorted Contamination (Rejects)</label>
              <span className="font-mono font-semibold">{hazardousKg.toFixed(1)} kg</span>
            </div>
            <input
              id="haz-range"
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={hazardousKg}
              onChange={(e) => setHazardousKg(parseFloat(e.target.value))}
              className="w-full accent-[#EF4444] cursor-pointer"
            />
            <span className="text-[10px] text-[#A7B9A8]">Contamination degrades category purity score</span>
          </div>

          {/* Streak Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[#F4F7F0]">
              <label htmlFor="streak-range" className="font-medium text-[#D7FF35]">Consecutive Weekly Streak</label>
              <span className="font-mono font-semibold">{streakWeeks} weeks</span>
            </div>
            <input
              id="streak-range"
              type="range"
              min="1"
              max="20"
              step="1"
              value={streakWeeks}
              onChange={(e) => setStreakWeeks(parseInt(e.target.value))}
              className="w-full accent-[#D7FF35] cursor-pointer"
            />
            <span className="text-[10px] text-[#A7B9A8]">Regular handovers maximize consistency</span>
          </div>
        </div>

        {/* Calculation Summary Table for Accessibility */}
        <div className="p-4 rounded-xl bg-[#041B15] border border-white/5 space-y-2">
          <div className="micro-label text-[#A7B9A8]">Mathematical Breakdown</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-[#A7B9A8] block">Purity</span>
              <span className="font-mono text-sm font-bold text-white">{segregationScore} / 40</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-[#A7B9A8] block">Consistency</span>
              <span className="font-mono text-sm font-bold text-white">{consistencyScore} / 30</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-[#A7B9A8] block">Diversion</span>
              <span className="font-mono text-sm font-bold text-white">{diversionScore} / 30</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
