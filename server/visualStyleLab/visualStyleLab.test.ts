import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildNanoInput } from './nanoAdapter.ts';
import { compileStylePreview, loadPresetLibrary } from './presets.ts';
import { buildSeedreamFinishInput } from './seedreamAdapter.ts';
import { finishImage, FINISH_CONFIRMATION, generateStyle, GENERATE_CONFIRMATION, retryScene, RETRY_CONFIRMATION } from './service.ts';
import { resolveVisualStyleLabFlags } from './routes.ts';
import { NANO_MODEL_ID, SEEDREAM_MODEL_ID, type FalRunner } from './types.ts';

const master = 'data:image/png;base64,bWFzdGVy';
const crop = 'data:image/jpeg;base64,Y3JvcA==';

test('authoritative library contains exactly 5 styles and 25 unique non-empty prompts', () => {
  const library = loadPresetLibrary();
  assert.equal(library.styles.length, 5);
  assert.equal(new Set(library.styles.flatMap((style) => style.scenes.map((scene) => scene.id))).size, 25);
  assert.equal(library.styles.flatMap((style) => style.scenes).every((scene) => scene.compiled_prompt.trim().length > 0), true);
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const finishFile = fs.readFileSync(path.resolve(dirname, '../../src/features/visual-style-test-lab/SEEDREAM_FINISH_ONLY_PROMPT.txt'), 'utf8').trim();
  assert.equal(library.finishing_prompt, finishFile);
});

test('prompt compilation is deterministic and only appends normalized verified facts', () => {
  const input = { styleId: 'lifestyle_film', referenceUrls: [master, crop], verifiedFacts: ['  Bangunan   2 lantai  '] };
  const first = compileStylePreview(input);
  const second = compileStylePreview(input);
  assert.deepEqual(first, second);
  assert.equal(first.scenes.length, 5);
  assert.match(first.scenes[0].prompt, /Bangunan 2 lantai$/);
  assert.deepEqual(first.referenceOrder, [
    '1. Full master property image — architectural identity truth',
    '2. Optional composition crop — framing aid only',
  ]);
});

test('Nano uses 5 independent payloads, shared ordered references, distinct prompts, concurrency <= 2, and preserves partial failures', async () => {
  let active = 0;
  let maximumActive = 0;
  let call = 0;
  const seen: Array<{ modelId: string; input: Record<string, unknown> }> = [];
  const runner: FalRunner = {
    subscribe: async (modelId, options) => {
      const index = call++;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      seen.push({ modelId, input: options.input });
      options.onEnqueue?.(`nano-${index}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      if (index === 2) throw new Error('mock slide failure');
      return { data: { images: [{ url: `https://example.test/${index}.png` }] } };
    },
  };
  const results = await generateStyle(runner, {
    styleId: 'sunrise_sunset', referenceUrls: [master, crop], confirmation: GENERATE_CONFIRMATION,
  });
  assert.equal(seen.length, 5);
  assert.equal(maximumActive <= 2, true);
  assert.equal(seen.every((entry) => entry.modelId === NANO_MODEL_ID), true);
  assert.equal(new Set(seen.map((entry) => entry.input.prompt)).size, 5);
  seen.forEach((entry) => assert.deepEqual(entry.input.image_urls, [master, crop]));
  seen.forEach((entry) => assert.deepEqual(
    { aspect_ratio: entry.input.aspect_ratio, resolution: entry.input.resolution, num_images: entry.input.num_images, output_format: entry.input.output_format },
    { aspect_ratio: '4:5', resolution: '2K', num_images: 1, output_format: 'png' },
  ));
  assert.equal(results.filter((result) => result.status === 'succeeded').length, 4);
  assert.equal(results.filter((result) => result.status === 'failed').length, 1);
});

test('individual retry makes exactly one Nano call', async () => {
  let calls = 0;
  const runner: FalRunner = { subscribe: async (modelId, options) => {
    calls += 1;
    assert.equal(modelId, NANO_MODEL_ID);
    options.onEnqueue?.('retry-1');
    return { data: { images: [{ url: 'https://example.test/retry.png' }] } };
  } };
  const result = await retryScene(runner, {
    styleId: 'family_connection', sceneId: 'family_connection-03', referenceUrls: [master], confirmation: RETRY_CONFIRMATION,
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'succeeded');
});

test('Seedream is finish-only, requires confirmation, and uses its current edit schema', async () => {
  let observedModel = '';
  let observedInput: Record<string, unknown> = {};
  const runner: FalRunner = { subscribe: async (modelId, options) => {
    observedModel = modelId;
    observedInput = options.input;
    return { requestId: 'finish-1', data: { images: [{ url: 'https://example.test/finished.png' }] } };
  } };
  await assert.rejects(() => finishImage(runner, { imageUrl: master, confirmation: 'wrong' }), /Konfirmasi/);
  const result = await finishImage(runner, { imageUrl: master, confirmation: FINISH_CONFIRMATION });
  assert.equal(observedModel, SEEDREAM_MODEL_ID);
  assert.deepEqual(observedInput, buildSeedreamFinishInput(master, loadPresetLibrary().finishing_prompt));
  assert.equal('aspect_ratio' in observedInput, false);
  assert.equal('resolution' in observedInput, false);
  assert.equal(result.imageUrl, 'https://example.test/finished.png');
});

test('paid generation defaults off and is impossible in production without auth', () => {
  assert.deepEqual(resolveVisualStyleLabFlags({ NODE_ENV: 'development' }), { labEnabled: true, paidGenerationEnabled: false });
  assert.deepEqual(resolveVisualStyleLabFlags({ NODE_ENV: 'production', VISUAL_STYLE_LAB_ENABLED: 'true', VISUAL_STYLE_LAB_PAID_GENERATION_ENABLED: 'true' }), { labEnabled: true, paidGenerationEnabled: false });
});

test('payload helper never combines scenes into num_images 5', () => {
  const preview = compileStylePreview({ styleId: 'modern_professional', referenceUrls: [master] });
  const payload = buildNanoInput({ scene: preview.scenes[0], referenceUrls: [master] });
  assert.equal(payload.num_images, 1);
});
