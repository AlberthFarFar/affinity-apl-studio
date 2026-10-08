import { useEffect, useMemo, useState } from 'react';
import ReactCrop, { type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { createCroppedImageFile } from '../../utils/imageCrop';
import type { ImageCropMetadata } from '../../types';

type Preset = { label: string; aspect?: number };

const PRESETS: Preset[] = [
  { label: 'Free' },
  { label: 'Original', aspect: undefined },
  { label: '1:1', aspect: 1 },
  { label: '4:3', aspect: 4 / 3 },
  { label: '4:5', aspect: 4 / 5 },
  { label: '16:9', aspect: 16 / 9 },
  { label: '9:16', aspect: 9 / 16 },
];

interface ImageCropModalProps {
  file: File;
  currentIndex: number;
  total: number;
  initialCrop?: ImageCropMetadata;
  onCancel: () => void;
  onSave: (crop: ImageCropMetadata, croppedFile: File) => Promise<void> | void;
}

const fullCrop: PercentCrop = { unit: '%', x: 0, y: 0, width: 100, height: 100 };

export function ImageCropModal({ file, currentIndex, total, initialCrop, onCancel, onSave }: ImageCropModalProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [crop, setCrop] = useState<PercentCrop>(initialCrop || fullCrop);
  const [imageAspect, setImageAspect] = useState<number>();
  const [selectedPreset, setSelectedPreset] = useState(initialCrop?.aspect ? 'Custom' : 'Free');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const activeAspect = useMemo(() => {
    if (selectedPreset === 'Original') return imageAspect;
    return PRESETS.find((preset) => preset.label === selectedPreset)?.aspect;
  }, [imageAspect, selectedPreset]);

  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset.label);
    setCrop(fullCrop);
  };

  const saveCrop = async (nextCrop: PercentCrop) => {
    const normalized: ImageCropMetadata = {
      unit: '%',
      x: Number(nextCrop.x || 0),
      y: Number(nextCrop.y || 0),
      width: Number(nextCrop.width || 100),
      height: Number(nextCrop.height || 100),
      ...(activeAspect ? { aspect: activeAspect } : {}),
    };
    setIsSaving(true);
    setError(null);
    try {
      await onSave(normalized, await createCroppedImageFile(file, normalized));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan crop.');
      setIsSaving(false);
    }
  };

  const save = () => saveCrop(crop);

  const useFullImage = () => {
    setCrop(fullCrop);
    setSelectedPreset('Free');
    return saveCrop(fullCrop);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="context-crop-title">
      <div className="w-full max-w-4xl max-h-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-teal-700">Gambar {currentIndex} dari {total}</p>
              <h2 id="context-crop-title" className="text-lg font-bold text-slate-900">Atur Fokus Referensi</h2>
              <p className="mt-1 text-xs text-slate-500">Pilih area gambar yang paling penting agar Affinity memahami konteks referensi dengan lebih akurat.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2" aria-label="Preset rasio crop">
            {PRESETS.map((preset) => (
              <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${selectedPreset === preset.label ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400'}`}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="max-h-[58vh] overflow-auto rounded-xl bg-slate-950 p-2 text-center">
            {previewUrl && (
              <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} aspect={activeAspect} ruleOfThirds keepSelection className="max-w-full">
                <img src={previewUrl} alt="Pratinjau crop referensi" className="max-h-[54vh] max-w-full object-contain" onLoad={(event) => setImageAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)} />
              </ReactCrop>
            )}
          </div>

          {crop.width > 0 && crop.height > 0 && crop.width * crop.height < 400 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Area crop sangat sempit. Pertahankan cukup konteks agar struktur objek tetap dapat dianalisis.</p>
          )}
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              <button type="button" onClick={() => { setCrop(fullCrop); setSelectedPreset('Free'); }} disabled={isSaving} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Reset</button>
              <button type="button" onClick={useFullImage} disabled={isSaving} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Gunakan Gambar Penuh</button>
            </div>
            <div className="flex gap-2 sm:justify-end">
              <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Batal</button>
              <button type="button" onClick={save} disabled={isSaving || !crop.width || !crop.height} className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-50">{isSaving ? 'Menyimpan...' : currentIndex < total ? 'Simpan & Berikutnya' : 'Simpan Crop'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
