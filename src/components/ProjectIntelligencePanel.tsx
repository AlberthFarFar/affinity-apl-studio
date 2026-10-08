import React, { useRef, useState } from 'react';
import { CheckCircle, Link2, Loader2, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import type { ProjectIntelligence } from '../types/projectIntelligence';

interface Props { projectName: string; onApply: (intelligence: ProjectIntelligence) => void }
type UiState = 'idle' | 'fetching' | 'checking' | 'filling' | 'success' | 'partial' | 'empty' | 'error';

async function readApiResponse(response: Response) {
  if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) throw new Error('Server mengembalikan respons yang tidak valid.');
  return response.json();
}

const statusLabel: Partial<Record<UiState, string>> = {
  fetching: 'Mengambil data', checking: 'Memeriksa fakta', filling: 'Mengisi kolom', success: 'Kolom berhasil diisi', partial: 'Sebagian fakta berhasil diisi', empty: 'Tidak ada fakta yang cocok', error: 'Gagal membaca sumber',
};

export function ProjectIntelligencePanel({ projectName, onApply }: Props) {
  const [clusterName, setClusterName] = useState('');
  const [unitType, setUnitType] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [state, setState] = useState<UiState>('idle');
  const [result, setResult] = useState<ProjectIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = async () => {
    const sources = urls.map((url) => url.trim()).filter(Boolean).slice(0, 3);
    if (!sources.length) { setError('Masukkan minimal satu URL sumber publik.'); setState('error'); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestRef.current;
    setError(null); setResult(null); setState('fetching');
    try {
      const response = await fetch('/api/project-intelligence/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ projectName, clusterName, unitType, urls: sources, discover: false }),
      });
      const json = await readApiResponse(response);
      if (requestId !== requestRef.current) return;
      if (!response.ok || !json.success) throw new Error(json.error || 'Auto-isi AI Link gagal.');
      setState('checking');
      await Promise.resolve();
      if (requestId !== requestRef.current) return;
      const intelligence: ProjectIntelligence = json.intelligence;
      const filled = Object.values(intelligence.autofill || {}).filter((value) => typeof value === 'string' && value.trim()).length;
      setResult(intelligence);
      if (!filled) { setState('empty'); return; }
      setState('filling');
      onApply(intelligence);
      setState(intelligence.warnings?.length ? 'partial' : 'success');
    } catch (err: any) {
      if (err?.name === 'AbortError' || requestId !== requestRef.current) return;
      setError(err?.message || 'Sumber tidak dapat dibaca.'); setState('error');
    }
  };

  const busy = ['fetching', 'checking', 'filling'].includes(state);
  return <section className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 sm:p-7">
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4 mb-4">
      <div className="p-2 rounded-xl bg-violet-50 text-violet-700"><Sparkles className="w-5 h-5" /></div>
      <div><h2 className="text-base sm:text-lg font-bold text-slate-900">AI Link — Auto-isi Fakta</h2><p className="text-xs text-slate-500 mt-1">Membaca maksimal 3 halaman sumber dan hanya mengisi kolom yang masih kosong.</p></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="text-xs font-semibold text-slate-700">Cluster<input value={clusterName} onChange={(e) => setClusterName(e.target.value)} placeholder="Cth: Cluster Akasia" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-700">Unit / Type<input value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="Cth: Tipe 45/90" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label>
    </div>
    <div className="mt-3 space-y-2">
      <span className="text-xs font-semibold text-slate-700">URL sumber</span>
      {urls.map((url, index) => <div key={index} className="flex gap-2"><input value={url} onChange={(e) => setUrls(urls.map((value, itemIndex) => itemIndex === index ? e.target.value : value))} placeholder="https://..." className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />{urls.length > 1 && <button type="button" onClick={() => setUrls(urls.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-rose-600">Hapus</button>}</div>)}
      {urls.length < 3 && <button type="button" onClick={() => setUrls([...urls, ''])} className="text-xs font-semibold text-violet-700">+ Tambah Link</button>}
    </div>
    <div className="flex flex-wrap items-center gap-2 mt-4">
      <button type="button" onClick={analyze} disabled={busy} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 text-white text-sm font-bold flex items-center gap-2"><Link2 className="w-4 h-4" /> Auto-isi dari Link</button>
      {state === 'error' && <button type="button" onClick={analyze} className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Coba lagi</button>}
      {statusLabel[state] && <span role="status" aria-live="polite" className="text-xs text-slate-600 flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : state === 'error' ? <XCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle className="w-4 h-4 text-teal-600" />}{statusLabel[state]}</span>}
    </div>
    {error && <p className="mt-3 text-xs rounded-lg bg-rose-50 text-rose-700 p-3">{error}</p>}
    {result?.warnings?.map((warning) => <p key={warning} className="mt-2 text-xs text-amber-800">{warning}</p>)}
    {result && <p className="mt-3 text-xs text-slate-500">Sumber: {result.sources.map((source) => source.title || source.url).join(' • ')}</p>}
  </section>;
}
