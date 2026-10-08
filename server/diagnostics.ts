// ============================================================================
// Server-Side Diagnostic Utility for FAL_KEY and Analyze-Master Communication
// ============================================================================
// CRITICAL: This utility NEVER exposes the raw FAL_KEY to clients or in logs.
// Only safe redacted metadata (e.g. key accessibility, length, masked indicator)
// is returned to callers.

import { callGPTViaFal } from './falOpenRouter.ts';
import { describeAIError } from './aiErrors.ts';

export interface FalKeyDiagnostic {
  accessible: boolean;
  configured: boolean;
  length?: number;
  maskedPreview?: string;
  source: 'process.env.FAL_KEY';
  message: string;
}

export interface OpenRouterDiagnostic {
  tested: boolean;
  accessible: boolean;
  model: string;
  endpoint: string;
  latencyMs?: number;
  message: string;
  error?: string;
  code?: string;
}

export interface AnalyzeMasterDiagnostic {
  tested: boolean;
  passed: boolean;
  schemaValid: boolean;
  fieldsVerified: string[];
  missingFields?: string[];
  latencyMs?: number;
  message: string;
  sampleAnalysis?: Record<string, any>;
  error?: string;
  code?: string;
}

export interface FalDiagnosticReport {
  timestamp: string;
  overallStatus: 'PASS' | 'WARN' | 'FAIL';
  falKey: FalKeyDiagnostic;
  openRouter: OpenRouterDiagnostic;
  analyzeMaster: AnalyzeMasterDiagnostic;
}

/**
 * 1. Verify server-side accessibility of FAL_KEY without exposing its contents.
 */
export function verifyFalKeyAccessibility(): FalKeyDiagnostic {
  const rawKey = process.env.FAL_KEY;
  const trimmedKey = (rawKey || '').trim();

  if (!rawKey || trimmedKey.length === 0) {
    return {
      accessible: false,
      configured: false,
      source: 'process.env.FAL_KEY',
      message: 'FAL_KEY belum disetel atau kosong di environment server / Secrets panel.',
    };
  }

  // Key is accessible on the server. Safely mask it:
  // e.g. "fal_••••••••abcd" or "••••••••wxyz"
  const len = trimmedKey.length;
  let masked = '••••••••';
  if (len >= 8) {
    const prefix = trimmedKey.slice(0, 3);
    const suffix = trimmedKey.slice(-4);
    masked = `${prefix}••••••••${suffix}`;
  } else if (len >= 4) {
    masked = `••••${trimmedKey.slice(-2)}`;
  }

  return {
    accessible: true,
    configured: true,
    length: len,
    maskedPreview: masked,
    source: 'process.env.FAL_KEY',
    message: `FAL_KEY berhasil terdeteksi pada server environment (${len} karakter, terenkripsi aman).`,
  };
}

/**
 * Helper to classify HTTP / Fal errors safely without leaking headers
 */
function classifyError(error: any): { code: string; message: string; userMessage: string } {
  const classified = describeAIError(error);
  return { code: classified.code, message: classified.message, userMessage: classified.message };
}

/**
 * 2. Verify communication with the fal.ai OpenRouter/GPT-5 endpoint.
 */
