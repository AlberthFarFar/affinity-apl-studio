import { generateNanoSlide } from './nanoAdapter.ts';
import { compileStylePreview, getStyle, loadPresetLibrary, validateReferenceUrls } from './presets.ts';
import { applySeedreamFinish } from './seedreamAdapter.ts';
import type { DryRunInput, FalRunner, SlideGenerationResult } from './types.ts';

export const GENERATE_CONFIRMATION = 'GENERATE_5_NANO_BANANA_PRO';
export const RETRY_CONFIRMATION = 'RETRY_ONE_NANO_BANANA_PRO';
export const FINISH_CONFIRMATION = 'APPLY_ONE_SEEDREAM_FILM_FINISH';

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, maximum: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(maximum, tasks.length) }, worker));
  return results;
}

export function dryRun(input: DryRunInput) {
  return compileStylePreview(input);
}

export async function generateStyle(
  runner: FalRunner,
  input: DryRunInput & { confirmation: string },
): Promise<SlideGenerationResult[]> {
  if (input.confirmation !== GENERATE_CONFIRMATION) throw new Error('Konfirmasi berbayar Generate 5 tidak valid.');
  const referenceUrls = validateReferenceUrls(input.referenceUrls);
  const preview = compileStylePreview(input);
  return runWithConcurrency(
    preview.scenes.map((scene) => () => generateNanoSlide(runner, { scene, referenceUrls })),
    loadPresetLibrary().run_policy.maximum_concurrency,
  );
}

export async function retryScene(
  runner: FalRunner,
  input: DryRunInput & { sceneId: string; confirmation: string },
): Promise<SlideGenerationResult> {
  if (input.confirmation !== RETRY_CONFIRMATION) throw new Error('Konfirmasi berbayar retry tidak valid.');
  const referenceUrls = validateReferenceUrls(input.referenceUrls);
  const preview = compileStylePreview(input);
  const scene = preview.scenes.find((candidate) => candidate.id === input.sceneId);
  if (!scene || !getStyle(input.styleId).scenes.some((candidate) => candidate.id === input.sceneId)) {
    throw new Error('Scene tidak termasuk dalam style yang dipilih.');
  }
  return generateNanoSlide(runner, { scene, referenceUrls });
}

export async function finishImage(
  runner: FalRunner,
  input: { imageUrl: string; confirmation: string },
) {
  if (input.confirmation !== FINISH_CONFIRMATION) throw new Error('Konfirmasi berbayar Film Finish tidak valid.');
  const [imageUrl] = validateReferenceUrls([input.imageUrl]);
  return applySeedreamFinish(runner, imageUrl, loadPresetLibrary().finishing_prompt);
}
