import type { ImageCropMetadata } from '../types';

const MAX_CROP_LONG_EDGE = 8192;

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Converts the persisted percentage crop to coordinates in the source image. */
export function cropPercentToPixels(
  crop: ImageCropMetadata,
  sourceWidth: number,
  sourceHeight: number,
): PixelCrop {
  const x = Math.max(0, Math.min(sourceWidth, (crop.x / 100) * sourceWidth));
  const y = Math.max(0, Math.min(sourceHeight, (crop.y / 100) * sourceHeight));
  const width = Math.max(1, Math.min(sourceWidth - x, (crop.width / 100) * sourceWidth));
  const height = Math.max(1, Math.min(sourceHeight - y, (crop.height / 100) * sourceHeight));

  return { x, y, width, height };
}

/**
 * Crops before any later master-image optimisation. The 8192px guard prevents
 * giant phone photos from allocating an unsafe canvas while retaining detail
 * well above the downstream 3840px master-image limit.
 */
export async function createCroppedImageFile(
  source: File,
  crop: ImageCropMetadata,
): Promise<File> {
  if (!source.type.startsWith('image/')) {
    throw new Error('File yang dipilih bukan gambar yang didukung.');
  }

  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = await loadImage(sourceUrl);
    const pixelCrop = cropPercentToPixels(crop, image.naturalWidth, image.naturalHeight);
    const cropLongEdge = Math.max(pixelCrop.width, pixelCrop.height);
    const scale = cropLongEdge > MAX_CROP_LONG_EDGE ? MAX_CROP_LONG_EDGE / cropLongEdge : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(pixelCrop.width * scale));
    canvas.height = Math.max(1, Math.round(pixelCrop.height * scale));
    const context = canvas.getContext('2d');

    if (!context) throw new Error('Canvas crop tidak tersedia di browser ini.');

    context.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const mimeType = source.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, mimeType, 0.95);
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = source.name.replace(/\.[^.]+$/, '') + `-crop.${extension}`;
    return new File([blob], filename, { type: mimeType, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal membuat hasil crop gambar.'));
    }, type, quality);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Format gambar tidak dapat diproses.'));
    image.src = source;
  });
}
