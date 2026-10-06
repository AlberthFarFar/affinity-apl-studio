import React, { useState } from 'react';
import { X, Check, Type, Sparkles } from 'lucide-react';
import { BlueprintSlide } from '../types';

interface TextEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide: BlueprintSlide | null;
  onSave: (updatedSlide: BlueprintSlide, font: 'cormorant' | 'cinzel' | 'playfair' | 'jakarta') => void;
}

export const TextEditModal: React.FC<TextEditModalProps> = ({
  isOpen,
  onClose,
  slide,
  onSave,
}) => {
  if (!isOpen || !slide) return null;

  const [headline, setHeadline] = useState(slide.headline);
  const [copy, setCopy] = useState(slide.copy);
  const [subtext, setSubtext] = useState(slide.subtext || '');
  const [font, setFont] = useState<'cormorant' | 'cinzel' | 'playfair' | 'jakarta'>('cormorant');

  const handleSave = () => {
    onSave(
      {
        ...slide,
        headline,
        copy,
        subtext,
      },
      font
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-base text-slate-900">
              Edit Tipografi Poster — Slide {slide.index + 1}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Gaya Font Headline
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFont('cormorant')}
                className={`p-2.5 rounded-lg border text-left font-serif ${
                  font === 'cormorant'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm">Cormorant Garamond</span>
                <span className="text-[10px] text-slate-500">Klasik Mewah &amp; Elegan</span>
              </button>
              <button
                type="button"
                onClick={() => setFont('cinzel')}
                className={`p-2.5 rounded-lg border text-left font-serif ${
                  font === 'cinzel'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm">Cinzel Display</span>
                <span className="text-[10px] text-slate-500">Agung &amp; Tegas</span>
              </button>
              <button
                type="button"
                onClick={() => setFont('playfair')}
                className={`p-2.5 rounded-lg border text-left font-serif ${
                  font === 'playfair'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm">Playfair Display</span>
                <span className="text-[10px] text-slate-500">Editorial Fashion</span>
              </button>
              <button
                type="button"
                onClick={() => setFont('jakarta')}
                className={`p-2.5 rounded-lg border text-left font-sans ${
                  font === 'jakarta'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm">Plus Jakarta Sans</span>
                <span className="text-[10px] text-slate-500">Modern Minimalis</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Headline Utama
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              placeholder="Contoh: Your Future Home is Ready"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Body Copy / Narasi Pendek
            </label>
            <textarea
              rows={3}
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              placeholder="Contoh: Tak perlu menunggu lebih lama. Datang dan lihat langsung unit siap huni."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sub-tag / Kicker Atas
            </label>
            <input
              type="text"
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              placeholder="Contoh: Klaster Akasia Emory • Serah Terima 2026"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm shadow-teal-700/20 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Simpan &amp; Render Ulang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
