import type { FalRunner } from './types.ts';
import { SEEDREAM_MODEL_ID } from './types.ts';

export function buildSeedreamFinishInput(imageUrl: string, finishingPrompt: string): Record<string, unknown> {
  return {
    prompt: finishingPrompt,
    image_urls: [imageUrl],
    image_size: { width: 1024, height: 1280 },
    num_images: 1,
    output_format: 'png',
  };
}

export async function applySeedreamFinish(runner: FalRunner, imageUrl: string, finishingPrompt: string) {
  let enqueuedRequestId: string | undefined;
  const result = await runner.subscribe(SEEDREAM_MODEL_ID, {
    input: buildSeedreamFinishInput(imageUrl, finishingPrompt),
    onEnqueue: (requestId) => { enqueuedRequestId = requestId; },
  });
  const outputUrl = result.data?.images?.[0]?.url || result.images?.[0]?.url;
  if (!outputUrl) throw new Error('Seedream 5.0 Pro selesai tanpa URL gambar.');
  return {
    modelId: SEEDREAM_MODEL_ID,
    imageUrl: outputUrl,
    requestId: enqueuedRequestId || result.requestId || result.request_id,
  };
}
