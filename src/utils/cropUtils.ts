// ============================================================================
// Deterministic Facade Cropping & Re-framing Utility (Zero Generative Fill)
// ============================================================================

export type CropPosition = 'left' | 'center' | 'right' | 'custom';

export interface AspectRatioDimension {
  ratio: string;
  width: number;
  height: number;
  decimal: number;
}

export const ASPECT_RATIO_PRESETS: Record<string, AspectRatioDimension> = {
  '4:5': { ratio: '4:5', width: 1080, height: 1350, decimal: 4 / 5 },
  '9:16': { ratio: '9:16', width: 1080, height: 1920, decimal: 9 / 16 },
  '1:1': { ratio: '1:1', width: 1080, height: 1080, decimal: 1 / 1 },
  '16:9': { ratio: '16:9', width: 1920, height: 1080, decimal: 16 / 9 },
  '5:4': { ratio: '5:4', width: 1350, height: 1080, decimal: 5 / 4 },
};

/**
 * Deterministically crops an image to the exact target aspect ratio
 * without generative fill, geometric distortion, or resizing artifacts.
 */
export async function createLockedFacadeCrop(
  imageUrl: string,
  targetRatio: string = '4:5',
  position: CropPosition = 'center',
  customOffset: number = 0.5 // 0 = left/top, 0.5 = center, 1 = right/bottom
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      return reject(new Error('Image URL is empty'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const sw = img.naturalWidth || img.width;
        const sh = img.naturalHeight || img.height;

        const preset = ASPECT_RATIO_PRESETS[targetRatio] || ASPECT_RATIO_PRESETS['4:5'];
        const targetDecimal = preset.decimal;
        const srcDecimal = sw / sh;

        let cropX = 0;
        let cropY = 0;
        let cropW = sw;
        let cropH = sh;

        if (srcDecimal > targetDecimal) {
          // Source is wider than target ratio (e.g. landscape image to 4:5 portrait)
          cropH = sh;
          cropW = Math.round(sh * targetDecimal);

          const maxOffsetX = sw - cropW;
          if (position === 'left') {
            cropX = 0;
          } else if (position === 'right') {
            cropX = maxOffsetX;
          } else if (position === 'center') {
            cropX = Math.round(maxOffsetX / 2);
          } else {
            // custom
            const clamped = Math.max(0, Math.min(1, customOffset));
            cropX = Math.round(maxOffsetX * clamped);
          }
        } else if (srcDecimal < targetDecimal) {
          // Source is taller than target ratio
          cropW = sw;
          cropH = Math.round(sw / targetDecimal);

          const maxOffsetY = sh - cropH;
          if (position === 'left') {
            // top
            cropY = 0;
          } else if (position === 'right') {
            // bottom
            cropY = maxOffsetY;
          } else if (position === 'center') {
            cropY = Math.round(maxOffsetY / 2);
          } else {
            const clamped = Math.max(0, Math.min(1, customOffset));
            cropY = Math.round(maxOffsetY * clamped);
          }
        }

        // Target canvas resolution maintains crisp architectural sharpness
        const outW = preset.width;
        const outH = preset.height;

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;

        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) {
          return reject(new Error('Canvas 2D context not available'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw cropped section
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => {
      reject(new Error('Failed to load image for facade cropping'));
    };

    img.src = imageUrl;
  });
}
