import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CompiledScene, DryRunInput, LabPresetLibrary, LabStyle } from './types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRESET_PATH = path.resolve(__dirname, '../../src/features/visual-style-test-lab/visual-style-test-presets.v1.json');

let cachedLibrary: LabPresetLibrary | undefined;

export function loadPresetLibrary(): LabPresetLibrary {
  if (!cachedLibrary) {
    const parsed = JSON.parse(fs.readFileSync(PRESET_PATH, 'utf8')) as LabPresetLibrary;
    validatePresetLibrary(parsed);
    cachedLibrary = parsed;
  }
  return cachedLibrary;
}

export function validatePresetLibrary(library: LabPresetLibrary): void {
  if (!library || library.styles?.length !== 5) {
    throw new Error('Preset Visual Style Lab harus memuat tepat 5 style.');
  }
  if (!library.finishing_prompt?.trim()) throw new Error('Preset tidak memiliki finishing_prompt.');

  const styleIds = new Set<string>();
  const sceneIds = new Set<string>();
  for (const style of library.styles) {
    if (!style.id?.trim() || styleIds.has(style.id)) throw new Error(`Style ID tidak valid/duplikat: ${style.id || '(kosong)'}.`);
    styleIds.add(style.id);
    if (style.scenes?.length !== 5) throw new Error(`Style ${style.id} harus memuat tepat 5 scene.`);
    style.scenes.forEach((scene, sceneOffset) => {
      if (scene.index !== sceneOffset + 1) throw new Error(`Urutan scene ${scene.id} tidak valid.`);
      if (!scene.id?.trim() || sceneIds.has(scene.id)) throw new Error(`Scene ID tidak valid/duplikat: ${scene.id || '(kosong)'}.`);
      if (!scene.compiled_prompt?.trim()) throw new Error(`compiled_prompt kosong untuk ${scene.id}.`);
      sceneIds.add(scene.id);
    });
  }
  if (sceneIds.size !== 25) throw new Error('Preset harus memuat tepat 25 scene unik.');
  if (library.run_policy.maximum_concurrency !== 2 || library.run_policy.scenes_per_style !== 5) {
    throw new Error('Run policy preset harus menetapkan 5 scene dan concurrency 2.');
  }
}

function normalizeFacts(facts: unknown): string[] {
  if (!Array.isArray(facts)) return [];
  return facts
    .filter((fact): fact is string => typeof fact === 'string')
    .map((fact) => fact.replace(/\s+/g, ' ').trim().slice(0, 240))
    .filter(Boolean)
    .slice(0, 8);
}

export function validateReferenceUrls(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) {
    throw new Error('Sertakan master property penuh sebagai referensi pertama; crop komposisi opsional sebagai referensi kedua.');
  }
  const urls = value.map((item) => typeof item === 'string' ? item.trim() : '');
  if (urls.some((url) => !/^(data:image\/(png|jpeg|webp);base64,|https?:\/\/)/i.test(url))) {
    throw new Error('Referensi harus berupa data URL gambar atau URL HTTP(S) yang valid.');
  }
  return urls;
}

export function getStyle(styleId: string): LabStyle {
  const style = loadPresetLibrary().styles.find((candidate) => candidate.id === styleId);
  if (!style) throw new Error(`Style preset tidak dikenal: ${styleId}.`);
  return style;
}

export function compileStylePreview(input: DryRunInput): {
  style: Pick<LabStyle, 'id' | 'name'>;
  scenes: CompiledScene[];
  referenceOrder: string[];
  expectedModelCalls: number;
  costEstimate: 'unknown';
} {
  const style = getStyle(input.styleId);
  const references = validateReferenceUrls(input.referenceUrls);
  const facts = normalizeFacts(input.verifiedFacts);
  const factsSuffix = facts.length
    ? `\n\nVERIFIED PROJECT FACTS (supporting facts only; do not override visible architectural evidence):\n${facts.map((fact) => `- ${fact}`).join('\n')}`
    : '';

  return {
    style: { id: style.id, name: style.name },
    scenes: style.scenes.map((scene) => ({
      index: scene.index,
      id: scene.id,
      name: scene.name,
      prompt: scene.compiled_prompt + factsSuffix,
    })),
    referenceOrder: references.map((_, index) => index === 0
      ? '1. Full master property image — architectural identity truth'
      : '2. Optional composition crop — framing aid only'),
    expectedModelCalls: 5,
    costEstimate: 'unknown',
  };
}
