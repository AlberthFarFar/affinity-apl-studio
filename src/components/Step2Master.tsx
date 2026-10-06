import React, { useState } from 'react';
import {
  Lock,
  CheckCircle,
  ShieldCheck,
  Building,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Crop,
  Info,
} from 'lucide-react';
import { MasterAnalysis, ProjectData, PropertyReferenceMeta, BuildingMask } from '../types';

interface Step2MasterProps {
  analysis: MasterAnalysis | null;
  propertyImage: string;
  project: ProjectData;
  masterLocked: boolean;
  propertyMeta?: PropertyReferenceMeta;
  setPropertyMeta?: React.Dispatch<React.SetStateAction<PropertyReferenceMeta>>;
  onLockMaster: () => void;
  onBack: () => void;
}

export const Step2Master: React.FC<Step2MasterProps> = ({
  analysis,
  propertyImage,
  project,
  masterLocked,
  propertyMeta,
  setPropertyMeta,
  onLockMaster,
  onBack,
}) => {
  const [showMaskEditor, setShowMaskEditor] = useState<boolean>(false);

  // Default mask values
  const currentMask: BuildingMask = propertyMeta?.protectedAreaMask || {
    x: 12,
    y: 20,
    width: 76,
    height: 60,
    featherPx: 12,
    label: 'Protected Facade Zone',
  };

  const handleUpdateMask = (updates: Partial<BuildingMask>) => {
    if (!setPropertyMeta || !propertyMeta) return;
    const newMask = { ...currentMask, ...updates };
    setPropertyMeta({
      ...propertyMeta,
      protectedAreaMask: newMask,
    });
  };

  // 8 Specific Protected Architectural Categories (Section 3 of Architectural Consistency Guard)
  const protectedCategories = [
    {
      title: 'Jumlah Lantai & Massa Bangunan',
      detail: propertyMeta?.architecturalElements?.storyCount
        ? `${propertyMeta.architecturalElements.storyCount} Lantai — ${propertyMeta.architecturalElements.massingShape}`
        : '2 Lantai — Footprint struktural & massa kubus proporsional',
    },
    {
      title: 'Siluet & Kemiringan Atap',
      detail: propertyMeta?.architecturalElements?.roofSilhouette || 'Bentuk pelana kontemporer, sudut kemiringan, dan tritisan atap',
    },
    {
      title: 'Proporsi Lebar & Tinggi Fasad',
      detail: 'Rasio geometris dimensi fasad horizontal terhadap vertikal',
    },
    {
      title: 'Posisi & Jumlah Pintu / Jendela',
      detail: propertyMeta?.architecturalElements?.windowDoorArrangement || 'Bukaan kaca lantai atas, jendela sudut bawah, dan pintu utama solid',
    },
    {
      title: 'Kolom, Balok, Balkon & Kanopi',
      detail: propertyMeta?.architecturalElements?.columnsAndBalconies || 'Struktur kolom penyangga, railing balkon lantai 2, dan kanopi carport',
    },
    {
      title: 'Carport, Pagar & Akses Masuk',
      detail: 'Area driveway paving, batas kavling, dan orientasi jalan masuk',
    },
    {
      title: 'Pola Material & Warna Utama Fasad',
      detail: propertyMeta?.architecturalElements?.materialsAndColors || 'Dinding plester putih, panel aksen kayu alami, kusen hitam',
    },
    {
      title: 'Perspektif & Garis Vertikal',
      detail: propertyMeta?.architecturalElements?.viewpointPerspective || 'Kamera normal eye-level 35mm tanpa distorsi perspektif',
    },
  ];

  const editableAreasList = propertyMeta?.editableAreas || [
    'Langit, awan, dan kondisi cuaca alami',
    'Pencahayaan sinar matahari dan bayangan tanah',
    'Lansekap tanaman hias dan rumput taman depan',
    'Talent manusia dan interaksi keluarga di halaman/teras',
    'Kendaraan modern di area carport/jalan',
    'Furniture luar ruangan yang dapat dipindahkan',
    'Grading warna fotografis tanpa distorsi objek fisik',
  ];

  return (
    <div className="space-y-6">
      {/* Hero Master Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none">
          <ShieldCheck className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>ARCHITECTURAL CONSISTENCY GUARD — MASTER GROUND TRUTH</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Penguncian Master Properti — {project.name || 'Proyek Hunian'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                Ref ID: {propertyMeta?.propertyId || 'prop_akasia'} • Versi v{propertyMeta?.referenceVersion || 1}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider inline-flex items-center gap-1.5 self-start sm:self-auto ${
                  masterLocked
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    : 'bg-teal-950 text-teal-300 border border-teal-500/30'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                {masterLocked ? 'GUARD AKTIF' : 'VERIFIKASI AWAL'}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-teal-500/30 text-xs text-slate-300 space-y-2">
            <p className="leading-relaxed">
              Foto properti di bawah ini ditetapkan sebagai <strong>Satu-satunya Sumber Kebenaran Geometri Bangunan</strong>.
              Seluruh slide carousel dan materi visual yang dihasilkan wajib mempertahankan identitas bangunan yang persis sama.
            </p>
            <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Catatan: Deskripsi elemen ini adalah catatan visual pelestarian arsitektur foto, bukan hasil pengukuran teknis atau sertifikasi struktur bangunan.
              </span>
            </p>
          </div>

          {/* Master Facade Preview & Mask Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Master Facade Thumbnail & Interactive Mask Box */}
            <div className="lg:col-span-5 bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Foto Fasad Asli (Tak Ditimpa)
                </span>
                <button
                  type="button"
                  onClick={() => setShowMaskEditor(!showMaskEditor)}
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>{showMaskEditor ? 'Tutup Editor Mask' : 'Inspeksi Mask Bangunan'}</span>
                </button>
              </div>

              {/* Facade Image with Protected Zone Overlay */}
              <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                <img
                  src={propertyImage}
                  alt="Master Facade Ground Truth"
                  className="w-full h-full object-cover"
                />

                {/* Visual Protected Area Mask Overlay */}
                <div
                  className="absolute border-2 border-dashed border-teal-400 bg-teal-500/15 pointer-events-none transition-all flex items-start justify-start p-1.5 shadow-lg"
                  style={{
                    left: `${currentMask.x}%`,
                    top: `${currentMask.y}%`,
                    width: `${currentMask.width}%`,
                    height: `${currentMask.height}%`,
                    borderRadius: `${currentMask.featherPx || 8}px`,
                  }}
                >
                  <span className="bg-teal-900/90 text-teal-200 text-[9px] font-bold px-1.5 py-0.5 rounded border border-teal-500/40 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Area Bangunan Terlindungi (Composited)</span>
                  </span>
                </div>

                <div className="absolute bottom-2 left-2 bg-slate-900/90 text-white text-[10px] px-2 py-0.5 rounded border border-slate-700 font-mono">
                  Ref: v{propertyMeta?.referenceVersion || 1} • Front Facade
                </div>
              </div>

              {/* Mask Adjustment Controls if toggled */}
              {showMaskEditor && (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-2.5 text-[11px]">
                  <span className="font-bold text-teal-300 block">Kalibrasi Zona Mask Bangunan</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Posisi X ({currentMask.x}%):</span>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={currentMask.x}
                        onChange={(e) => handleUpdateMask({ x: Number(e.target.value) })}
                        className="w-full accent-teal-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Posisi Y ({currentMask.y}%):</span>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={currentMask.y}
                        onChange={(e) => handleUpdateMask({ y: Number(e.target.value) })}
                        className="w-full accent-teal-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Lebar ({currentMask.width}%):</span>
                      <input
                        type="range"
                        min="40"
                        max="100"
                        value={currentMask.width}
                        onChange={(e) => handleUpdateMask({ width: Number(e.target.value) })}
                        className="w-full accent-teal-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Tinggi ({currentMask.height}%):</span>
                      <input
                        type="range"
                        min="30"
                        max="100"
                        value={currentMask.height}
                        onChange={(e) => handleUpdateMask({ height: Number(e.target.value) })}
                        className="w-full accent-teal-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Mask ini digunakan dalam mode <strong>STRICT PRESERVE</strong> untuk memproteksi piksel bangunan asli melalui proses compositing kanvas.
                  </p>
                </div>
              )}
            </div>

            {/* Protected Elements Breakdown (8 Categories) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-800/70 rounded-xl p-4 border border-rose-900/40 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    Elemen Arsitektur Dilindungi (Dilarang Ubah)
                  </h3>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40">
                    8 Kategori Dilindungi
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {protectedCategories.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/60 space-y-0.5">
                      <span className="text-[11px] font-bold text-slate-200 block">
                        {idx + 1}. {item.title}
                      </span>
                      <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allowed Modifications Breakdown */}
              <div className="bg-slate-800/70 rounded-xl p-4 border border-teal-900/40 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Perubahan Yang Diizinkan (Kreativitas Lifestyle)
                  </h3>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/40">
                    Lingkungan &amp; Talent
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {editableAreasList.map((area, aIdx) => (
                    <div key={aIdx} className="flex items-start gap-1.5 text-[11px]">
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali &amp; Ganti Foto</span>
            </button>

            <button
              onClick={onLockMaster}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Kunci Guard &amp; Lanjut ke Carousel (Langkah 3)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
