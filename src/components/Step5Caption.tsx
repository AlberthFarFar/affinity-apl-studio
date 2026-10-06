import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Sparkles,
  Heart,
  TrendingUp,
  Crown,
  Share2,
} from 'lucide-react';
import { CaptionsData, ProjectData } from '../types';

interface Step5CaptionProps {
  project: ProjectData;
  captions: CaptionsData | null;
  setCaptions: React.Dispatch<React.SetStateAction<CaptionsData | null>>;
}

export const Step5Caption: React.FC<Step5CaptionProps> = ({
  project,
  captions,
  setCaptions,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerateCaptions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghasilkan caption');
      }

      setCaptions(json.captions || json.data);
    } catch (err: any) {
      console.error('Caption generation error:', err);
      // Fallback editorial captions
      setCaptions({
        primaryCaption: `Sebuah standar baru kenyamanan hidup modern hadir di ${project.name || 'Agung Podomoro'}. Dirancang dengan fasad kontemporer dan tata ruang lapang untuk menyambut momen terbaik bersama keluarga tercinta.`,
        shortCaption: `Temukan hunian impian Anda di ${project.name || 'kawasan prestisius kami'}. Hubungi kami untuk jadwal visit.`,
        callToAction: `Klik tautan di bio atau kirimkan DM untuk penawaran eksklusif minggu ini.`,
        hashtags: ['#AgungPodomoroLand', '#RumahImpian', '#PropertiIndonesia', '#InvestasiProperti', '#RumahMewah'],
        storytelling: `Kisah tentang rumah bukan sekadar tentang empat dinding dan atap megah. Ini tentang tawa anak-anak yang berlarian di ruang keluarga, aroma sarapan pagi yang hangat, dan ketenangan saat melangkah pulang setelah hari yang panjang.\n\nDi ${project.name || 'Parkland Podomoro'}, setiap sudut dirancang dengan sirkulasi udara alami dan pencahayaan terbaik. Fasad kontemporer yang abadi siap menyambut awal perjalanan baru keluarga tercinta Anda.\n\n✨ Unit Siap Huni 2026\n🌿 Akses Clubhouse & Taman Hijau Terpadu\n🏷️ ${project.price || 'Mulai 800 Jutaan'}\n\nJadwalkan private visit Anda sekarang melalui WhatsApp di bio!\n\n#RumahImpian #AgungPodomoroLand #LivingInStyle #KeluargaBahagia #InvestasiProperti`,
        softselling: `Punya rumah impian di kawasan prestisius tidak harus menunggu nanti. ${project.name || 'Unit ini'} hadir dengan promo kemudahan kepemilikan yang sayang dilewatkan:\n\n✅ Free PPN 100%\n✅ Free BPHTB & AJB\n✅ Subsidi DP & Angsuran Ringan\n✅ Lokasi Strategis di ${project.location || 'Pusat Kota'}\n\nUnit sangat terbatas untuk fase peluncuran ini. Klik link di bio atau kirim DM untuk katalog e-brochure lengkap!\n\n#PromoProperti #RumahSiapHuni #FreePPN #SmartLiving #AgungPodomoro`,
        luxuryEditorial: `A Symphony of Modern Architecture & Timeless Prestige.\n\n${project.name || 'Affinity Residence'} merefleksikan standar hidup berkelas bagi Anda yang menghargai kesempurnaan detail arsitektur dan privasi tanpa batas.\n\nExclusive cluster with private clubhouse and 24/7 smart security.\n\nInquiries & Private Viewing:\n📞 ${project.contactPhone || '0822-8988-3888'}\n🌐 ${project.website || 'www.agungpodomoro.com'}\n\n#ExclusiveLiving #LuxuryRealEstate #ArchitectureLovers #MasterpieceLiving`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Social Media Copywriting</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Copywriting Caption Instagram Properti
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hasilkan 3 gaya narasi profesional siap unggah untuk feed atau carousel Instagram.
            </p>
          </div>

          <button
            onClick={handleGenerateCaptions}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menulis Caption (GPT-5 fal.ai)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Hasilkan Caption Instagram (GPT-5)</span>
              </>
            )}
          </button>
        </div>

        {/* Captions Display Cards */}
        {captions ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-5 animate-fade-in">
            {/* 1. Storytelling */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500" />
                    Gaya Storytelling (Hangat)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(captions.storytelling || captions.primaryCaption || '', 'story')}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 text-xs flex items-center gap-1"
                    title="Salin caption"
                  >
                    {copiedKey === 'story' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {captions.storytelling || captions.primaryCaption}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(captions.storytelling || captions.primaryCaption || '', 'story')}
                className="mt-4 w-full py-2 rounded-xl border border-slate-300 hover:bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedKey === 'story' ? (
                  <span className="text-emerald-700 font-bold">Tersalin ke Clipboard!</span>
                ) : (
                  <span>Salin Gaya Storytelling</span>
                )}
              </button>
            </div>

            {/* 2. Soft Selling */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Gaya Soft Selling (Promo)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(captions.softselling || captions.shortCaption || '', 'soft')}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 text-xs flex items-center gap-1"
                    title="Salin caption"
                  >
                    {copiedKey === 'soft' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {captions.softselling || captions.shortCaption}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(captions.softselling || captions.shortCaption || '', 'soft')}
                className="mt-4 w-full py-2 rounded-xl border border-slate-300 hover:bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedKey === 'soft' ? (
                  <span className="text-emerald-700 font-bold">Tersalin ke Clipboard!</span>
                ) : (
                  <span>Salin Gaya Soft Selling</span>
                )}
              </button>
            </div>

            {/* 3. Luxury Editorial */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Gaya Luxury Editorial
                  </h4>
                  <button
                    onClick={() => copyToClipboard(captions.luxuryEditorial || captions.callToAction || '', 'lux')}
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 text-xs flex items-center gap-1"
                    title="Salin caption"
                  >
                    {copiedKey === 'lux' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {captions.luxuryEditorial || captions.callToAction}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(captions.luxuryEditorial || captions.callToAction || '', 'lux')}
                className="mt-4 w-full py-2 rounded-xl border border-slate-300 hover:bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedKey === 'lux' ? (
                  <span className="text-emerald-700 font-bold">Tersalin ke Clipboard!</span>
                ) : (
                  <span>Salin Gaya Luxury</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Share2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Klik tombol "Hasilkan Caption Instagram" untuk membuat 3 variasi narasi iklan.</p>
          </div>
        )}
      </div>
    </div>
  );
};
