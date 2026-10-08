import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clipboard, Film, FlaskConical, ImagePlus, Loader2, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { createMasterAIImage } from '../../utils/imageProcessing';

type SceneSummary = { id: string; index: number; name: string };
type StyleSummary = { id: string; name: string; scenes: SceneSummary[] };
type Config = {
  labEnabled: boolean;
  paidGenerationEnabled: boolean;
  styles: StyleSummary[];
  models: { initial: string; finish: string };
};
type PreviewScene = SceneSummary & { prompt: string };
type DryRunPreview = {
  style: { id: string; name: string };
  scenes: PreviewScene[];
  referenceOrder: string[];
  expectedModelCalls: number;
  costEstimate: 'unknown';
};
type SlideResult = {
  sceneId: string;
  sceneIndex: number;
  sceneName: string;
  modelId: string;
  status: 'pending' | 'succeeded' | 'failed';
  imageUrl?: string;
  requestId?: string;
  error?: string;
  finishedImageUrl?: string;
  finishError?: string;
  finishing?: boolean;
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function dataUrlName(file: File) {
  return `${file.name} (${Math.round(file.size / 1024)} KB)`;
}

export function VisualStyleTestLab() {
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState('');
  const [masterReference, setMasterReference] = useState('');
  const [masterName, setMasterName] = useState('');
  const [compositionCrop, setCompositionCrop] = useState('');
  const [cropName, setCropName] = useState('');
  const [factsText, setFactsText] = useState('');
  const [preview, setPreview] = useState<DryRunPreview | null>(null);
  const [results, setResults] = useState<SlideResult[]>([]);
  const [busy, setBusy] = useState<'config' | 'dry-run' | 'generate' | null>('config');
  const [error, setError] = useState('');
  const [uploadedAiSource, setUploadedAiSource] = useState('');
  const [uploadedAiName, setUploadedAiName] = useState('');
  const [uploadedAiFinished, setUploadedAiFinished] = useState('');
  const [uploadedAiError, setUploadedAiError] = useState('');
  const [uploadedAiFinishing, setUploadedAiFinishing] = useState(false);

  useEffect(() => {
    fetch('/api/visual-style-lab/config')
      .then(readJson)
      .then((data) => {
        setConfig(data);
        setSelectedStyleId(data.styles[0]?.id || '');
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setBusy(null));
  }, []);

  const references = useMemo(
    () => [masterReference, compositionCrop].filter(Boolean),
    [masterReference, compositionCrop],
  );
  const facts = useMemo(
    () => factsText.split('\n').map((fact) => fact.trim()).filter(Boolean),
    [factsText],
  );

  const selectImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (value: string) => void,
    setName: (value: string) => void,
    resetCarousel = true,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar JPG, PNG, atau WebP.');
      return;
    }
    try {
      setError('');
      setImage(await createMasterAIImage(file));
      setName(dataUrlName(file));
      if (resetCarousel) {
        setPreview(null);
        setResults([]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gambar tidak dapat dibaca.');
    }
  };

  const requestBody = () => ({ styleId: selectedStyleId, referenceUrls: references, verifiedFacts: facts });

  const runDryRun = async () => {
    setBusy('dry-run');
    setError('');
    try {
      const data = await readJson(await fetch('/api/visual-style-lab/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody()),
      }));
      setPreview(data.preview);
      setResults([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Dry Run gagal.');
    } finally {
      setBusy(null);
    }
  };

  const generateFive = async () => {
    if (!preview) return setError('Jalankan Dry Run terlebih dahulu.');
    if (!window.confirm('Konfirmasi tindakan berbayar: buat 5 request Nano Banana Pro terpisah sekarang?')) return;
    setBusy('generate');
    setError('');
    setResults(preview.scenes.map((scene) => ({
      sceneId: scene.id,
      sceneIndex: scene.index,
      sceneName: scene.name,
      modelId: config?.models.initial || 'fal-ai/nano-banana-pro/edit',
      status: 'pending',
    })));
    try {
      const data = await readJson(await fetch('/api/visual-style-lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody(), confirmation: 'GENERATE_5_NANO_BANANA_PRO' }),
      }));
      setResults(data.results);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Generate 5 gagal.');
      setResults((current) => current.map((result) => ({ ...result, status: 'failed', error: 'Batch request gagal sebelum hasil diterima.' })));
    } finally {
      setBusy(null);
    }
  };

  const retry = async (sceneId: string) => {
    if (!window.confirm('Konfirmasi tindakan berbayar: retry satu slide Nano Banana Pro ini?')) return;
    setResults((current) => current.map((item) => item.sceneId === sceneId ? { ...item, status: 'pending', error: undefined } : item));
    try {
      const data = await readJson(await fetch('/api/visual-style-lab/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody(), sceneId, confirmation: 'RETRY_ONE_NANO_BANANA_PRO' }),
      }));
      setResults((current) => current.map((item) => item.sceneId === sceneId ? data.result : item));
    } catch (reason) {
      setResults((current) => current.map((item) => item.sceneId === sceneId
        ? { ...item, status: 'failed', error: reason instanceof Error ? reason.message : 'Retry gagal.' }
        : item));
    }
  };

  const finishCarouselImage = async (sceneId: string, imageUrl: string) => {
    if (!window.confirm('Konfirmasi tindakan berbayar: terapkan Cinema Film Finish dengan Seedream 5.0 Pro pada satu gambar ini?')) return;
    setResults((current) => current.map((item) => item.sceneId === sceneId ? { ...item, finishing: true, finishError: undefined } : item));
    try {
      const data = await finishRequest(imageUrl);
      setResults((current) => current.map((item) => item.sceneId === sceneId
        ? { ...item, finishing: false, finishedImageUrl: data.result.imageUrl }
        : item));
    } catch (reason) {
      setResults((current) => current.map((item) => item.sceneId === sceneId
        ? { ...item, finishing: false, finishError: reason instanceof Error ? reason.message : 'Film Finish gagal.' }
        : item));
    }
  };

  const finishRequest = async (imageUrl: string) => readJson(await fetch('/api/visual-style-lab/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, confirmation: 'APPLY_ONE_SEEDREAM_FILM_FINISH' }),
  }));

  const finishUploadedAi = async () => {
    if (!uploadedAiSource) return;
    if (!window.confirm('Konfirmasi tindakan berbayar: terapkan Cinema Film Finish pada gambar AI unggahan ini?')) return;
    setUploadedAiFinishing(true);
    setUploadedAiError('');
    try {
      const data = await finishRequest(uploadedAiSource);
      setUploadedAiFinished(data.result.imageUrl);
    } catch (reason) {
      setUploadedAiError(reason instanceof Error ? reason.message : 'Film Finish gagal.');
    } finally {
      setUploadedAiFinishing(false);
    }
  };

  if (busy === 'config') return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/95 px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-cyan-300" /><h1 className="text-lg font-black">Visual Style Testing Lab <span className="text-cyan-300">v1.1</span></h1></div>
            <p className="text-xs text-slate-400">DEV/TEST ONLY · terisolasi dari pipeline production</p>
          </div>
          <a href="/" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> Kembali ke Affinity</a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {!config?.labEnabled && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100"><ShieldAlert className="mb-2 h-5 w-5" />Lab dinonaktifkan di server. Aktifkan hanya di lingkungan pengembangan yang terlindungi.</div>
        )}
        {error && <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div>}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-bold">1. Referensi properti</h2>
            <label className="block cursor-pointer rounded-xl border border-dashed border-cyan-300/40 bg-cyan-300/5 p-4 text-sm hover:bg-cyan-300/10">
              <span className="flex items-center gap-2 font-bold"><ImagePlus className="h-4 w-4" /> Pilih full master property image</span>
              <span className="mt-1 block text-xs text-slate-400">Wajib; selalu menjadi image_urls[0] dan sumber identitas arsitektur.</span>
              <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage(event, setMasterReference, setMasterName)} />
            </label>
            {masterName && <p className="text-xs text-emerald-300"><CheckCircle2 className="mr-1 inline h-4 w-4" />{masterName}</p>}
            <label className="block cursor-pointer rounded-xl border border-dashed border-white/15 p-4 text-sm hover:bg-white/5">
              <span className="font-bold">Crop komposisi opsional</span>
              <span className="mt-1 block text-xs text-slate-400">Jika dipilih, menjadi image_urls[1]; bukan pengganti master penuh.</span>
              <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage(event, setCompositionCrop, setCropName)} />
            </label>
            {cropName && <p className="text-xs text-slate-300">{cropName}</p>}
            <label className="block text-sm font-bold">Fakta proyek terverifikasi (opsional, satu per baris)
              <textarea value={factsText} onChange={(event) => { setFactsText(event.target.value); setPreview(null); }} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm font-normal outline-none focus:border-cyan-300" placeholder="Contoh: Tampak depan memperlihatkan bangunan 2 lantai." />
            </label>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-bold">2. Pilih style baku</h2><span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">Auto casting</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {config?.styles.map((style) => (
                <button key={style.id} type="button" onClick={() => { setSelectedStyleId(style.id); setPreview(null); setResults([]); }} className={`rounded-xl border p-3 text-left text-sm ${selectedStyleId === style.id ? 'border-cyan-300 bg-cyan-300/10' : 'border-white/10 hover:bg-white/5'}`}>
                  <strong>{style.name}</strong><span className="mt-1 block text-xs text-slate-400">{style.scenes.map((scene) => scene.name).join(' · ')}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={runDryRun} disabled={!config?.labEnabled || !masterReference || !!busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-black text-slate-950 disabled:opacity-40">
              {busy === 'dry-run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Dry Run / Preview 5 Full Prompts
            </button>
            <p className="text-xs text-slate-400">Dry Run tidak memanggil API model dan tidak menimbulkan biaya.</p>
          </div>
        </section>

        {preview && (
          <section className="space-y-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Dry Run: {preview.style.name}</h2><p className="text-xs text-slate-400">{preview.expectedModelCalls} panggilan model terpisah · estimasi biaya: {preview.costEstimate}</p></div>
              <button type="button" disabled={!config?.paidGenerationEnabled || busy === 'generate'} onClick={generateFive} className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-500 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className="h-4 w-4" /> Generate 5 — Nano Banana Pro</button>
            </div>
            {!config?.paidGenerationEnabled && <p className="rounded-lg bg-amber-400/10 p-3 text-xs text-amber-200">Paid generation OFF (default). Untuk dev lokal, set VISUAL_STYLE_LAB_PAID_GENERATION_ENABLED=true dan FAL_KEY di backend.</p>}
            <div className="rounded-lg bg-slate-950/60 p-3 text-xs text-slate-300"><strong>Urutan referensi:</strong> {preview.referenceOrder.join(' → ')}</div>
            <div className="grid gap-3">
              {preview.scenes.map((scene) => <details key={scene.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><summary className="cursor-pointer font-bold">Slide {scene.index}: {scene.name}</summary><div className="mt-3 flex justify-end"><button type="button" onClick={() => navigator.clipboard.writeText(scene.prompt)} className="inline-flex items-center gap-1 text-xs text-cyan-300"><Clipboard className="h-3 w-3" /> Copy prompt</button></div><pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{scene.prompt}</pre></details>)}
            </div>
          </section>
        )}

        {results.length > 0 && (
          <section className="space-y-4"><h2 className="font-bold">3. Hasil independen</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((result) => <article key={result.sceneId} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="aspect-[4/5] bg-slate-900">{result.imageUrl ? <img src={result.imageUrl} alt={result.sceneName} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-slate-500">{result.status === 'pending' ? <Loader2 className="h-7 w-7 animate-spin" /> : 'Belum ada gambar'}</div>}</div>
              <div className="space-y-3 p-4"><div><p className="font-bold">Slide {result.sceneIndex}: {result.sceneName}</p><p className="break-all text-[10px] text-slate-500">{result.modelId}{result.requestId ? ` · ${result.requestId}` : ''}</p></div>{result.error && <p className="text-xs text-rose-300">{result.error}</p>}
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => retry(result.sceneId)} disabled={!config?.paidGenerationEnabled || result.status === 'pending'} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-40"><RefreshCw className="h-3 w-3" /> Retry satu</button>{result.imageUrl && <button type="button" onClick={() => finishCarouselImage(result.sceneId, result.imageUrl!)} disabled={!config?.paidGenerationEnabled || result.finishing} className="inline-flex items-center gap-1 rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40"><Film className="h-3 w-3" /> Cinema Film Finish</button>}</div>
                {result.finishError && <p className="text-xs text-rose-300">{result.finishError}</p>}{result.finishedImageUrl && <div className="space-y-2"><p className="text-xs font-bold text-amber-200">Before / After — periksa drift sebelum menerima</p><div className="grid grid-cols-2 gap-2"><img src={result.imageUrl} alt="Before finish" className="aspect-[4/5] w-full object-cover" /><img src={result.finishedImageUrl} alt="After finish" className="aspect-[4/5] w-full object-cover" /></div><button type="button" onClick={() => setResults((current) => current.map((item) => item.sceneId === result.sceneId ? { ...item, finishedImageUrl: undefined } : item))} className="text-xs text-rose-300">Tolak finish (pertahankan original)</button></div>}
              </div>
            </article>)}
          </div></section>
        )}

        <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><h2 className="flex items-center gap-2 font-bold"><Film className="h-5 w-5 text-amber-300" /> Cinema Film Finish untuk gambar AI lain</h2><p className="mt-1 text-xs text-slate-400">Seedream hanya melakukan finishing satu gambar per klik; source asli tetap tersedia untuk before/after.</p><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="cursor-pointer rounded-xl border border-dashed border-amber-300/30 p-4 text-sm"><strong>Unggah gambar buatan AI</strong><span className="mt-1 block text-xs text-slate-400">JPG, PNG, atau WebP</span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setUploadedAiFinished(''); selectImage(event, setUploadedAiSource, setUploadedAiName, false); }} /></label>
          <button type="button" onClick={finishUploadedAi} disabled={!uploadedAiSource || !config?.paidGenerationEnabled || uploadedAiFinishing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{uploadedAiFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />} Apply Cinema Film Finish</button>
        </div>{uploadedAiName && <p className="mt-2 text-xs text-slate-300">{uploadedAiName}</p>}{uploadedAiError && <p className="mt-2 text-xs text-rose-300">{uploadedAiError}</p>}{uploadedAiSource && <div className="mt-4 grid max-w-2xl grid-cols-2 gap-3"><figure><img src={uploadedAiSource} alt="AI source before finish" className="aspect-[4/5] w-full rounded-xl object-cover" /><figcaption className="mt-1 text-xs">Before (original)</figcaption></figure><figure>{uploadedAiFinished ? <img src={uploadedAiFinished} alt="AI image after finish" className="aspect-[4/5] w-full rounded-xl object-cover" /> : <div className="grid aspect-[4/5] place-items-center rounded-xl bg-slate-900 text-xs text-slate-500">After belum dibuat</div>}<figcaption className="mt-1 text-xs">After (opsional)</figcaption></figure></div>}</section>
      </main>
    </div>
  );
}
