import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { adminApi } from '../services/api';
import { offlineQueue, QueuedWeighment, RejectedEntry } from '../services/offlineQueue';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  QrCode,
  Camera,
  CameraOff,
  Search,
  Scale,
  Award,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Trash2,
  UserCheck,
  Info,
  Layers
} from 'lucide-react';

interface CitizenRecord {
  citizen_id: string;
  greenpay_id: string;
  name: string;
  masked_meter: string;
  ward_name: string;
  green_score: number;
  account_status: 'ACTIVE' | 'PENDING' | 'DELETED';
}

export const SupervisorPortalPage: React.FC = () => {
  const { user } = useAdminAuth();

  // Citizen search & state
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [citizen, setCitizen] = useState<CitizenRecord | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  // Camera QR scanner
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Weighment form state
  const [wetKg, setWetKg] = useState<number>(0);
  const [dryKg, setDryKg] = useState<number>(0);
  const [hazardousKg, setHazardousKg] = useState<number>(0);
  const [ewasteKg, setEwasteKg] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  // Credit preview
  const [previewCredits, setPreviewCredits] = useState<number>(0);
  const [previewFormula, setPreviewFormula] = useState<string>('');

  // Conflict modal
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [rejectedList, setRejectedList] = useState<RejectedEntry[]>(offlineQueue.getRejected());

  useEffect(() => {
    return offlineQueue.subscribe(() => {
      setRejectedList(offlineQueue.getRejected());
    });
  }, []);

  // Update preview when weights change
  useEffect(() => {
    const totalWt = wetKg + dryKg + hazardousKg + ewasteKg;
    if (totalWt <= 0) {
      setPreviewCredits(0);
      setPreviewFormula('Enter waste weight above to preview civic credits');
      return;
    }

    if (offlineQueue.isOnline()) {
      adminApi.supervisor
        .previewWeighment({
          wet_kg: wetKg,
          dry_kg: dryKg,
          hazardous_kg: hazardousKg,
          ewaste_kg: ewasteKg,
        })
        .then((res) => {
          setPreviewCredits(res.estimated_credits);
          setPreviewFormula(res.calculation_formula);
        })
        .catch(() => {
          // Local fallback formula: 2 wet, 10 dry, 5 haz, 25 ewaste
          const localCalc = wetKg * 2 + dryKg * 10 + hazardousKg * 5 + ewasteKg * 25;
          setPreviewCredits(Math.round(localCalc));
          setPreviewFormula(`${wetKg}kg wet + ${dryKg}kg dry + ${hazardousKg}kg haz + ${ewasteKg}kg ewaste`);
        });
    } else {
      const localCalc = wetKg * 2 + dryKg * 10 + hazardousKg * 5 + ewasteKg * 25;
      setPreviewCredits(Math.round(localCalc));
      setPreviewFormula(`${wetKg}kg wet + ${dryKg}kg dry + ${hazardousKg}kg haz + ${ewasteKg}kg ewaste`);
    }
  }, [wetKg, dryKg, hazardousKg, ewasteKg]);

  // Citizen search handler
  const handleLookup = async (idToSearch?: string) => {
    const query = (idToSearch || searchInput).trim().toUpperCase();
    if (!query) return;

    setSearching(true);
    setSearchError(null);
    setLastReceipt(null);

    try {
      const data = await adminApi.supervisor.lookupCitizen(query);
      setCitizen(data);
    } catch (err: any) {
      setCitizen(null);
      setSearchError(err.message || `No citizen found with GreenPay ID '${query}'.`);
    } finally {
      setSearching(false);
    }
  };

  // Identity Confirmation (Amendment #3)
  const handleActivateCitizen = async () => {
    if (!citizen) return;
    setActivating(true);
    try {
      await adminApi.supervisor.activateCitizen(citizen.greenpay_id);
      setCitizen({ ...citizen, account_status: 'ACTIVE' });
    } catch (err: any) {
      alert(err.message || 'Failed to activate citizen account.');
    } finally {
      setActivating(false);
    }
  };

  // Camera QR scanner toggle
  const toggleScanner = async () => {
    if (scannerActive) {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch {}
      }
      setScannerActive(false);
      return;
    }

    setScannerError(null);
    setScannerActive(true);

    setTimeout(async () => {
      try {
        const qr = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Decoded QR text: could be JSON {"greenpay_id": "GP-..."} or direct ID string
            let targetId = decodedText.trim();
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.greenpay_id) targetId = parsed.greenpay_id;
            } catch {}

            setSearchInput(targetId);
            handleLookup(targetId);
            toggleScanner();
          },
          () => {}
        );
      } catch (err: any) {
        setScannerError(err.message || 'Unable to access camera. Please allow camera permissions or enter ID manually.');
        setScannerActive(false);
      }
    }, 200);
  };

  // Submit Weighment
  const handleSubmitWeighment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizen) return;

    // Strict identity check: Amendment #3
    if (citizen.account_status === 'PENDING') {
      alert('Citizen account is pending doorstep identity confirmation. Please activate identity before logging collections.');
      return;
    }

    const totalWeight = wetKg + dryKg + hazardousKg + ewasteKg;
    if (totalWeight <= 0) {
      alert('Total waste weight must be greater than 0 kg.');
      return;
    }

    setSubmitting(true);
    setLastReceipt(null);

    const weighmentPayload = {
      greenpay_id: citizen.greenpay_id,
      wet_kg: Number(wetKg),
      dry_kg: Number(dryKg),
      hazardous_kg: Number(hazardousKg),
      ewaste_kg: Number(ewasteKg),
      notes: notes.trim() || undefined,
    };

    // If online, try direct API post first
    if (offlineQueue.isOnline()) {
      try {
        const res = await adminApi.supervisor.logWeighment(weighmentPayload);
        setLastReceipt({
          transaction_id: res.transaction_id,
          credits_earned: res.credits_earned,
          total_weight_kg: res.total_weight_kg,
          mode: 'ONLINE_INSTANT',
        });
        // Reset form
        setWetKg(0);
        setDryKg(0);
        setHazardousKg(0);
        setEwasteKg(0);
        setNotes('');
        setSubmitting(false);
        return;
      } catch (err: any) {
        console.warn('Direct weighment submission failed, falling back to offline queue:', err);
      }
    }

    // Offline or fallback to queue
    const queued = offlineQueue.enqueue(weighmentPayload);
    setLastReceipt({
      transaction_id: queued.idempotency_key,
      credits_earned: previewCredits,
      total_weight_kg: totalWeight,
      mode: 'OFFLINE_QUEUED',
    });
    setWetKg(0);
    setDryKg(0);
    setHazardousKg(0);
    setEwasteKg(0);
    setNotes('');
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">DOORSTEP VERIFICATION TERMINAL</span>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
            Field Weighment Entry
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
            Scan citizen QR or enter GreenPay ID to verify doorstep segregation, confirm identity, and record weight.
          </p>
        </div>

        {rejectedList.length > 0 && (
          <button
            type="button"
            onClick={() => setConflictModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 border border-red-300 text-red-800 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:border-red-500/40 dark:text-red-300 text-xs font-semibold flex items-center gap-2 transition"
          >
            <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Resolve {rejectedList.length} Sync Conflict(s)</span>
          </button>
        )}
      </div>

      {/* Grid: Left Column (Scanner & Lookup), Right Column (Citizen Card & Weighment Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: QR Scanner & Lookup */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Camera Scanner Box */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600 dark:text-[#D7FF35]" />
                Camera QR Scanner
              </span>
              <button
                type="button"
                onClick={toggleScanner}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  scannerActive
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                    : 'bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold shadow-sm dark:shadow-glow-lime'
                }`}
              >
                {scannerActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" /> Stop
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" /> Start Camera
                  </>
                )}
              </button>
            </div>

            {scannerActive && (
              <div className="space-y-2">
                <div id="qr-reader" className="w-full rounded-2xl overflow-hidden bg-black aspect-square" />
                <p className="text-[11px] text-center text-slate-500 dark:text-[#A7B9A8]">
                  Point camera at the citizen's permanent GreenPay QR card.
                </p>
              </div>
            )}

            {scannerError && (
              <div className="p-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300 text-xs">
                {scannerError}
              </div>
            )}

            {!scannerActive && (
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
                Use your device camera to rapidly scan citizen cards at the doorstep, or enter the ID manually below.
              </p>
            )}
          </div>

          {/* Manual ID Input */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-3">
            <label className="text-xs font-semibold text-slate-900 dark:text-white block" htmlFor="citizen-search">
              Manual Citizen Lookup
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 dark:text-[#A7B9A8]/60 absolute left-3 top-3" />
                <input
                  id="citizen-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="e.g. GP-2026-KOR-01"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35] font-mono uppercase"
                />
              </div>
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-semibold border border-slate-200 dark:border-white/10 transition"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {searchError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Quick Test Pre-fills */}
            <div className="pt-2">
              <span className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70 font-mono uppercase block mb-1.5">
                Quick Test Citizen IDs:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['GP-2026-KOR-01', 'GP-2026-IND-01', 'GP-2026-JAY-01'].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSearchInput(id);
                      handleLookup(id);
                    }}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-[#F4F7F0] border border-slate-200 dark:border-transparent transition"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Citizen Details & Weighment Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Citizen Details Card */}
          {citizen ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-[#D7FF35] uppercase tracking-wider block">
                    WARD: {citizen.ward_name}
                  </span>
                  <h2 className="text-xl font-light text-slate-900 dark:text-white">{citizen.name}</h2>
                  <p className="text-xs font-mono text-slate-600 dark:text-[#A7B9A8]">
                    ID: <strong className="text-slate-900 dark:text-white">{citizen.greenpay_id}</strong> &bull; Meter: {citizen.masked_meter}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8] block uppercase">Green Score</span>
                    <span className="text-xl font-bold font-mono text-emerald-700 dark:text-[#D7FF35]">{citizen.green_score}/100</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                      citizen.account_status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] dark:border-[#D7FF35]/30'
                        : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 animate-pulse'
                    }`}
                  >
                    {citizen.account_status}
                  </span>
                </div>
              </div>

              {/* Identity Activation Banner: Amendment #3 */}
              {citizen.account_status === 'PENDING' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-2.5 text-amber-300 text-xs">
                    <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                    <div>
                      <strong className="block text-white">Identity Binding Pending</strong>
                      This citizen account is awaiting physical doorstep identity confirmation. Green Credits cannot be issued to pending accounts.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleActivateCitizen}
                    disabled={activating}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{activating ? 'Verifying Identity...' : 'Confirm Doorstep Identity & Activate Account'}</span>
                  </button>
                </div>
              )}

              {/* Weighment Entry Form */}
              <form onSubmit={handleSubmitWeighment} className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                    Record Doorstep Waste Weights
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">Calibrated digital scale</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Wet Waste */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 space-y-1">
                    <label className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 block" htmlFor="wt-wet">
                      Wet & Organic Waste
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        id="wt-wet"
                        type="number"
                        step="0.05"
                        min="0"
                        value={wetKg}
                        onChange={(e) => setWetKg(parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-slate-900 dark:text-white font-mono text-lg font-semibold focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 dark:text-[#A7B9A8] font-mono">kg</span>
                    </div>
                  </div>

                  {/* Dry Waste */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 space-y-1">
                    <label className="text-[10px] font-mono text-blue-700 dark:text-blue-400 block" htmlFor="wt-dry">
                      Dry Recyclables
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        id="wt-dry"
                        type="number"
                        step="0.05"
                        min="0"
                        value={dryKg}
                        onChange={(e) => setDryKg(parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-slate-900 dark:text-white font-mono text-lg font-semibold focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 dark:text-[#A7B9A8] font-mono">kg</span>
                    </div>
                  </div>

                  {/* Hazardous */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 space-y-1">
                    <label className="text-[10px] font-mono text-rose-700 dark:text-rose-400 block" htmlFor="wt-haz">
                      Hazardous
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        id="wt-haz"
                        type="number"
                        step="0.05"
                        min="0"
                        value={hazardousKg}
                        onChange={(e) => setHazardousKg(parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-slate-900 dark:text-white font-mono text-lg font-semibold focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 dark:text-[#A7B9A8] font-mono">kg</span>
                    </div>
                  </div>

                  {/* E-Waste */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 space-y-1">
                    <label className="text-[10px] font-mono text-purple-700 dark:text-purple-400 block" htmlFor="wt-ewaste">
                      E-Waste
                    </label>
                    <div className="flex items-baseline gap-1">
                      <input
                        id="wt-ewaste"
                        type="number"
                        step="0.05"
                        min="0"
                        value={ewasteKg}
                        onChange={(e) => setEwasteKg(parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-slate-900 dark:text-white font-mono text-lg font-semibold focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 dark:text-[#A7B9A8] font-mono">kg</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 dark:text-[#A7B9A8] block" htmlFor="wt-notes">
                    Supervisor Field Observations (Optional)
                  </label>
                  <input
                    id="wt-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Excellent segregation; washed milk packets."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                  />
                </div>

                {/* Live Credit Preview Strip */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] block">
                      Estimated Green Credits
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] font-mono">{previewFormula}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-[#D7FF35]">
                      +{previewCredits} <span className="text-xs font-normal">pts</span>
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || citizen.account_status === 'PENDING'}
                  className="w-full py-3.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs tracking-wider uppercase transition shadow-sm dark:shadow-glow-lime flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Scale className="w-4 h-4" />
                  <span>
                    {citizen.account_status === 'PENDING'
                      ? 'Activate Account Above to Enable Weighment'
                      : submitting
                      ? 'Recording Collection...'
                      : 'Record Doorstep Collection & Award Credits'}
                  </span>
                </button>
              </form>

              {/* Success Receipt */}
              {lastReceipt && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#D7FF35]/10 border border-emerald-300 dark:border-[#D7FF35]/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-[#D7FF35] font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {lastReceipt.mode === 'ONLINE_INSTANT'
                        ? 'Collection Verified & Points Awarded'
                        : 'Saved to Offline Queue (Will Sync Automatically)'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-800 dark:text-[#F4F7F0] font-mono space-y-1">
                    <div>Receipt ID: {lastReceipt.transaction_id}</div>
                    <div>Total Weight: {lastReceipt.total_weight_kg} kg &bull; Points: +{lastReceipt.credits_earned} pts</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400 dark:text-[#A7B9A8]/60">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-light text-slate-900 dark:text-white">No Citizen Selected</h3>
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] max-w-sm mx-auto">
                Scan a citizen's QR card with the camera or enter their GreenPay ID to load their profile and log doorstep weighments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Conflict Resolution Modal (Amendment #8) */}
      {conflictModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-[#0D4935] border border-red-500/30 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="text-lg font-light text-white">Sync Conflict Resolution</h3>
              </div>
              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="text-[#A7B9A8] hover:text-white text-xs font-mono"
              >
                &times; Close
              </button>
            </div>

            <p className="text-xs text-[#A7B9A8] leading-relaxed">
              These weighment entries were rejected by the central API during synchronization.
              Review the cause below to activate pending accounts or correct typos.
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {rejectedList.map((item) => (
                <div
                  key={item.idempotency_key}
                  className="p-4 rounded-2xl bg-[#041B15] border border-white/10 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-white font-bold">{item.greenpay_id}</span>
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[10px]">
                      {item.reason_code}
                    </span>
                  </div>

                  <p className="text-[#F4F7F0] text-[11px]">{item.detail}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-[#A7B9A8] font-mono">
                      Weights: {item.weights.wet}kg wet, {item.weights.dry}kg dry
                    </span>
                    <div className="flex items-center gap-2">
                      {item.reason_code === 'CITIZEN_ACCOUNT_PENDING' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await adminApi.supervisor.activateCitizen(item.greenpay_id);
                            offlineQueue.dismissRejected(item.idempotency_key);
                            offlineQueue.enqueue({
                              greenpay_id: item.greenpay_id,
                              wet_kg: item.weights.wet,
                              dry_kg: item.weights.dry,
                              hazardous_kg: item.weights.hazardous,
                              ewaste_kg: item.weights.ewaste,
                            });
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500 text-black font-semibold text-[11px]"
                        >
                          Activate & Re-queue
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => offlineQueue.dismissRejected(item.idempotency_key)}
                        className="p-1 text-[#A7B9A8] hover:text-rose-400 transition"
                        title="Discard rejected entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => offlineQueue.clearRejected()}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#A7B9A8] text-xs transition"
              >
                Clear All Resolved
              </button>
              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
