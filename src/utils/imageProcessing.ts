const MASTER_AI_LONG_EDGE = 3840;
const MASTER_AI_QUALITY = 0.92;

/**
 * Creates the high-quality working copy sent to AI. This deliberately only
 * resizes and re-encodes: it never crops, changes framing, or enhances pixels.
 */
export async function createMasterAIImage(file: Blob): Promise<string> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const longEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longEdge > MASTER_AI_LONG_EDGE ? MASTER_AI_LONG_EDGE / longEdge : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) throw new Error('Canvas image processor tidak tersedia.');

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', MASTER_AI_QUALITY);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function readImageAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca gambar lokal.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
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
