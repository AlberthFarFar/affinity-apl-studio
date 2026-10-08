import React, { useState } from 'react';
import { CheckCircle, Link2, Loader2, Search, Sparkles, XCircle } from 'lucide-react';
import type { ProjectIntelligence } from '../types/projectIntelligence';
import { ProjectIntelligenceApiError, readProjectIntelligenceResponse } from '../utils/projectIntelligenceApi';

interface Props {
  projectName: string;
  onApply: (intelligence: ProjectIntelligence) => void;
}

const confidenceClass = (confidence: string) => confidence === 'high' ? 'bg-emerald-100 text-emerald-800' : confidence === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';

function normalizeUrlForRequest(value: string): string {
  const trimmed = value.trim();
  return trimmed && !/^https?:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
}

export function ProjectIntelligencePanel({ projectName, onApply }: Props) {
  const [clusterName, setClusterName] = useState('');
  const [unitType, setUnitType] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<ProjectIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [requestId, setRequestId] = useState<string | undefined>();

  const analyze = async (discover: boolean) => {
    setErrorCode(undefined); setRequestId(undefined);
    if (!projectName.trim()) { setError('Isi Nama Proyek terlebih dahulu.'); return; }
    setError(null); setResult(null); setStatus(discover ? 'Building a broader concept draft' : 'Reading project information');
    try {
      setStatus('Matching project, cluster, and unit');
      const response = await fetch('/api/project-intelligence/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, clusterName, unitType, urls: urls.filter(Boolean).map(normalizeUrlForRequest), discover }),
      });
      const json = await readProjectIntelligenceResponse(response);
      setStatus('Building Visual DNA');
      setResult(json.intelligence);
      setStatus('Ready');
    } catch (err: any) {
      setStatus(null); setError(err?.message || 'Project belum dapat dianalisis.');
      if (err instanceof ProjectIntelligenceApiError) {
        setErrorCode(err.code); setRequestId(err.requestId);
      }
    }
  };

  return <section className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 sm:p-7">
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4 mb-4">
      <div className="p-2 rounded-xl bg-violet-50 text-violet-700"><Sparkles className="w-5 h-5" /></div>
      <div><h2 className="text-base sm:text-lg font-bold text-slate-900">Auto-isi Konsep dengan AI</h2><p className="text-xs text-slate-500 mt-1">AI menyusun draft dari nama proyek, cluster, tipe unit, dan tautan rujukan. Tautan tidak dibuka otomatis; tinjau fakta sebelum menerapkan hasil.</p></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="text-xs font-semibold text-slate-700">Cluster<input value={clusterName} onChange={(e) => setClusterName(e.target.value)} placeholder="Cth: Cluster Akasia" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-700">Unit / Type<input value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="Cth: Tipe 45/90" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label>
    </div>
    <div className="mt-3 space-y-2">
      <span className="text-xs font-semibold text-slate-700">Project URL</span>
      {urls.map((url, index) => <div key={index} className="flex gap-2"><input value={url} onChange={(e) => setUrls(urls.map((value, itemIndex) => itemIndex === index ? e.target.value : value))} placeholder="https://..." className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />{urls.length > 1 && <button onClick={() => setUrls(urls.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-rose-600">Hapus</button>}</div>)}
      <button onClick={() => setUrls([...urls, ''])} className="text-xs font-semibold text-violet-700">+ Tambah Link</button>
    </div>
    <div className="flex flex-wrap gap-2 mt-4">
      <button onClick={() => analyze(false)} disabled={!!status && status !== 'Ready'} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-200 text-white text-sm font-bold flex items-center gap-2"><Link2 className="w-4 h-4" /> Analisis Project dengan AI</button>
      <button onClick={() => analyze(true)} disabled={!!status && status !== 'Ready'} className="px-4 py-2 rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50 disabled:text-slate-400 text-sm font-bold flex items-center gap-2"><Search className="w-4 h-4" /> Buat Draft Konsep</button>
      {status && <span className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {status}</span>}
    </div>
    {error && <div role="alert" className="mt-4 text-xs rounded-lg bg-rose-50 text-rose-700 p-3">
      <p><XCircle className="w-4 h-4 inline mr-1" />{error}</p>
      {requestId && <p className="mt-2">ID permintaan untuk dukungan: {requestId}</p>}
      {['AI_PROVIDER_POLICY_BLOCKED', 'AI_PROVIDER_FORBIDDEN'].includes(errorCode || '') && <a href="mailto:support@fal.ai" className="inline-block mt-2 underline font-semibold">Hubungi dukungan fal.ai</a>}
    </div>}
    {result && <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50/40 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2"><CheckCircle className="w-5 h-5 text-teal-600" /><strong>Project Intelligence siap ditinjau</strong><span className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded-full ${confidenceClass(result.identityMatch.confidence)}`}>Confidence: {result.identityMatch.confidence}</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs"><span>Project matched: {result.identityMatch.projectMatch}%</span><span>Cluster matched: {result.identityMatch.clusterMatch ?? '—'}{typeof result.identityMatch.clusterMatch === 'number' ? '%' : ''}</span><span>Unit matched: {result.identityMatch.unitMatch ?? '—'}{typeof result.identityMatch.unitMatch === 'number' ? '%' : ''}</span></div>
      {result.visualDNA.architecturalCharacter && <p className="mt-3"><strong>Architectural Character:</strong> {result.visualDNA.architecturalCharacter}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs"><div><strong>Primary Visual DNA</strong><ul className="list-disc ml-4 mt-1">{result.visualDNA.primaryAnchors.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Material Palette</strong><ul className="list-disc ml-4 mt-1">{result.visualDNA.materials.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div></div>
      {result.environment?.siteCharacter && <p className="mt-3 text-xs"><strong>Environment:</strong> {result.environment.siteCharacter}</p>}
      <p className="mt-3 text-xs"><strong>Sources:</strong> {result.sources.length ? result.sources.map((source) => source.title || source.url).join(' • ') : 'Tidak ada sumber yang cukup kuat; gunakan hasil sebagai draft.'}</p>
      {result.warnings?.map((warning) => <p key={warning} className="mt-2 text-xs text-amber-800">{warning}</p>)}
      <button onClick={() => onApply(result)} className="mt-4 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold">Apply to Project</button>
    </div>}
  </section>;
}
