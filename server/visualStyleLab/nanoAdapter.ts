import type { CompiledScene, FalRunner, SlideGenerationResult } from './types.ts';
import { NANO_MODEL_ID } from './types.ts';

export interface NanoRequest {
  scene: CompiledScene;
  referenceUrls: string[];
}

export function buildNanoInput(request: NanoRequest): Record<string, unknown> {
  return {
    prompt: request.scene.prompt,
    image_urls: [...request.referenceUrls],
    aspect_ratio: '4:5',
    resolution: '2K',
    num_images: 1,
    output_format: 'png',
  };
}

export async function generateNanoSlide(runner: FalRunner, request: NanoRequest): Promise<SlideGenerationResult> {
  let enqueuedRequestId: string | undefined;
  try {
    const result = await runner.subscribe(NANO_MODEL_ID, {
      input: buildNanoInput(request),
      onEnqueue: (requestId) => { enqueuedRequestId = requestId; },
    });
    const imageUrl = result.data?.images?.[0]?.url || result.images?.[0]?.url;
    if (!imageUrl) throw new Error('Nano Banana Pro selesai tanpa URL gambar.');
    return {
      sceneId: request.scene.id,
      sceneIndex: request.scene.index,
      sceneName: request.scene.name,
      modelId: NANO_MODEL_ID,
      status: 'succeeded',
      imageUrl,
      requestId: enqueuedRequestId || result.requestId || result.request_id,
    };
  } catch (error) {
    return {
      sceneId: request.scene.id,
      sceneIndex: request.scene.index,
      sceneName: request.scene.name,
      modelId: NANO_MODEL_ID,
      status: 'failed',
      requestId: enqueuedRequestId,
      error: error instanceof Error ? error.message : 'Generasi Nano Banana Pro gagal.',
    };
  }
}
