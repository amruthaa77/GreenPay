import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Award, Info, AlertCircle, ArrowUpRight, ArrowDownLeft, RotateCcw, Calendar, CheckCircle2, ShoppingBag, ShieldCheck } from 'lucide-react';

export const CreditsLedgerPage: React.FC = () => {
  const [ledger, setLedger] = useState<any[]>([]);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'AWARDS' | 'REDEMPTIONS' | 'REVERSALS'>('ALL');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      api.citizen.getPointsBalance(),
      api.citizen.getCreditsLedger(100, 0),
    ]).then(([balRes, ledRes]) => {
      if (!isMounted) return;
      if (balRes.status === 'fulfilled' && balRes.value) {
        setBalanceData(balRes.value);
      }
      if (ledRes.status === 'fulfilled' && Array.isArray(ledRes.value)) {
        setLedger(ledRes.value);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLedger = ledger.filter((entry) => {
    if (filter === 'REVERSALS') return entry.is_reversal;
    if (filter === 'REDEMPTIONS') return entry.credits_amount < 0;
    if (filter === 'AWARDS') return entry.credits_amount > 0 && !entry.is_reversal;
    return true;
  });

  const availablePoints = balanceData?.current_balance ?? (
    ledger.reduce((acc, cur) => acc + cur.credits_amount, 0)
  );
  const totalEarned = balanceData?.total_earned ?? (
    ledger.filter(t => t.credits_amount > 0 && !t.is_reversal).reduce((acc, cur) => acc + cur.credits_amount, 0)
  );
  const totalRedeemed = balanceData?.total_redeemed ?? (
    ledger.filter(t => t.credits_amount < 0).reduce((acc, cur) => acc + Math.abs(cur.credits_amount), 0)
  );

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">APPEND-ONLY IMMUTABLE LEDGER</span>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
            Green Points Transaction Ledger
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-2xl">
            Green Points are non-monetary civic recognition points earned through verified dry recyclable doorstep collections and redeemed for essential kitchen groceries.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#041B15] border border-slate-200 dark:border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'ALL' ? 'bg-[#0D4935] text-white dark:bg-[#D7FF35] dark:text-[#041B15] font-bold shadow-sm dark:shadow-glow-lime' : 'text-slate-600 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white'
            }`}
          >
            All Entries
          </button>
          <button
            type="button"
            onClick={() => setFilter('AWARDS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'AWARDS' ? 'bg-[#0D4935] text-white dark:bg-[#D7FF35] dark:text-[#041B15] font-bold shadow-sm dark:shadow-glow-lime' : 'text-slate-600 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white'
            }`}
          >
            Collection Awards (+GP)
          </button>
          <button
            type="button"
            onClick={() => setFilter('REDEMPTIONS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'REDEMPTIONS' ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-[#041B15] font-bold' : 'text-slate-600 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white'
            }`}
          >
            Grocery Redemptions (-GP)
          </button>
          <button
            type="button"
            onClick={() => setFilter('REVERSALS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'REVERSALS' ? 'bg-rose-500 text-white dark:bg-rose-400 dark:text-[#041B15] font-bold' : 'text-slate-600 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white'
            }`}
          >
            Reversals
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            Available Green Points
          </span>
          <div className="text-3xl font-bold font-mono text-emerald-700 dark:text-[#D7FF35] flex items-baseline gap-2">
            <span>{Number(availablePoints).toFixed(1)}</span>
            <span className="text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">GP</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">Authoritative grocery redemption balance</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            Total Points Earned
          </span>
          <div className="text-3xl font-light text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>+{Number(totalEarned).toFixed(1)}</span>
            <span className="text-xs font-mono text-emerald-700 dark:text-[#D7FF35]">GP</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">From verified dry recyclable weighments</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            Total Points Redeemed
          </span>
          <div className="text-3xl font-light text-amber-600 dark:text-amber-300 flex items-baseline gap-2">
            <span>-{Number(totalRedeemed).toFixed(1)}</span>
            <span className="text-xs font-mono text-amber-600 dark:text-amber-400/80">GP</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">Redeemed for essential groceries</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
            Ledger Immutability
          </span>
          <div className="text-xs font-semibold text-slate-900 dark:text-[#F4F7F0] flex items-center gap-1.5 mt-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
            <span>Append-Only Triggers Active</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">Compliant with RBI non-monetary guidelines</p>
        </div>
      </div>

      {/* Transparent Ledger Table */}
      <div className="rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-slate-500 dark:text-[#A7B9A8] space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-600 dark:border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading ledger entries...</p>
          </div>
        ) : filteredLedger.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-[#A7B9A8] space-y-2">
            <p className="text-sm font-medium text-slate-900 dark:text-white">No ledger entries found</p>
            <p className="text-xs">Once your doorstep dry recyclables are weighed or grocery items redeemed, transactions appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-900 dark:text-[#F4F7F0]">
              <thead className="bg-slate-100 dark:bg-[#062B20] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">Transaction / Time</th>
                  <th scope="col" className="px-6 py-4">Type & Reference</th>
                  <th scope="col" className="px-6 py-4">Calculation / Description</th>
                  <th scope="col" className="px-6 py-4 text-right">Points</th>
                  <th scope="col" className="px-6 py-4 text-right">Resulting Balance</th>
                  <th scope="col" className="px-6 py-4 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredLedger.map((row) => {
                  const isRedemption = row.credits_amount < 0;
                  const isReversal = row.is_reversal;
                  const txType = row.transaction_type || (isRedemption ? 'GROCERY REDEMPTION' : isReversal ? 'REVERSAL' : 'COLLECTION CREDIT');
                  const txRef = row.reference_id || `#${row.id.slice(0, 8).toUpperCase()}`;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 dark:hover:bg-white/5 transition ${isReversal ? 'bg-rose-500/5' : isRedemption ? 'bg-amber-500/5' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-slate-900 dark:text-white font-medium text-xs">
                          {txRef}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#A7B9A8] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(row.timestamp).toLocaleDateString()} {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          isRedemption
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            : isReversal
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] dark:border-[#D7FF35]/30'
                        }`}>
                          {isRedemption ? <ShoppingBag className="w-3 h-3" /> : isReversal ? <RotateCcw className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                          <span>{txType}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <code className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-[#041B15] border border-slate-200 dark:border-white/5 text-slate-700 dark:text-[#A7B9A8] block max-w-md truncate">
                            {row.calculation_formula || 'Standard calculation'}
                          </code>
                          <div className="text-[10px] text-slate-500 dark:text-[#A7B9A8] font-mono">
                            Schedule: {row.schedule_version ? `v${row.schedule_version}` : 'v1.0.0'}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span
                          className={`text-sm font-bold font-mono ${
                            isRedemption
                              ? 'text-amber-600 dark:text-amber-400'
                              : isReversal
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-700 dark:text-[#D7FF35]'
                          }`}
                        >
                          {isRedemption ? `${row.credits_amount.toFixed(1)} GP` : `+${row.credits_amount.toFixed(1)} GP`}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-slate-900 dark:text-white text-xs">
                        {row.resulting_balance !== undefined && row.resulting_balance !== null
                          ? `${Number(row.resulting_balance).toFixed(1)} GP`
                          : '—'}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTx(row)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-[#A7B9A8] dark:hover:text-white transition"
                          title="Inspect transaction"
                          aria-label="Inspect transaction"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explanatory Policy Callout */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/10 space-y-3 shadow-sm dark:shadow-md">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-[#D7FF35]">
          <Info className="w-4 h-4" />
          <span>Ledger Immutability & Balance Integrity</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
          GreenPay uses database-level triggers to enforce append-only immutability. Once a transaction is logged,
          it can never be altered or purged by anyone, including administrators. Household balances reflect the exact cumulative sum of verified earning transactions, legitimate reversals, and grocery redemptions.
        </p>
      </div>

      {/* Transaction Inspection Modal */}
      {selectedTx && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/15 p-6 space-y-6 shadow-2xl text-left text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
                <span>Transaction Details</span>
              </h2>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-[#A7B9A8] dark:hover:text-white font-mono text-sm"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Transaction UUID</span>
                <span className="text-slate-900 dark:text-white select-all">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Timestamp</span>
                <span className="text-slate-900 dark:text-white">{new Date(selectedTx.timestamp).toUTCString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Transaction Type</span>
                <span className="text-slate-900 dark:text-white">{selectedTx.transaction_type || (selectedTx.credits_amount < 0 ? 'GROCERY REDEMPTION' : 'COLLECTION CREDIT')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Points Delta</span>
                <span className={`font-bold ${selectedTx.credits_amount < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-[#D7FF35]'}`}>
                  {selectedTx.credits_amount < 0 ? `${selectedTx.credits_amount.toFixed(1)} GP` : `+${selectedTx.credits_amount.toFixed(1)} GP`}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Resulting Balance</span>
                <span className="text-emerald-700 dark:text-[#D7FF35] font-bold">
                  {selectedTx.resulting_balance !== undefined && selectedTx.resulting_balance !== null
                    ? `${Number(selectedTx.resulting_balance).toFixed(1)} GP`
                    : '—'}
                </span>
              </div>
              <div className="space-y-1.5 py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Calculation Formula</span>
                <code className="block p-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] text-slate-700 dark:text-[#A7B9A8] text-[11px] border border-slate-200 dark:border-white/5">
                  {selectedTx.calculation_formula || 'Standard calculation'}
                </code>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white font-semibold text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