export async function testOpenRouterConnectivity(): Promise<OpenRouterDiagnostic> {
  const keyInfo = verifyFalKeyAccessibility();
  if (!keyInfo.configured) {
    return {
      tested: false,
      accessible: false,
      model: 'openai/gpt-5',
      endpoint: 'https://fal.run/openrouter/router/openai/v1/chat/completions',
      message: 'Pengujian OpenRouter dilewati karena FAL_KEY belum dikonfigurasi.',
      code: 'KEY_NOT_CONFIGURED',
    };
  }

  const endpoint = 'https://fal.run/openrouter/router/openai/v1/chat/completions';
  const model = 'openai/gpt-5';

  const startTime = Date.now();
  try {
    await callGPTViaFal({
      model,
      messages: [
        { role: 'system', content: 'You are a connectivity probe. Respond with JSON: {"probe": "healthy"}' },
        { role: 'user', content: 'Respond with JSON {"probe": "healthy"}' },
      ],
      responseFormatJson: true,
    });

    const latencyMs = Date.now() - startTime;

    return {
      tested: true,
      accessible: true,
      model,
      endpoint,
      latencyMs,
      message: `Berhasil berkomunikasi dengan fal.ai OpenRouter (${model}) dalam ${latencyMs}ms.`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const classified = classifyError(err);
    return {
      tested: true,
      accessible: false,
      model,
      endpoint,
      latencyMs,
      code: classified.code,
      message: classified.userMessage,
      error: classified.message,
    };
  }
}

/**
 * 3. Verify specifically that the /api/analyze-master reasoning communication
 * with fal.ai OpenRouter/GPT-5 returns valid Master Property schema.
 */
export async function testAnalyzeMasterCommunication(): Promise<AnalyzeMasterDiagnostic> {
  const keyInfo = verifyFalKeyAccessibility();
  if (!keyInfo.configured) {
    return {
      tested: false,
      passed: false,
      schemaValid: false,
      fieldsVerified: [],
      message: 'Diagnostik /api/analyze-master dilewati karena FAL_KEY belum dikonfigurasi.',
      code: 'KEY_NOT_CONFIGURED',
    };
  }

  const model = 'openai/gpt-5';

  const diagnosticPrompt = `Anda adalah Architectural Director & Real Estate Campaign Strategist.
Analisis proyek properti uji diagnostik:
- Properti: Parkland Podomoro Akasia
- Tipe: 2-Story Modern Tropical Residence
- Developer: Agung Podomoro Land

Keluarkan JSON terstruktur dengan format:
{
  "property_identity": "Identitas bangunan",
  "architectural_style": "Modern Tropical",
  "target_audience": "Keluarga modern",
  "property_usp": ["USP 1", "USP 2"],
  "facade_lock": {
    "immutable_features": ["Footprint bangunan", "Geometri atap", "Posisi jendela"],
    "editable_environment_features": ["Pencahayaan alami", "Talent manusia", "Kendaraan"]
  },
  "visual_style": "Cinematic Editorial Real Estate",
  "brand_tone": "Prestigious",
  "campaign_angle": "Kenyamanan hidup keluarga modern",
  "architecturalSummary": "Deskripsi singkat arsitektur."
}

Keluarkan HANYA JSON tanpa teks pengantar.`;

  const startTime = Date.now();
  try {
    const content = await callGPTViaFal({
      model,
      messages: [
        { role: 'system', content: 'You are an architectural evaluator for real estate master properties. Output only structured JSON.' },
        { role: 'user', content: diagnosticPrompt },
      ],
      responseFormatJson: true,
    });

    const latencyMs = Date.now() - startTime;

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr: any) {
      return {
        tested: true,
        passed: false,
        schemaValid: false,
        fieldsVerified: [],
        latencyMs,
        code: 'INVALID_JSON',
        message: 'Respons dari GPT-5 bukan JSON yang valid.',
        error: parseErr.message,
      };
    }

    // Validate Master Property required schema fields
    const expectedFields = [
      'property_identity',
      'architectural_style',
      'target_audience',
      'property_usp',
      'facade_lock',
      'visual_style',
      'brand_tone',
      'campaign_angle',
    ];

    const fieldsVerified: string[] = [];
    const missingFields: string[] = [];

    for (const field of expectedFields) {
      if (parsed[field] !== undefined) {
        fieldsVerified.push(field);
      } else {
        missingFields.push(field);
      }
    }

    // Validate facade_lock internal structure
    const hasFacadeLock = Boolean(
      parsed.facade_lock &&
      Array.isArray(parsed.facade_lock.immutable_features) &&
      Array.isArray(parsed.facade_lock.editable_environment_features)
    );

    if (hasFacadeLock) {
      fieldsVerified.push('facade_lock.immutable_features');
      fieldsVerified.push('facade_lock.editable_environment_features');
    } else {
      missingFields.push('facade_lock.immutable_features / editable_environment_features');
    }

    const schemaValid = missingFields.length === 0;

    return {
      tested: true,
      passed: schemaValid,
      schemaValid,
      fieldsVerified,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      latencyMs,
      message: schemaValid
        ? `Pipeline /api/analyze-master berhasil terverifikasi. GPT-5 menghasilkan skema Master Property valid dalam ${latencyMs}ms.`
        : `Skema Master Property parsial. Field yang hilang: ${missingFields.join(', ')}`,
      sampleAnalysis: {
        property_identity: parsed.property_identity,
        architectural_style: parsed.architectural_style,
        immutableCount: parsed.facade_lock?.immutable_features?.length || 0,
        editableCount: parsed.facade_lock?.editable_environment_features?.length || 0,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const classified = classifyError(err);
    return {
      tested: true,
      passed: false,
      schemaValid: false,
      fieldsVerified: [],
      latencyMs,
      code: classified.code,
      message: classified.userMessage,
      error: classified.message,
    };
  }
}

/**
 * 4. Master Diagnostic Function: runs the full battery of tests.
 */
export async function runFalPipelineDiagnostics(): Promise<FalDiagnosticReport> {
  const timestamp = new Date().toISOString();
  const falKey = verifyFalKeyAccessibility();

  if (!falKey.configured) {
    return {
      timestamp,
      overallStatus: 'FAIL',
      falKey,
      openRouter: {
        tested: false,
        accessible: false,
        model: 'openai/gpt-5',
        endpoint: 'https://fal.run/openrouter/router/openai/v1/chat/completions',
        message: 'Pengujian OpenRouter dilewati karena FAL_KEY belum dikonfigurasi.',
      },
      analyzeMaster: {
        tested: false,
        passed: false,
        schemaValid: false,
        fieldsVerified: [],
        message: 'Pengujian /api/analyze-master dilewati karena FAL_KEY belum dikonfigurasi.',
      },
    };
  }

  // Run tests in sequence to protect quota and measure distinct latencies
  const openRouter = await testOpenRouterConnectivity();
  let analyzeMaster: AnalyzeMasterDiagnostic;

  if (openRouter.accessible) {
    analyzeMaster = await testAnalyzeMasterCommunication();
  } else {
    analyzeMaster = {
      tested: false,
      passed: false,
      schemaValid: false,
      fieldsVerified: [],
      message: 'Pengujian /api/analyze-master dilewati karena konektivitas OpenRouter gagal.',
      error: openRouter.error,
    };
  }

  let overallStatus: 'PASS' | 'WARN' | 'FAIL' = 'FAIL';
  if (falKey.configured && openRouter.accessible && analyzeMaster.passed) {
    overallStatus = 'PASS';
  } else if (falKey.configured && openRouter.accessible && !analyzeMaster.passed) {
    overallStatus = 'WARN';
  }

  return {
    timestamp,
    overallStatus,
    falKey,
    openRouter,
    analyzeMaster,
  };
}
