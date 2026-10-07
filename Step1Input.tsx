import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Building2,
  Wand2,
  Users,
  Image as ImageIcon,
  Trash2,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle,
  FileCheck2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AIImageSource, ProjectData } from '../types';
import { SAMPLE_PRESETS } from '../utils/presets';
import { createMasterAIImage, readImageAsDataUrl } from '../utils/imageProcessing';
import { ProjectIntelligencePanel } from './ProjectIntelligencePanel';
import type { ProjectIntelligence } from '../types/projectIntelligence';

interface Step1InputProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  propertyImages: string[];
  setPropertyImages: React.Dispatch<React.SetStateAction<string[]>>;
  propertyImageDescriptions: Record<string, string>;
  setPropertyImageDescriptions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  styleImages: string[];
  setStyleImages: React.Dispatch<React.SetStateAction<string[]>>;
  talentImage: string | null;
  setTalentImage: React.Dispatch<React.SetStateAction<string | null>>;
  logoImage: string | null;
  setLogoImage: React.Dispatch<React.SetStateAction<string | null>>;
  setOriginalImages: React.Dispatch<React.SetStateAction<AIImageSource[]>>;
  onAnalyzeAndProceed: () => void;
  isAnalyzing: boolean;
  onApplyProjectIntelligence: (intelligence: ProjectIntelligence) => void;
}

