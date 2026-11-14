import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import QRCode from 'qrcode';
import { Download, QrCode, ShieldCheck, Printer, CheckCircle } from 'lucide-react';

export const CitizenQRPage: React.FC = () => {
  const { user } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const greenpayId = user?.greenpay_id || '';
  const qrPayload = JSON.stringify({
    greenpay_id: greenpayId,
    ward: user?.ward_name || '',
    system: 'GREENPAY_BLR',
  });

  useEffect(() => {
    QRCode.toDataURL(qrPayload, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    }).then(setQrDataUrl).catch(() => {});
  }, [qrPayload]);

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 840;
    const ctx = canvas.getContext('2d');
    if (!ctx || !qrDataUrl) return;

    // Background
    ctx.fillStyle = '#041B15';
    ctx.fillRect(0, 0, 600, 840);

    // Border
    ctx.strokeStyle = '#D7FF35';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 560, 800);

    // Header
    ctx.fillStyle = '#D7FF35';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GREENPAY / BLR', 300, 70);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px monospace';
    ctx.fillText('PERMANENT CITIZEN IDENTIFIER CARD', 300, 100);

    // QR Image
    const img = new Image();
    img.src = qrDataUrl;
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(150, 140, 300, 300);
      ctx.drawImage(img, 160, 150, 280, 280);

      // Citizen Details
      ctx.fillStyle = '#D7FF35';
      ctx.font = 'bold 36px monospace';
      ctx.fillText(greenpayId, 300, 490);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(user?.name || 'Citizen', 300, 535);

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '16px monospace';
      ctx.fillText(`Ward: ${user?.ward_name || 'Bengaluru Ward'}`, 300, 575);
      ctx.fillText(`Meter: ${user?.masked_meter || '[MASKED]'}`, 300, 610);

      // Footer notice
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px sans-serif';
      ctx.fillText('Affix at household entrance for supervisor doorstep collection.', 300, 750);
      ctx.fillText('Independent Civic Prototype - Not Affiliated with BBMP', 300, 775);

      // Trigger download
      const link = document.createElement('a');
      link.download = `GreenPay_Card_${greenpayId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    };
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-[#D7FF35]">PHYSICAL CIVIC CREDENTIAL</span>
        <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
          Permanent Citizen QR ID Card
        </h1>
        <p className="max-w-xl mx-auto text-sm text-[#A7B9A8] font-light">
          Your doorstep identity card. Field supervisors scan this QR code before weighing your household waste.
        </p>
      </div>

      {/* Visual ID Card Preview */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm rounded-3xl bg-[#062B20] border-2 border-[#D7FF35]/40 p-8 shadow-glow-lime space-y-6 text-center text-white relative">
          
          <div className="space-y-1">
            <span className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-[#D7FF35]">
              GREENPAY / BLR
            </span>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#A7B9A8]">
              Household ID Card
            </div>
          </div>

          {/* QR Code Container */}
          <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-inner flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`GreenPay QR Code for ${greenpayId}`} className="w-full h-full" />
            ) : (
              <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-black font-mono text-xs">
                Rendering QR...
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono text-[#D7FF35] tracking-widest">
              {greenpayId}
            </div>
            <div className="text-base font-semibold text-white">
              {user?.name}
            </div>
            <div className="text-xs font-mono text-[#A7B9A8]">
              {user?.ward_name} Ward
            </div>
            <div className="text-[11px] font-mono text-[#A7B9A8]/70">
              Meter: {user?.masked_meter}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-[10px] text-[#A7B9A8]/70 font-mono">
            Display at your doorstep or present during morning collection
          </div>
        </div>
      </div>

      {/* Download Action & Instructions */}
      <div className="text-center space-y-4 max-w-md mx-auto">
        <button
          type="button"
          onClick={handleDownload}
          className="w-full py-4 rounded-2xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-widest transition shadow-glow-lime flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Printable Card (PNG)</span>
        </button>

        {downloadSuccess && (
          <div className="p-3 rounded-xl bg-[#D7FF35]/15 border border-[#D7FF35]/30 text-[#D7FF35] text-xs flex items-center justify-center gap-2 font-mono">
            <CheckCircle className="w-4 h-4" />
            <span>Card downloaded successfully!</span>
          </div>
        )}

        <p className="text-[11px] text-[#A7B9A8] leading-relaxed">
          Tip: You can print this card and attach it near your house gate or waste bin, or simply show this screen from your mobile phone.
        </p>
      </div>
    </div>
  );
};
