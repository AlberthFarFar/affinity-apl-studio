import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Lock,
  Cpu,
  Layers,
  Clock,
  Sparkles,
  Server,
  Code2,
} from 'lucide-react';

interface DiagnosticReport {
  timestamp?: string;
  overallStatus?: 'PASS' | 'WARN' | 'FAIL';
  falKey: {
    accessible: boolean;
    configured: boolean;
    length?: number;
    maskedPreview?: string;
    source: string;
    message: string;
  };
  openRouter?: {
    tested: boolean;
    accessible: boolean;
    model: string;
    endpoint: string;
    latencyMs?: number;
    message: string;
    error?: string;
    code?: string;
  };
  analyzeMaster?: {
    tested: boolean;
    passed: boolean;
    schemaValid: boolean;
    fieldsVerified: string[];
    missingFields?: string[];
    latencyMs?: number;
    message: string;
    sampleAnalysis?: Record<string, any>;
    error?: string;
    code?: string;
  };
}

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analyze-master' | 'raw'>('overview');

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // 1. Fetch full pipeline diagnostics
      const res = await fetch('/api/diagnostics');
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      // Fallback to checking key endpoint
      try {
        const keyRes = await fetch('/api/diagnostics/fal-key');
        const keyData = await keyRes.json();
        setReport({
          falKey: keyData,
          overallStatus: keyData.configured ? 'WARN' : 'FAIL',
        });
      } catch (keyErr: any) {
        setReport({
          overallStatus: 'FAIL',
          falKey: {
            accessible: false,
            configured: false,
            source: 'process.env.FAL_KEY',
            message: `Gagal memanggil endpoint diagnostik server: ${err.message}`,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Diagnostik Pipeline AI Affinity
                </h3>
                {report?.overallStatus === 'PASS' && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Semua Lulus (PASS)
                  </span>
                )}
                {report?.overallStatus === 'WARN' && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Peringatan (WARN)
                  </span>
                )}
                {report?.overallStatus === 'FAIL' && (
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-rose-600" /> Perlu Perhatian (FAIL)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Verifikasi aksesibilitas FAL_KEY dan komunikasi /api/analyze-master dengan fal.ai OpenRouter/GPT-5
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              title="Jalankan Ulang Diagnostik"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-5 border-b border-slate-200 bg-white flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-teal-600 text-teal-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Ringkasan Pipeline</span>
          </button>
          <button
            onClick={() => setActiveTab('analyze-master')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'analyze-master'
                ? 'border-teal-600 text-teal-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Validasi /api/analyze-master</span>
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'raw'
                ? 'border-teal-600 text-teal-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Laporan JSON Diagnostik</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {loading && !report ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                Menguji aksesibilitas FAL_KEY dan komunikasi ke fal.ai OpenRouter/GPT-5...
              </p>
            </div>
          ) : report ? (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* 1. Server-Side Key Accessibility Card */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-teal-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          1. Aksesibilitas Server FAL_KEY
                        </h4>
                      </div>
                      {report.falKey.configured ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terdeteksi di Server
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" /> Belum Dikonfigurasi
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium uppercase block">Status Variabel</span>
                        <span className="font-semibold text-slate-800">
                          {report.falKey.configured ? 'Tersedia & Valid' : 'Kosong / Tidak Ada'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium uppercase block">Masked Preview</span>
                        <span className="font-mono text-teal-700 font-semibold">
                          {report.falKey.maskedPreview || '(Tidak tersedia)'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium uppercase block">Panjang Karakter</span>
                        <span className="font-semibold text-slate-800">
                          {report.falKey.length ? `${report.falKey.length} karakter` : '0'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 bg-teal-50/60 p-2.5 rounded-lg border border-teal-100 flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Keamanan Terjamin:</strong> Nilai asli FAL_KEY hanya diakses di sisi server
                        (<code>process.env.FAL_KEY</code>) dan tidak pernah diekspos ke frontend atau log klien.
                      </span>
                    </p>
                  </div>

                  {/* 2. OpenRouter / GPT-5 Endpoint Connectivity */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-teal-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          2. Komunikasi fal.ai OpenRouter (GPT-5)
                        </h4>
                      </div>
                      {report.openRouter?.accessible ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terhubung (200 OK)
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />{' '}
                          {report.openRouter?.tested ? 'Gagal Terhubung' : 'Belum Diuji'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium uppercase block">Model Default</span>
                        <span className="font-semibold text-slate-800 font-mono text-[11px]">
                          {report.openRouter?.model || 'openai/gpt-5'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium uppercase block">Endpoint Base</span>
                        <span className="font-mono text-[10px] text-slate-600 truncate block" title={report.openRouter?.endpoint}>
                          fal.run/openrouter/...
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium uppercase block">Round-trip Latency</span>
                        <span className="font-semibold text-teal-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {report.openRouter?.latencyMs ? `${report.openRouter.latencyMs} ms` : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700">
                      {report.openRouter?.message}
                      {report.openRouter?.error && (
                        <p className="text-[11px] text-rose-600 font-mono mt-1 bg-rose-50 p-2 rounded border border-rose-200">
                          {report.openRouter.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 3. /api/analyze-master Pipeline Summary */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-teal-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          3. Alur /api/analyze-master (Reasoning Fasad)
                        </h4>
                      </div>
                      {report.analyzeMaster?.passed ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Skema Valid 100%
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />{' '}
                          {report.analyzeMaster?.tested ? 'Skema Tidak Lengkap' : 'Menunggu Pengujian'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      {report.analyzeMaster?.message || 'Memverifikasi kemampuan GPT-5 dalam mendekonstruksi fasad properti dan mengunci fitur immutable.'}
                    </p>

                    {report.analyzeMaster?.sampleAnalysis && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs space-y-1">
                        <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider block">
                          Contoh Output Master Properti Terverifikasi:
                        </span>
                        <p className="text-slate-800">
                          <strong>Identitas:</strong> {report.analyzeMaster.sampleAnalysis.property_identity}
                        </p>
                        <p className="text-slate-800">
                          <strong>Gaya:</strong> {report.analyzeMaster.sampleAnalysis.architectural_style}
                        </p>
                        <div className="flex gap-4 text-[11px] pt-1 text-teal-800 font-semibold">
                          <span>🔒 {report.analyzeMaster.sampleAnalysis.immutableCount} Fitur Immutable Terkunci</span>
                          <span>✨ {report.analyzeMaster.sampleAnalysis.editableCount} Fitur Lingkungan Fleksibel</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'analyze-master' && (
                <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      Field yang Divalidasi pada Skema /api/analyze-master
                    </h4>
                    <span className="text-slate-400 text-[11px]">
                      Latency: {report.analyzeMaster?.latencyMs ? `${report.analyzeMaster.latencyMs}ms` : '-'}
                    </span>
                  </div>

                  <p className="text-slate-600 leading-relaxed">
                    Setiap request ke <code>/api/analyze-master</code> mengeksekusi reasoning arsitektur via GPT-5
                    pada fal.ai OpenRouter. Skema berikut wajib ada untuk menjamin fasad properti tidak terdistorsi:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                    {[
                      { key: 'property_identity', label: 'Identitas & Deskripsi Properti' },
                      { key: 'architectural_style', label: 'Gaya Arsitektur Fasad' },
                      { key: 'target_audience', label: 'Target Demografis Audiens' },
                      { key: 'property_usp', label: 'Daftar USP Properti (Array)' },
                      { key: 'facade_lock', label: 'Aturan Penguncian Fasad Root' },
                      { key: 'facade_lock.immutable_features', label: 'Daftar Fitur Permanen (Dilarang Ubah)' },
                      { key: 'facade_lock.editable_environment_features', label: 'Daftar Fitur Fleksibel (Kreativitas AI)' },
                      { key: 'visual_style', label: 'Arah Fotografi Editorial' },
                      { key: 'brand_tone', label: 'Tone of Voice Brand' },
                      { key: 'campaign_angle', label: 'Sudut Cerita Kampanye' },
                    ].map((item) => {
                      const isVerified = report.analyzeMaster?.fieldsVerified?.includes(item.key);
                      return (
                        <div
                          key={item.key}
                          className={`p-2 rounded-lg border flex items-center justify-between ${
                            isVerified
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div>
                            <span className="font-bold block">{item.key}</span>
                            <span className="text-[10px] text-slate-500 font-sans">{item.label}</span>
                          </div>
                          {isVerified ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-sans">Belum diuji</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-teal-400 text-xs font-bold uppercase font-mono">
                    <span>Raw Diagnostic Report JSON</span>
                    <span className="text-slate-400 font-normal">Sanitized (No Secrets Exposed)</span>
                  </div>
                  <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto p-2 bg-slate-900/90 rounded text-teal-300">
                    {JSON.stringify(report, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Tidak ada data diagnostik yang tersedia.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Terakhir diuji: {report?.timestamp ? new Date(report.timestamp).toLocaleTimeString() : 'Baru saja'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menguji...' : 'Uji Diagnostik Ulang'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
