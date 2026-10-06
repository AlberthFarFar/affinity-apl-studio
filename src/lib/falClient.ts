import { fal } from '@fal-ai/client';

// Configure the fal client to use the server-side proxy
// Frontend NEVER stores or exposes the FAL_KEY
fal.config({
  proxyUrl: '/api/fal/proxy',
});

/**
 * Upload an original image File or Blob directly to fal Storage CDN via server proxy.
 * Large binary NEVER passes through the Express/AI Studio backend JSON payload,
 * eliminating HTTP 413 Payload Too Large errors permanently.
 *
 * @param file Browser File or Blob object
 * @returns Public URL on fal CDN (e.g., https://v3.fal.media/files/...)
 */
export async function uploadToFalStorage(
  file: File | Blob
): Promise<string> {
  try {
    const fileUrl = await fal.storage.upload(file);
    if (!fileUrl || typeof fileUrl !== 'string') {
      throw new Error('fal Storage tidak mengembalikan URL publik yang valid.');
    }
    return fileUrl;
  } catch (error: any) {
    console.error('Fal Storage upload error:', error);
    const detail = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    throw new Error(`Gagal mengunggah ke fal Storage: ${detail}`);
  }
}

export { fal };
