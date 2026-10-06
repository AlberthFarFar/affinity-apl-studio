import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Clapperboard,
  Sparkles,
  ArrowRight,
  Clock,
  Smartphone,
  Layers,
  Info,
  UserCheck,
  Building,
  Box,
} from 'lucide-react';
import { ProjectData, MasterAnalysis, UGCPack } from '../types';

interface Step4VideoProps {
  project: ProjectData;
  masterAnalysis: MasterAnalysis | null;
  masterLocked: boolean;
  ugcPack: UGCPack | null;
  setUgcPack: React.Dispatch<React.SetStateAction<UGCPack | null>>;
  onProceedToCaption: () => void;
}

export const Step4Video: React.FC<Step4VideoProps> = ({
  project,
  masterAnalysis,
  masterLocked,
  ugcPack,
  setUgcPack,
  onProceedToCaption,
}) => {
  // Input Form States (Requirement #15)
  const [objective, setObjective] = useState('Consideration');
  const [platform, setPlatform] = useState('Instagram Reels');
  const [duration, setDuration] = useState('30 sec');
  const [talentPersona, setTalentPersona] = useState('Ibu muda milenial cerdas & stylish');
  const [targetAudience, setTargetAudience] = useState('Keluarga muda profesional yang mencari rumah pertama/upgrade');
  const [tone, setTone] = useState('Natural');
  const [formula, setFormula] = useState('Hook → Problem → Solution → CTA');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateUGCPack = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/generate-ugc-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          masterAnalysis,
          objective,
          platform,
          duration,
          talentPersona,
          targetAudience,
          tone,
          formula,
          additionalInstructions,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghasilkan materi UGC');
      }

      setUgcPack(json.pack);
    } catch (err: any) {
      console.error('UGC pack generation error:', err);
      setErrorMessage(err.message || 'Gagal menghasilkan UGC Script & Storyboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-7 space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Clapperboard className="w-4 h-4 text-teal-600" />
            <span>Production Blueprint — Ready for Google Flow</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            UGC Script &amp; Storyboard Studio
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Hasilkan materi pra-produksi lengkap untuk pembuatan video UGC autentik: Naskah percakapan bahasa Indonesia natural,
            storyboard multi-scene dengan arahan kamera, dan <strong>Google Flow Prompt Pack</strong> siap salin.
            <em> Tab ini tidak merender video di Affinity demi efisiensi biaya.</em>
          </p>
        </div>

        {/* UGC Production Inputs (Requirement #15) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Campaign Objective
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            >
              <option value="Awareness">Awareness (Pengenalan Proyek)</option>
              <option value="Consideration">Consideration (Edukasi &amp; Komparasi)</option>
              <option value="Lead Generation">Lead Generation (Ajakan DM/Kontak)</option>
              <option value="Sales">Sales (Promo Terbatas &amp; Booking)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Platform Target
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            >
              <option value="Instagram Reels">Instagram Reels (9:16)</option>
              <option value="TikTok">TikTok (9:16 Handheld)</option>
              <option value="YouTube Shorts">YouTube Shorts (9:16)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Durasi Video
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            >
              <option value="15 sec">15 Detik (Snackable / Fast Hook)</option>
              <option value="30 sec">30 Detik (Standard UGC Pacing)</option>
              <option value="45 sec">45 Detik (In-depth Walkthrough)</option>
              <option value="60 sec">60 Detik (Full Storytelling)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tone of Voice
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            >
              <option value="Natural">Natural (Teman Bercerita)</option>
              <option value="Testimonial">Testimonial (Pengalaman Nyata)</option>
              <option value="Aspirational">Aspirational (Gaya Hidup Impian)</option>
              <option value="Educational">Educational (Tips Memilih Hunian)</option>
              <option value="Soft Sell">Soft Sell (Kenyamanan Tanpa Paksaan)</option>
              <option value="Direct Response">Direct Response (Fokus Solusi Cepat)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              UGC Formula
            </label>
            <select
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
            >
              <option value="Hook → Problem → Solution → CTA">Hook → Problem → Solution → CTA (Paling Teruji)</option>
              <option value="Hook → Discovery → Experience → CTA">Hook → Discovery → Experience → CTA (Eksplorasi Santai)</option>
              <option value="Problem → Property → Proof → CTA">Problem → Property → Proof → CTA (Fokus Nilai Investasi)</option>
              <option value="Custom">Custom (Sesuai Karakter Master Properti)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Talent Persona
            </label>
            <input
              type="text"
              value={talentPersona}
              onChange={(e) => setTalentPersona(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              placeholder="Contoh: Ibu muda milenial, eksekutif muda, dsb."
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Instruksi Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              placeholder="Contoh: Tekankan promo Free PPN, fasilitas kolam renang anak, atau jalan lingkungan aspal rapi."
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
            {errorMessage}
          </div>
        )}

        {/* Generate Button */}
        <div className="pt-2 flex justify-start">
          <button
            onClick={handleGenerateUGCPack}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>GPT-5 Menyusun UGC &amp; Flow Prompts...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hasilkan Script, Storyboard &amp; Google Flow Pack (GPT-5)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* UGC Output Presentation (Requirement #16, #17, #18) */}
      {ugcPack && (
        <div className="space-y-6">
          {/* 1. Creative Strategy Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                1. Strategi Kreatif UGC ({duration})
              </h3>
              <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full border border-teal-200">
                Formula: {formula}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                  Audience Insight
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {ugcPack.strategy.audience_insight}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                  Big Idea
                </span>
                <p className="text-slate-600 leading-relaxed font-semibold text-teal-900">
                  {ugcPack.strategy.big_idea}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                  Hook Strategy (3 Detik Pertama)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {ugcPack.strategy.hook_strategy}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Full Spoken Script Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  2. Full Spoken Script ({ugcPack.full_script.title})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Bahasa lisan Indonesia santai, ritme percakapan natural untuk talent
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(ugcPack.full_script.spoken_script, 'full-script')}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedId === 'full-script' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Naskah</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-teal-50/40 rounded-xl p-4 border border-teal-100 space-y-2">
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                "{ugcPack.full_script.spoken_script}"
              </p>
              <div className="pt-2 border-t border-teal-100 text-[11px] text-teal-800">
                <strong>Catatan Penyampaian:</strong> {ugcPack.full_script.delivery_notes}
              </div>
            </div>
          </div>

          {/* 3. Ingredients Required Banner (Requirement #18) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Ingredients Required (Persiapan Aset Google Flow)</span>
            </div>
            <p className="text-xs text-slate-300">
              Sebelum menyalin prompt ke Google Flow, siapkan 3 elemen referensi berikut:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-white block">@Talent</span>
                  <span className="text-[11px] text-slate-300">
                    {ugcPack.ingredients_required.talent || 'Upload foto potret bersih talent yang konsisten'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 flex items-start gap-2.5">
                <Building className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-white block">@Property</span>
                  <span className="text-[11px] text-slate-300">
                    {ugcPack.ingredients_required.property || 'Upload foto Master Fasad properti asli'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 flex items-start gap-2.5">
                <Box className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-white block">@Product</span>
                  <span className="text-[11px] text-slate-300">
                    {ugcPack.ingredients_required.product || 'Opsional denah cluster atau brosur unit'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              *Affinity mempersiapkan prompt &amp; storyboard terstruktur. Anda dapat langsung copy-paste prompt di bawah ke Google Flow secara manual.
            </p>
          </div>

          {/* 4. Storyboard Grid & Google Flow Prompt Pack (Requirement #16 & #17) */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-600" />
              4. Storyboard Grid &amp; Google Flow Prompt Pack ({ugcPack.storyboard.length} Scene)
            </h3>

            <div className="grid grid-cols-1 gap-5">
              {ugcPack.storyboard.map((scene) => {
                const sId = `scene-${scene.scene_number}`;
                return (
                  <div
                    key={scene.scene_number}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5"
                  >
                    {/* Scene Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                          {scene.scene_number}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            Scene {scene.scene_number}: {scene.purpose}
                          </h4>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Durasi: {scene.duration}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => copyToClipboard(scene.google_flow_prompt, sId)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto border border-teal-500/20"
                      >
                        {copiedId === sId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Prompt Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Prompt Google Flow</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Scene Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Visual &amp; Aksi</span>
                        <p className="text-slate-800 font-medium">{scene.visual}</p>
                        <p className="text-slate-500 text-[11px]">Aksi: {scene.talent_action}</p>
                      </div>

                      <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 space-y-1">
                        <span className="text-[10px] font-bold text-teal-800 uppercase">Dialog / Voice Over</span>
                        <p className="text-slate-800 font-medium italic">"{scene.dialogue}"</p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Kamera &amp; Sudut</span>
                        <p className="text-slate-800 font-medium">{scene.camera_framing}</p>
                        <p className="text-slate-500 text-[11px]">Gerakan: {scene.camera_movement}</p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Lingkungan &amp; Cahaya</span>
                        <p className="text-slate-800 font-medium">{scene.environment}</p>
                        <p className="text-slate-500 text-[11px]">Cahaya: {scene.lighting}</p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Visibilitas Properti</span>
                        <p className="text-slate-800 font-medium">{scene.property_visibility}</p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Kontinuitas</span>
                        <p className="text-slate-800 font-medium">{scene.continuity_note}</p>
                      </div>
                    </div>

                    {/* Google Flow Prompt Box */}
                    <div className="bg-slate-950 text-slate-200 rounded-xl p-3.5 space-y-1.5 font-mono text-[11px] border border-slate-800">
                      <div className="flex items-center justify-between text-teal-400 font-bold uppercase text-[10px]">
                        <span>Google Flow Ready Prompt</span>
                        <span className="text-slate-400 font-normal">Reference Tags: @Talent @Property</span>
                      </div>
                      <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                        {scene.google_flow_prompt}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Next Step Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Langkah Terakhir: Copywriting Caption Instagram</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Buat narasi caption storytelling, CTA, dan hashtag pendukung untuk melengkapi materi kampanye.
          </p>
        </div>
        <button
          onClick={onProceedToCaption}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs shrink-0 transition-colors"
        >
          <span>Lanjut ke Copywriting Caption</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
