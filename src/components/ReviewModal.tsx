import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Download,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Columns,
  Split,
  Eye,
} from 'lucide-react';
import { BlueprintSlide, VisualQAResult } from '../types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterImage: string;
  posterImage: string;
  cleanSceneImage?: string;
  slide: BlueprintSlide | null;
  slideNumber: number;
  onDownload: () => void;
  visualQA?: VisualQAResult | null;
  referenceVersion?: number;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  masterImage,
  posterImage,
  cleanSceneImage,
  slide,
  slideNumber,
  onDownload,
  visualQA,
  referenceVersion = 1,
}) => {
  const [activeView, setActiveView] = useState<'poster' | 'scene'>('scene');
  const [compareMode, setCompareMode] = useState<'split' | 'side-by-side'>('split');
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  if (!isOpen) return null;

  const currentResultImage = activeView === 'poster' ? posterImage : cleanSceneImage || posterImage;

  const guardStatus = visualQA?.status || (visualQA ? (visualQA.pass ? 'PASS' : 'REJECT') : 'NOT_VALIDATED');
  const overallScore = visualQA?.overall_score || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Verifikasi Fasad Arsitektur — Slide {slideNumber}
                </h3>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                  Ref v{referenceVersion}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pemeriksaan komparatif geometri bangunan master (Image 1) terhadap output visual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            {/* View Selection: Poster vs Scene */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Objek Review:</span>
              <div className="flex rounded-lg border border-slate-300 p-0.5 bg-white text-xs">
                {cleanSceneImage && (
                  <button
                    onClick={() => setActiveView('scene')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      activeView === 'scene'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Visual Fasad Murni
                  </button>
                )}
                <button
                  onClick={() => setActiveView('poster')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeView === 'poster'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Poster + Tipografi
                </button>
              </div>
            </div>

            {/* Compare Mode: Split Slider vs Side-by-Side */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Mode Bandingkan:</span>
              <div className="flex rounded-lg border border-slate-300 p-0.5 bg-white text-xs">
                <button
                  onClick={() => setCompareMode('split')}
                  className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    compareMode === 'split'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Split Slider (Wipe)</span>
                </button>
                <button
                  onClick={() => setCompareMode('side-by-side')}
                  className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    compareMode === 'side-by-side'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Side-by-Side</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Comparison Display */}
          {compareMode === 'split' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-teal-800 flex items-center gap-1">
                  ← Kiri: Referensi Fasad Master
                </span>
                <span className="text-[11px] text-slate-500">Geser slider untuk membandingkan pergeseran tepi bangunan</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  Kanan: Hasil Visual →
                </span>
              </div>

              {/* Split Wipe Slider Container */}
              <div
                className="relative aspect-4/5 max-h-[500px] w-auto mx-auto rounded-2xl overflow-hidden border border-slate-300 shadow-lg select-none bg-slate-900"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                  setSliderPosition((x / rect.width) * 100);
                }}
                onTouchMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  if (!touch) return;
                  const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
                  setSliderPosition((x / rect.width) * 100);
                }}
              >
                {/* Background Image: Generated Output */}
                <img
                  src={currentResultImage}
                  alt="Output Fasad"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                {/* Foreground Image: Reference Image (clipped by slider) */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none border-r-2 border-white shadow-2xl"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={masterImage}
                    alt="Master Fasad"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: '100%', height: '100%' }}
                  />
                  <span className="absolute top-3 left-3 bg-slate-900/85 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    Master Properti
                  </span>
                </div>

                {/* Right Badge */}
                <span className="absolute top-3 right-3 bg-slate-900/85 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  Hasil AI
                </span>

                {/* Divider Line & Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-md"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-800 shadow-xl flex items-center justify-center text-xs font-bold border border-slate-300">
                    ↔
                  </div>
                </div>
              </div>

              {/* Slider Range Control for accessibility / precision */}
              <div className="flex items-center gap-3 max-w-md mx-auto pt-1">
                <span className="text-[10px] text-slate-500">Master</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <span className="text-[10px] text-slate-500">Hasil AI</span>
              </div>
            </div>
          ) : (
            /* Side by Side Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left: Master Image */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    Sumber Kebenaran (Master Properti)
                  </span>
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Ground Truth (Image 1)
                  </span>
                </div>
                <div className="aspect-4/5 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
                  <img
                    src={masterImage}
                    alt="Original Master"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Right: Output Image */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    {activeView === 'poster' ? 'Poster Final Ter-render' : 'Adegan Visual Murni'}
                  </span>
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Rasio 4:5
                  </span>
                </div>
                <div className="aspect-4/5 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
                  <img
                    src={currentResultImage}
                    alt="Generated Result"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Architectural Consistency Guard Status & Metrics Card */}
          <div
            className={`rounded-xl p-4 border space-y-3 ${
              guardStatus === 'PASS'
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : guardStatus === 'REJECT'
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : guardStatus === 'NEEDS_REVIEW'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-current/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <div>
                  <span className="font-bold text-sm block">
                    ARCHITECTURAL CONSISTENCY GUARD — STATUS:{' '}
                    <span className="underline">{guardStatus}</span>
                  </span>
                  <span className="text-[11px] opacity-80">
                    {visualQA?.honest_assessment ||
                      (guardStatus === 'PASS'
                        ? 'Pemeriksaan visual tidak menemukan perubahan terlarang pada bentuk atap, bukaan, maupun massa bangunan.'
                        : guardStatus === 'REJECT'
                        ? 'Terdeteksi perubahan signifikan pada geometri fasad dibandingkan foto referensi asli.'
                        : guardStatus === 'NEEDS_REVIEW'
                        ? 'Terdapat potensi perubahan parsial. Diperlukan konfirmasi manual pengguna.'
                        : 'Hasil belum diperiksa secara visual melalui evaluasi komparatif.')}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-mono font-bold">
                  Skor Kesesuaian: {overallScore}%
                </span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            {visualQA && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                <div className="bg-white/80 p-2 rounded-lg border border-current/15 text-center">
                  <span className="text-[10px] opacity-70 block">Geometri Atap</span>
                  <strong className="text-sm">{visualQA.roof_geometry_match || 0}%</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-current/15 text-center">
                  <span className="text-[10px] opacity-70 block">Bukaan Pintu/Jendela</span>
                  <strong className="text-sm">{visualQA.window_door_layout_match || 0}%</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-current/15 text-center">
                  <span className="text-[10px] opacity-70 block">Massa & Footprint</span>
                  <strong className="text-sm">{visualQA.massing_match || 0}%</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-current/15 text-center">
                  <span className="text-[10px] opacity-70 block">Proporsi Fasad</span>
                  <strong className="text-sm">{visualQA.facade_proportion_match || 0}%</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-current/15 text-center">
                  <span className="text-[10px] opacity-70 block">Sudut Kamera</span>
                  <strong className="text-sm">{visualQA.camera_view_match || 0}%</strong>
                </div>
              </div>
            )}

            {/* Critical Alterations Alert if any */}
            {visualQA?.critical_changes && visualQA.critical_changes.length > 0 && (
              <div className="pt-1 border-t border-current/20">
                <span className="font-bold text-xs block mb-1">Perubahan Arsitektur Terdeteksi:</span>
                <ul className="list-disc pl-5 text-xs space-y-0.5">
                  {visualQA.critical_changes.map((change, idx) => (
                    <li key={idx}>{change}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {guardStatus === 'PASS' ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Terverifikasi lolos Architectural Consistency Guard
              </span>
            ) : guardStatus === 'REJECT' ? (
              <span className="text-rose-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Status REJECT: Disarankan regenerasi dengan Strict Preserve
              </span>
            ) : (
              <span>Hasil dapat diunduh untuk kebutuhan review internal</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={onDownload}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm shadow-teal-700/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Gambar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