export const Step1Input: React.FC<Step1InputProps> = ({
  project,
  setProject,
  propertyImages,
  setPropertyImages,
  propertyImageDescriptions,
  setPropertyImageDescriptions,
  styleImages,
  setStyleImages,
  talentImage,
  setTalentImage,
  logoImage,
  setLogoImage,
  setOriginalImages,
  onAnalyzeAndProceed,
  isAnalyzing,
  onApplyProjectIntelligence,
}) => {
  const propInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const talentInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const originalImagesRef = useRef(new Map<string, File>());
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => () => {
    for (const objectUrl of originalImagesRef.current.keys()) {
      if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    }
  }, []);

  // A local object URL is inserted before processing so users see their photo
  // immediately. It is then atomically replaced with masterAIImage.
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'property' | 'style' | 'talent' | 'logo'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsPreparingImages(true);
    setUploadError(null);

    try {
      if (type === 'property' || type === 'style') {
        const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));

        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const previewUrl = URL.createObjectURL(file);
          originalImagesRef.current.set(previewUrl, file);
          const setImages = type === 'property' ? setPropertyImages : setStyleImages;
          setImages((prev) => [...prev, previewUrl]);

          setUploadStatusText(`Menyiapkan gambar ${i + 1}/${fileList.length} (${file.name})...`);
          const masterAIImage = await createMasterAIImage(file);
          setUploadStatusText(`Mengoptimalkan master AI ${i + 1}/${fileList.length} tanpa crop...`);

          setImages((prev) => prev.map((image) => image === previewUrl ? masterAIImage : image));
          if (type === 'property') {
            setPropertyImageDescriptions((prev) => ({
              ...prev,
              [masterAIImage]: prev[previewUrl] || '',
            }));
          }
          originalImagesRef.current.delete(previewUrl);
          originalImagesRef.current.set(masterAIImage, file);
          setOriginalImages((prev) => [...prev, { originalImage: file, masterAIImage, role: type }]);
          URL.revokeObjectURL(previewUrl);
        }
      } else if (type === 'talent') {
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
          setUploadStatusText(`Mengoptimalkan foto talent (${file.name})...`);
          const masterAIImage = await createMasterAIImage(file);
          setTalentImage(masterAIImage);
          setOriginalImages((prev) => [...prev, { originalImage: file, masterAIImage, role: 'talent' }]);
        }
      } else if (type === 'logo') {
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
          setUploadStatusText(`Menyiapkan logo brand (${file.name})...`);
          const masterAIImage = await readImageAsDataUrl(file);
          setLogoImage(masterAIImage);
          setOriginalImages((prev) => [...prev, { originalImage: file, masterAIImage, role: 'logo' }]);
        }
      }
    } catch (err: any) {
      console.error('Error preparing local image:', err);
      const msg = err?.message || 'Gagal menyiapkan gambar lokal.';
      setUploadError(msg);
    } finally {
      setIsPreparingImages(false);
      setUploadStatusText(null);
      e.target.value = '';
    }
  };

  // Load sample preset demo
  const loadPreset = (presetId: string) => {
    const found = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!found) return;

    setProject({ ...found.project });

    // Generate a high-quality SVG mock facade for testing if user has not uploaded photo yet
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, 800);
      sky.addColorStop(0, '#38bdf8');
      sky.addColorStop(0.6, '#bae6fd');
      sky.addColorStop(1, '#f0f9ff');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 1080, 800);

      // Sun
      ctx.beginPath();
      ctx.arc(880, 220, 90, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
      ctx.fill();

      // Street & Landscaping
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 800, 1080, 550);

      // Sidewalk & Grass
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 760, 1080, 60);

      // House Body (Modern 2-Story Minimalist)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(180, 320, 720, 460);

      // Wood accent panel
      ctx.fillStyle = '#b45309';
      ctx.fillRect(560, 320, 280, 240);

      // Balcony glass railing
      ctx.fillStyle = 'rgba(186, 230, 253, 0.6)';
      ctx.fillRect(540, 480, 320, 90);
      ctx.strokeStyle = '#0284c7';
      ctx.strokeRect(540, 480, 320, 90);

      // Windows
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(240, 380, 180, 160);
      ctx.fillRect(240, 590, 140, 170);

      // Modern Entrance Door
      ctx.fillStyle = '#78350f';
      ctx.fillRect(440, 580, 120, 180);

      // Carport Canopy
      ctx.fillStyle = '#475569';
      ctx.fillRect(580, 580, 300, 20);

      // Architectural grid lines
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.strokeRect(180, 320, 720, 460);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const masterAIImage = await createMasterAIImage(blob);
        if (propertyImages.length === 0) {
          setPropertyImages([masterAIImage]);
          setPropertyImageDescriptions((prev) => ({
            ...prev,
            [masterAIImage]: 'Tampak depan / fasad utama properti',
          }));
        }
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset Quick-Fill Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Contoh Properti Siap Uji</span>
          </div>
          <h3 className="font-bold text-base sm:text-lg">Ingin langsung menguji alur tanpa unggah foto?</h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Muat template portofolio komersial Agung Podomoro Land untuk menguji generasi visual lifestyle, blueprint, video prompt, dan caption.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => loadPreset('podomoro-akasia')}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors shadow-sm"
          >
            Parkland Podomoro
          </button>
          <button
            onClick={() => loadPreset('kota-kertabumi')}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
          >
            Kota Kertabumi
          </button>
        </div>
      </div>

      {/* Local image preparation indicator / error banner */}
      {isPreparingImages && (
        <div role="status" aria-live="polite" className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-center gap-3 text-teal-900 shadow-xs animate-pulse">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-teal-950">Menyiapkan gambar lokal</p>
            <p className="text-teal-700">{uploadStatusText || 'Membuat master AI berkualitas tinggi...'}</p>
          </div>
        </div>
      )}

      {uploadError && (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-3 text-rose-900 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-rose-950">Gagal Menyiapkan Gambar</p>
            <p className="text-rose-700">{uploadError}</p>
          </div>
        </div>
      )}

      {/* 1. Visual References Card (Strict Separation of Roles) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 sm:p-7">
        <div className="border-b border-slate-100 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              1. Referensi Visual (Pemisahan Peran Input)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemisahan tegas antara bentuk bangunan fisik, arahan mood fotografi, dan karakter manusia.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 w-fit">
            Facade Lock Protected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Ref. Properti (Wajib - Structural Ground Truth) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white inline-flex items-center justify-center text-[10px]">
                  1
                </span>
                Ref. Properti (Wajib)
              </label>
              <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                Master Kebenaran
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Sumber kebenaran fasad &amp; site plan. Struktur ini dikunci 100%.
            </p>

            <div className="border-2 border-dashed border-teal-300/80 bg-teal-50/20 hover:bg-teal-50/50 rounded-xl p-4 min-h-[170px] flex flex-col items-center justify-center text-center transition-all group relative overflow-hidden">
              <input
                ref={propInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'property')}
              />

              {propertyImages.length === 0 ? (
                <button
                  type="button"
                  onClick={() => propInputRef.current?.click()}
                  disabled={isPreparingImages}
                  className="space-y-2 rounded-lg px-3 py-2 text-center disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-teal-100 flex items-center justify-center text-teal-700 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-teal-800 group-hover:underline">
                      Pilih Foto Fasad Rumah
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, atau WebP</p>
                  </div>
                </button>
              ) : (
                <div className="w-full space-y-2">
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {propertyImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative aspect-4/3 rounded-lg overflow-hidden border shadow-2xs group/img ${
                          idx === 0 ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img src={img} alt={`Fasad ${idx + 1}`} className="w-full h-full object-cover" />

                        {/* Role Badge */}
                        <div className="absolute top-1 left-1 bg-slate-900/85 text-teal-300 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          {idx === 0 ? '★ Fasad Utama' : `Sudut ${idx + 1}`}
                        </div>

                        <div className="absolute inset-x-1 bottom-1 z-10 text-left" onClick={(e) => e.stopPropagation()}>
                          <label className="sr-only" htmlFor={`property-description-${idx}`}>
                            Deskripsi gambar {idx + 1}
                          </label>
                          <input
                            id={`property-description-${idx}`}
                            type="text"
                            value={propertyImageDescriptions[img] || ''}
                            onChange={(e) => setPropertyImageDescriptions((prev) => ({
                              ...prev,
                              [img]: e.target.value,
                            }))}
                            placeholder={idx === 0 ? 'Cth: Tampak depan / fasad utama' : 'Cth: Area balkon lantai 2'}
                            className="w-full rounded bg-slate-950/85 border border-white/20 px-1.5 py-1 text-[9px] text-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-300"
                          />
                        </div>

                        {/* Action buttons on hover */}
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const reordered = [propertyImages[idx], ...propertyImages.filter((_, i) => i !== idx)];
                                setPropertyImages(reordered);
                              }}
                              className="px-1.5 py-0.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded text-[9px] font-bold w-full"
                            >
                              Jadikan Utama
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const target = propertyImages[idx];
                              setPropertyImages((prev) => prev.filter((_, i) => i !== idx));
                              setStyleImages((prev) => [...prev, target]);
                            }}
                            className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[9px] w-full"
                          >
                            → Pindah ke Gaya
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPropertyImages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[9px] w-full"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-teal-200">
                    <span className="font-semibold text-teal-800">
                      {propertyImages.length} foto fasad (PROPERTY_REFERENCE)
                    </span>
                    <button
                      type="button"
                      onClick={() => propInputRef.current?.click()}
                      disabled={isPreparingImages}
                      className="text-teal-700 hover:underline font-medium disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      + Tambah foto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Ref. Gaya (Opsional - Photography Mood / Lighting) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-[10px]">
                  2
                </span>
                Ref. Gaya (Opsional)
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Mood &amp; Fotografi</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Referensi pencahayaan, tone warna, komposisi sudut editorial.
            </p>

            <div className="border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50/40 hover:bg-slate-50 rounded-xl p-4 min-h-[170px] flex flex-col items-center justify-center text-center transition-all group">
              <input
                ref={styleInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'style')}
              />

              {styleImages.length === 0 ? (
                <button
                  type="button"
                  onClick={() => styleInputRef.current?.click()}
                  disabled={isPreparingImages}
                  className="space-y-2 rounded-lg px-3 py-2 text-center disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:scale-105 transition-transform">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-teal-700">
                      Unggah Gaya / Tone
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Golden hour, editorial, sudut drone</p>
                  </div>
                </button>
              ) : (
                <div className="w-full space-y-2">
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {styleImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-4/3 rounded-lg overflow-hidden border border-slate-200 shadow-2xs group/img"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img src={img} alt={`Gaya ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-slate-900/80 text-amber-300 text-[8px] font-bold px-1.5 py-0.5 rounded">
                          STYLE ONLY
                        </div>
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                          <button
                            type="button"
                            onClick={() => {
                              const target = styleImages[idx];
                              setStyleImages((prev) => prev.filter((_, i) => i !== idx));
                              setPropertyImages((prev) => [...prev, target]);
                            }}
                            className="px-1.5 py-0.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-[9px] w-full"
                          >
                            → Pindah ke Properti
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStyleImages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[9px] w-full"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">
                      {styleImages.length} referensi gaya (STYLE_REFERENCE)
                    </span>
                    <button
                      type="button"
                      onClick={() => styleInputRef.current?.click()}
                      disabled={isPreparingImages}
                      className="text-teal-700 hover:underline font-medium disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      + Tambah gaya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Ref. Talent & Logo Brand */}
          <div className="space-y-4">
            {/* Talent */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-[10px]">
                  3
                </span>
                Ref. Talent (Opsional)
              </label>
              <p className="text-[11px] text-slate-500">Karakter / model spesifik keluarga atau talenta.</p>

              <div className="flex items-center gap-3">
                <input
                  ref={talentInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'talent')}
                />
                <button
                  type="button"
                  onClick={() => talentInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {talentImage ? 'Ganti Talent' : 'Pilih Foto Talent'}
                </button>
                {talentImage ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-teal-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-teal-600" /> Terunggah
                    </span>
                    <button
                      onClick={() => setTalentImage(null)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="Hapus talent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">Belum ada</span>
                )}
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-[10px]">
                  4
                </span>
                Logo Brand (Opsional)
              </label>
              <p className="text-[11px] text-slate-500">Logo pengembang / watermark di poster final.</p>

              <div className="flex items-center gap-3">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'logo')}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  {logoImage ? 'Ganti Logo' : 'Pilih Logo PNG'}
                </button>
                {logoImage ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-teal-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-teal-600" /> Terpasang
                    </span>
                    <button
                      onClick={() => setLogoImage(null)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="Hapus logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">Belum ada</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProjectIntelligencePanel projectName={project.name} onApply={onApplyProjectIntelligence} />

      {/* 2. Facts & Property Data Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 sm:p-7">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-teal-600" />
          Fakta Properti &amp; Data Komersial
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Proyek / Properti <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={project.name}
              onChange={(e) => setProject({ ...project, name: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              placeholder="Cth: Parkland Podomoro Karawang"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipe / Cluster / Unit
            </label>
            <input
              type="text"
              value={project.type}
              onChange={(e) => setProject({ ...project, type: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              placeholder="Cth: Cluster Akasia Emory (Tipe 45/90)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Harga (Mulai dari)
            </label>
            <input
              type="text"
              value={project.price}
              onChange={(e) => setProject({ ...project, price: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              placeholder="Cth: Rp 850 Juta"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lokasi / Kawasan
            </label>
            <input
              type="text"
              value={project.location}
              onChange={(e) => setProject({ ...project, location: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              placeholder="Cth: Karawang Barat, 5 Menit Exit Tol"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fasilitas &amp; Promo Kunci (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={project.features}
              onChange={(e) => setProject({ ...project, features: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              placeholder="Cth: Free PPN 100%, Serah Terima 2026, Club House Mewah, Danau Alami"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor WhatsApp Pemasaran
            </label>
            <input
              type="text"
              value={project.contactPhone}
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => setProject({ ...project, contactPhone: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              placeholder="Cth: 0822-8988-3888"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Website Resmi
            </label>
            <input
              type="text"
              value={project.website}
              onChange={(e) => setProject({ ...project, website: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              placeholder="Cth: www.parklandpodomoro.com"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 text-slate-400" />
          <span>Ref. Properti wajib diunggah untuk melanjutkan ke analisis Master.</span>
        </div>

        <button
          onClick={onAnalyzeAndProceed}
          disabled={propertyImages.length === 0 || isAnalyzing || isPreparingImages}
          className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
            propertyImages.length === 0 || isAnalyzing || isPreparingImages
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-700/20 hover:shadow-md'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Menganalisis Master Properti (GPT-5 fal.ai)...</span>
            </>
          ) : (
            <>
              <span>Analisis Referensi &amp; Lanjut</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
