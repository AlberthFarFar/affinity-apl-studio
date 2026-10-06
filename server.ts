import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { fal } from '@fal-ai/client';
import { createHandler as createFalProxyHandler } from '@fal-ai/server-proxy/express';
import {
  verifyFalKeyAccessibility,
  testOpenRouterConnectivity,
  testAnalyzeMasterCommunication,
  runFalPipelineDiagnostics,
} from './server/diagnostics.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const falKey = (process.env.FAL_KEY || '').trim();
if (falKey) {
  fal.config({ credentials: falKey });
}

// -------------------------------------------------------------
// Helper: Error Classification
// -------------------------------------------------------------
function classifyFalError(error: any): { code: string; message: string; userMessage: string } {
  const rawMsg = error?.message || error?.detail || (typeof error === 'string' ? error : JSON.stringify(error)) || '';
  const str = rawMsg.toLowerCase();

  if (str.includes('401') || str.includes('unauthorized') || str.includes('invalid credentials') || str.includes('authentication is required')) {
    return {
      code: 'AUTH_ERROR',
      message: rawMsg,
      userMessage: 'Kunci FAL_KEY tidak valid atau belum dikonfigurasi. Periksa Secrets panel.',
    };
  }
  if (str.includes('credit') || str.includes('balance') || str.includes('payment') || str.includes('402')) {
    return {
      code: 'INSUFFICIENT_CREDITS',
      message: rawMsg,
      userMessage: 'Saldo fal.ai tidak mencukupi untuk pemrosesan AI.',
    };
  }
  if (str.includes('rate') || str.includes('429')) {
    return {
      code: 'RATE_LIMIT',
      message: rawMsg,
      userMessage: 'Batas frekuensi permintaan tercapai. Silakan coba sesaat lagi.',
    };
  }
  if (str.includes('busy') || str.includes('503') || str.includes('unavailable')) {
    return {
      code: 'MODEL_UNAVAILABLE',
      message: rawMsg,
      userMessage: 'Model fal.ai sedang sibuk. Coba kembali beberapa saat lagi.',
    };
  }
  if (str.includes('upload') || str.includes('storage')) {
    return {
      code: 'UPLOAD_FAILED',
      message: rawMsg,
      userMessage: 'Gambar referensi gagal diproses atau diunggah ke storage.',
    };
  }
  return {
    code: 'GENERATION_FAILED',
    message: rawMsg,
    userMessage: 'Terjadi kendala saat menghasilkan konten. Periksa parameter permintaan.',
  };
}

// -------------------------------------------------------------
// Helper: GPT Reasoning via fal OpenRouter
// -------------------------------------------------------------
async function callGPTViaFal(params: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | any[] }>;
  model?: string;
  responseFormatJson?: boolean;
}): Promise<string> {
  const currentKey = (process.env.FAL_KEY || '').trim();
  if (!currentKey) {
    throw new Error('FAL_KEY belum dikonfigurasi di server environment / Secrets.');
  }

  const model = params.model || 'openai/gpt-5';
  const url = 'https://fal.run/openrouter/router/openai/v1/chat/completions';

  let lastError: any = null;
  // Maximum 1 retry as required
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Key ${currentKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: params.messages,
          response_format: params.responseFormatJson ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const detail = errJson?.detail || errJson?.error?.message || response.statusText;
        throw new Error(`HTTP ${response.status}: ${detail}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return content;
      }
      throw new Error('Respons GPT tidak mengandung konten teks yang valid.');
    } catch (err: any) {
      lastError = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  throw lastError;
}

// -------------------------------------------------------------
// Helper: Upload base64 image to fal.storage
// -------------------------------------------------------------
async function uploadToFalStorage(imageData: string): Promise<string> {
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }

  if (imageData.startsWith('data:')) {
    const [header, base64Str] = imageData.split(';base64,');
    const mime = header.replace('data:', '') || 'image/jpeg';
    const buffer = Buffer.from(base64Str, 'base64');
    const blob = new Blob([buffer], { type: mime });
    const url = await fal.storage.upload(blob);
    return url;
  }

  throw new Error('Image reference must be a public HTTP(S) URL or a valid data URL that can be uploaded to fal Storage.');
}

// -------------------------------------------------------------
// Express Server App
// -------------------------------------------------------------
async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Protected fal server proxy endpoint
  // Handles storage upload initiation & fal client requests securely without exposing FAL_KEY
  const falProxy = createFalProxyHandler({
    allowedUrlPatterns: [
      'fal.run/**',
      'queue.fal.run/**',
      'rest.fal.ai/**',
      'rest.alpha.fal.ai/**',
      '*.fal.ai/**',
      '*.fal.run/**',
    ],
  });

  app.all('/api/fal/proxy', async (req, res, next) => {
    const currentKey = (process.env.FAL_KEY || '').trim();
    if (!currentKey) {
      return res.status(401).json({
        error: 'FAL_KEY belum dikonfigurasi di server environment. Harap periksa Secrets.',
      });
    }
    return falProxy(req, res, next);
  });

  // 1. Status / Health Check with safe FAL_KEY diagnostics
  app.get('/api/status', (req, res) => {
    const keyDiagnostic = verifyFalKeyAccessibility();
    res.json({
      status: 'ok',
      hasFalKey: keyDiagnostic.configured,
      keyDiagnostic,
      pipeline: {
        reasoning: 'GPT-5 (fal OpenRouter)',
        image: 'Nano Banana Pro Edit (fal-ai/nano-banana-pro/edit)',
        video: 'Kling 3.0 Pro (fal-ai/kling-video/v3/pro/image-to-video)',
        ugc: 'Script & Storyboard Generator (Google Flow Ready)',
      },
    });
  });

  // 2. Comprehensive Diagnostics API
  // 2a. Verify server-side FAL_KEY accessibility (NEVER exposes the key)
  app.get('/api/diagnostics/fal-key', (req, res) => {
    const diagnostic = verifyFalKeyAccessibility();
    res.json(diagnostic);
  });

  // 2b. Verify /api/analyze-master communication with fal.ai OpenRouter/GPT-5
  app.get('/api/diagnostics/analyze-master', async (req, res) => {
    const diagnostic = await testAnalyzeMasterCommunication();
    res.json(diagnostic);
  });

  // 2c. Full pipeline diagnostic battery
  app.get('/api/diagnostics', async (req, res) => {
    const report = await runFalPipelineDiagnostics();
    res.json(report);
  });

  // 2d. Test Connection (Used by UI connection test)
  app.get('/api/fal/test-connection', async (req, res) => {
    const keyDiagnostic = verifyFalKeyAccessibility();
    if (!keyDiagnostic.configured) {
      return res.status(400).json({
        success: false,
        connected: false,
        code: 'AUTH_ERROR',
        error: keyDiagnostic.message,
        keyDiagnostic,
      });
    }

    try {
      const openRouterDiag = await testOpenRouterConnectivity();
      if (!openRouterDiag.accessible) {
        return res.status(openRouterDiag.code === 'AUTH_ERROR' ? 401 : 500).json({
          success: false,
          connected: false,
          code: openRouterDiag.code || 'COMMUNICATION_FAILED',
          error: openRouterDiag.message,
          detail: openRouterDiag.error,
          keyDiagnostic,
        });
      }

      res.json({
        success: true,
        connected: true,
        model: openRouterDiag.model,
        latencyMs: openRouterDiag.latencyMs,
        message: 'Koneksi ke fal.ai dan GPT-5 berhasil terautentikasi.',
        keyDiagnostic,
      });
    } catch (err: any) {
      const classified = classifyFalError(err);
      res.status(classified.code === 'AUTH_ERROR' ? 401 : 500).json({
        success: false,
        connected: false,
        code: classified.code,
        error: classified.userMessage,
        detail: classified.message,
        keyDiagnostic,
      });
    }
  });

  // 3. Analyze Master Property (Reasoning via GPT-5)
  app.post('/api/analyze-master', async (req, res) => {
    try {
      const keyDiag = verifyFalKeyAccessibility();
      if (!keyDiag.configured) {
        return res.status(400).json({
          success: false,
          code: 'KEY_NOT_CONFIGURED',
          error: keyDiag.message,
        });
      }

      const { propertyImage, referenceImages = [], project } = req.body;
      const images: string[] = [];
      if (propertyImage) images.push(propertyImage);
      if (Array.isArray(referenceImages)) {
        for (const img of referenceImages) {
          if (img && !images.includes(img)) images.push(img);
        }
      }

      if (images.length === 0) {
        return res.status(400).json({ error: 'Foto referensi properti wajib disertakan.' });
      }

      const prompt = `Anda adalah Lead Architectural Director & Real Estate Campaign Strategist untuk Agung Podomoro Land.
Analisis proyek properti "${project?.name || 'Properti Hunian Modern'}":
- Tipe/Harga: ${project?.type || 'Hunian'} / ${project?.price || 'Sesuai Pasar'}
- Lokasi: ${project?.location || 'Indonesia'}
- Fasilitas: ${project?.features || 'Taman, Keamanan 24 Jam, Clubhouse'}
- Developer: ${project?.developer || 'Agung Podomoro Land'}

Lakukan analisis mendalam dan hasilkan JSON terstruktur dengan format persis berikut:
{
  "property_identity": "Nama dan deskripsi identitas bangunan",
  "architectural_style": "Contoh: Modern Tropical / Contemporary Luxury",
  "target_audience": "Profil target pembeli / demografis",
  "property_usp": ["Keunggulan 1", "Keunggulan 2", "Keunggulan 3", "Keunggulan 4"],
  "facade_lock": {
    "immutable_features": [
      "Footprint & massa bangunan bertingkat",
      "Geometri dan kemiringan atap",
      "Posisi dan proporsi jendela serta bukaan utama",
      "Bentuk pintu utama dan balkon",
      "Tekstur material fasad permanen (batu alam, list kayu, cat netral)"
    ],
    "editable_environment_features": [
      "Pencahayaan alami (golden hour, pagi segar, twilight hangat)",
      "Figur talent manusia yang berinteraksi natural",
      "Kendaraan terparkir di carport dan jalanan lingkungan",
      "Tanaman hias, rumput taman, dan dekorasi teras",
      "Kondisi langit, awan, dan tone fotografi sinematik"
    ]
  },
  "visual_style": "Cinematic Editorial Real Estate",
  "brand_tone": "Prestigious, Warm, Exclusive, Aspirational",
  "campaign_angle": "Kenyamanan hidup keluarga modern di kawasan terpadu prestisius",
  "locked": [
    "Footprint & massa bangunan",
    "Geometri dan kemiringan atap",
    "Posisi bukaan jendela dan pintu",
    "Material fasad permanen",
    "Proporsi arsitektur fasad"
  ],
  "flexible": [
    "Pencahayaan & bayangan alami",
    "Talent manusia & interaksi keluarga",
    "Kendaraan & lansekap sekitar",
    "Kondisi cuaca dan langit",
    "Gradasi warna fotografi"
  ],
  "architecturalSummary": "Deskripsi singkat 2 kalimat mengenai karakter fisik bangunan dan daya tarik lifestyle."
}

Gunakan Bahasa Indonesia profesional. Keluarkan HANYA JSON tanpa pengantar.`;

      // Send the actual property pixels to the vision-capable model.  The old
      // implementation built `images` but never attached them to the request,
      // so it produced generic text-only "architectural analysis".
      const imageUrls = await Promise.all(images.map((image) => uploadToFalStorage(image)));
      const analysisContent: any[] = [
        { type: 'text', text: prompt },
        ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
      ];

      const gptReply = await callGPTViaFal({
        messages: [
          { role: 'system', content: 'You are an architectural VLM evaluator and real estate marketing expert. Always reply with valid JSON.' },
          { role: 'user', content: analysisContent },
        ],
        model: 'openai/gpt-5',
        responseFormatJson: true,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(gptReply);
      } catch (e) {
        // Fallback default structure
        parsed = {
          property_identity: project?.name || 'Hunian Modern Prestisius',
          architectural_style: 'Modern Tropical Contemporary',
          target_audience: 'Keluarga muda mapan & profesional',
          property_usp: ['Lokasi strategis', 'Desain fasad modern', 'Ruang keluarga luas', 'Lingkungan asri'],
          facade_lock: {
            immutable_features: [
              'Footprint & massa bangunan 2 lantai',
              'Geometri & kemiringan atap',
              'Posisi dan proporsi bukaan jendela',
              'Pintu utama dan balkon atas',
              'Material dinding dan aksen arsitektur',
            ],
            editable_environment_features: [
              'Pencahayaan alami & bayangan',
              'Talent interaksi keluarga',
              'Kendaraan & lansekap tanaman',
              'Kondisi cuaca & langit',
              'Gradasi warna fotografi',
            ],
          },
          visual_style: 'Cinematic Editorial Real Estate',
          brand_tone: 'Prestigious & Warm',
          campaign_angle: 'Kenyamanan hidup modern di hunian bernilai tinggi',
          locked: [
            'Footprint & massa bangunan',
            'Geometri atap',
            'Posisi bukaan jendela dan pintu',
            'Material fasad permanen',
            'Proporsi arsitektur',
          ],
          flexible: [
            'Pencahayaan alami',
            'Talent manusia',
            'Kendaraan & lansekap',
            'Kondisi langit',
            'Fotografi sinematik',
          ],
          architecturalSummary: `${project?.name || 'Properti ini'} mengusung karakter hunian kontemporer dengan garis fasad tegas dan bukaan jendela optimal. Tata ruang menyatu harmonis dengan lingkungan asri yang menunjang gaya hidup modern.`,
        };
      }

      res.json({
        success: true,
        analysis: parsed,
      });
    } catch (err: any) {
      console.error('Error analyzing master property:', err);
      const classified = classifyFalError(err);
      res.status(500).json({
        success: false,
        error: classified.userMessage,
        detail: classified.message,
      });
    }
  });

  // 4. Generate Carousel Blueprint (Reasoning via GPT-5)
  app.post('/api/generate-blueprint', async (req, res) => {
    try {
      const { project, masterAnalysis, slideCount = 5, visualStyle = 'Mixed', casting = 'Keluarga Muda' } = req.body;

      const prompt = `Anda adalah Creative Director & Head of Copywriting untuk periklanan real estate Instagram carousel Agung Podomoro Land.
Rancang Carousel Blueprint sebanyak ${slideCount} slide untuk proyek "${project?.name || 'Hunian Modern'}".

DATA MASTER PROPERTI:
- Gaya Arsitektur: ${masterAnalysis?.architectural_style || 'Modern Tropical'}
- Target Audience: ${masterAnalysis?.target_audience || casting}
- USP: ${(masterAnalysis?.property_usp || []).join(', ') || project?.features || 'Fasilitas premium'}
- Arah Visual: ${visualStyle}
- Casting: ${casting}

ATURAN STRUKTUR SETIAP SLIDE:
Setiap slide harus memiliki:
- slide_number: angka 1 sampai ${slideCount}
- slide_role: "Hook" (Slide 1), "Feature" / "Lifestyle" / "Benefit" (Slide tengah), "CTA" (Slide terakhir)
- narrative_purpose: Tujuan storytelling slide
- headline: Kalimat judul kuat dan puitis (maksimal 7 kata, Bahasa Indonesia)
- subheadline: Penjelasan singkat 1 kalimat
- visual_direction: Arahan fotografi adegan
- scene_description: Deskripsi interaksi talent dan properti
- casting_direction: Talent yang tampil
- camera_direction: Sudut pengambilan gambar (eye-level, low angle, medium wide)
- lighting: Kondisi cahaya (golden hour, soft morning, twilight)
- facade_preservation_instruction: Instruksi eksplisit untuk mempertahankan fasad fisik rumah asli
- nano_banana_prompt: PROMPT BAHASA INGGRIS YANG SANGAT KONSISTEN DENGAN STRUKTUR BERIKUT:
ARCHITECTURAL GROUND TRUTH
Use the supplied property reference images as the exact architectural ground truth.
Preserve the recognizable building identity and geometry exactly.

IMMUTABLE
Preserve:
- roof geometry
- wall proportions
- windows
- doors
- balconies
- structural columns
- facade openings
- permanent architectural materials
- floor count
- overall massing

FORBIDDEN
Do not:
- redesign the house
- add or remove floors
- invent windows
- move doors
- change roof geometry
- add new balconies
- replace the property with a similar-looking building
- alter the architectural proportions

EDITABLE
May modify:
- people
- vehicle
- vegetation
- weather
- lighting
- outdoor furniture
- sky
- atmosphere
- photographic treatment

SCENE
[Deskripsi adegan visual spesifik untuk slide ini dengan talent ${casting} di teras/halaman rumah]

PHOTOGRAPHY
premium photorealistic real-estate editorial photography, realistic Indonesian environment when applicable, believable scale, physically plausible lighting, no artificial architectural redesign.

Keluarkan format JSON dengan root object:
{
  "slides": [ ... ]
}
Keluarkan HANYA JSON.`;

      const gptReply = await callGPTViaFal({
        messages: [
          { role: 'system', content: 'You are an elite real estate creative strategist. Always respond with valid JSON containing the "slides" array.' },
          { role: 'user', content: prompt },
        ],
        model: 'openai/gpt-5',
        responseFormatJson: true,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(gptReply);
      } catch (e) {
        parsed = { slides: [] };
      }

      const slides = (parsed.slides || []).map((s: any, idx: number) => ({
        index: idx,
        slide_number: s.slide_number || idx + 1,
        slide_role: s.slide_role || (idx === 0 ? 'Hook' : idx === slideCount - 1 ? 'CTA' : 'Lifestyle'),
        narrative_purpose: s.narrative_purpose || `Storytelling slide ${idx + 1}`,
        type: s.slide_role || (idx === 0 ? 'Hook' : idx === slideCount - 1 ? 'CTA' : 'Lifestyle'),
        headline: s.headline || `Ruang Nyaman Keluarga Harmonis`,
        subheadline: s.subheadline || 'Kualitas hidup terbaik di lingkungan prestisius.',
        copy: s.subheadline || 'Kualitas hidup terbaik di lingkungan prestisius.',
        subtext: s.slide_role || 'Keunggulan Properti',
        visual_direction: s.visual_direction || 'Foto editorial sudut mata normal di depan rumah',
        scene_description: s.scene_description || 'Interaksi santai keluarga di teras depan',
        casting_direction: s.casting_direction || casting,
        camera_direction: s.camera_direction || 'Eye-level 35mm lens medium wide',
        lighting: s.lighting || 'Warm golden hour sunlight',
        facade_preservation_instruction: s.facade_preservation_instruction || 'Kunci geometri dinding, atap, dan jendela rumah master secara akurat.',
        nano_banana_prompt: s.nano_banana_prompt || `ARCHITECTURAL GROUND TRUTH\nUse the supplied property reference images as the exact architectural ground truth.\nPreserve the recognizable building identity and geometry exactly.\n\nIMMUTABLE\nPreserve:\n- roof geometry\n- wall proportions\n- windows\n- doors\n- balconies\n- structural columns\n- facade openings\n- permanent architectural materials\n- floor count\n- overall massing\n\nFORBIDDEN\nDo not:\n- redesign the house\n- add or remove floors\n- invent windows\n- move doors\n- change roof geometry\n- add new balconies\n- replace the property with a similar-looking building\n- alter the architectural proportions\n\nEDITABLE\nMay modify:\n- people\n- vehicle\n- vegetation\n- weather\n- lighting\n- outdoor furniture\n- sky\n- atmosphere\n- photographic treatment\n\nSCENE\n${s.scene_description || 'Joyful Indonesian family enjoying an afternoon on the paved driveway and porch of the residence'}\n\nPHOTOGRAPHY\npremium photorealistic real-estate editorial photography, realistic Indonesian environment when applicable, believable scale, physically plausible lighting, no artificial architectural redesign.`,
        shot: s.scene_description || 'Interaksi santai keluarga di teras depan',
        badge: idx === 0 ? 'COVER' : idx === slideCount - 1 ? 'CTA' : undefined,
      }));

      res.json({
        success: true,
        slides,
      });
    } catch (err: any) {
      console.error('Error generating blueprint:', err);
      const classified = classifyFalError(err);
      res.status(500).json({
        success: false,
        error: classified.userMessage,
        detail: classified.message,
      });
    }
  });

  // 5. Generate Carousel Slide Image (Nano Banana Pro Edit & Seedream 5 Pro Precision Edit)
  // Endpoints: /api/fal/generate-image and /api/generate-scene (identical handler)
  const handleGenerateImage = async (req: express.Request, res: express.Response) => {
    console.log('[Image Gen] Generation route reached:', req.originalUrl);

    try {
      const {
        propertyImages = [],
        propertyImage,
        lockedFacadeUrl,
        styleImages = [],
        talentImage,
        aspectRatio = '4:5',
        resolution = '2K',
        prompt,
        scenePrompt,
        slideIndex = 0,
        mode = 'strict', // 'strict' (default) | 'creative'
        engine = 'nano-banana', // 'nano-banana' (default) | 'seedream'
        isStricterRegen = false,
      } = req.body || {};

      const currentKey = (process.env.FAL_KEY || '').trim();
      const hasKey = Boolean(currentKey && currentKey.length > 5);
      console.log(`[Image Gen] FAL_KEY present: ${hasKey}`);

      if (!hasKey) {
        return res.status(400).json({
          success: false,
          error: 'FAL_KEY_MISSING',
          message: 'FAL_KEY belum dikonfigurasi di server environment / Secrets.',
        });
      }

      // Reference priority is deliberate and must not be changed by a crop:
      // Image 1 is always the full original master facade (architectural truth).
      // A composition crop is a separate framing aid only.
      const primaryFacade = propertyImage || (propertyImages.length > 0 ? propertyImages[0] : null);
      const compositionCrop = lockedFacadeUrl && lockedFacadeUrl !== primaryFacade ? lockedFacadeUrl : null;

      if (!primaryFacade || typeof primaryFacade !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'REFERENCE_IMAGE_REQUIRED',
          message: 'Minimal satu gambar referensi properti wajib disertakan sebagai Image 1 (Architectural Ground Truth).',
        });
      }

      // Configure fal credentials BEFORE storage upload and subscribe
      fal.config({ credentials: currentKey });

      // Build ordered reference array strictly:
      // image_urls[0] = FULL MASTER FACADE (architectural source of truth)
      // image_urls[1] = COMPOSITION CROP (framing only, if provided)
      // image_urls[2] = STYLE ONLY (if provided)
      // image_urls[3] = TALENT ONLY (if provided)
      const rawReferenceList: string[] = [primaryFacade];

      if (compositionCrop) {
        rawReferenceList.push(compositionCrop);
      }

      const styleRef = Array.isArray(styleImages) && styleImages.length > 0 ? styleImages[0] : null;
      if (styleRef && typeof styleRef === 'string') {
        rawReferenceList.push(styleRef);
      }

      if (talentImage && typeof talentImage === 'string') {
        rawReferenceList.push(talentImage);
      }

      console.log(`[Image Gen] Reference images count: ${rawReferenceList.length} (Image 1: Full Master Facade, Has Crop: ${Boolean(compositionCrop)}, Has Style: ${Boolean(styleRef)}, Has Talent: ${Boolean(talentImage)})`);

      // Upload references to fal storage to get clean public CDN URLs
      const finalImageUrls: string[] = [];
      for (let i = 0; i < rawReferenceList.length; i++) {
        const rawImg = rawReferenceList[i];
        try {
          const url = await uploadToFalStorage(rawImg);
          if (!url || !/^https?:\/\//.test(url)) {
            throw new Error('fal Storage did not return a public HTTP(S) URL.');
          }
          finalImageUrls.push(url);
        } catch (uploadErr) {
          console.warn(`[Image Gen] Failed to upload reference ${i} to fal storage:`, uploadErr);
          return res.status(422).json({
            success: false,
            error: 'REFERENCE_STORAGE_UPLOAD_FAILED',
            message: `Reference image ${i + 1} could not be converted to a public fal Storage URL. Generation was not submitted.`,
          });
        }
      }

      // Validate supported aspect ratio
      const validAspectRatios = ['9:16', '4:5', '1:1', '5:4', '16:9'];
      const targetAspect = validAspectRatios.includes(aspectRatio) ? aspectRatio : '4:5';

      // Validate supported resolution
      const validResolutions = ['1K', '2K', '4K'];
      const targetRes = validResolutions.includes(resolution) ? resolution : '2K';

      // Requirement #6: Sanitize scene prompt — remove conflicting camera angle instructions
      // Keep the creative blueprint prompt in the final request.  Previously
      // `scenePrompt` always won, silently discarding `nano_banana_prompt`.
      const blueprintPrompt = (prompt || '').trim();
      const sceneBrief = (scenePrompt || '').trim();
      let lifestyleAddition = [blueprintPrompt, sceneBrief ? `[SCENE FOCUS]\n${sceneBrief}` : '']
        .filter(Boolean)
        .join('\n\n') || 'Indonesian family enjoying warm golden hour on the porch and driveway.';
      lifestyleAddition = lifestyleAddition
        .replace(/\b(drone angle|aerial view|low angle|extreme low angle|wide architectural reveal|alternate perspective|new viewpoint|backyard view|side elevation|rear view)\b/gi, 'same eye-level perspective as Image 1')
        .trim();

      // Requirement #4 & #5: Centralized 6-Stage ARCHITECTURAL CONSISTENCY GUARD Policy
      const CORE_PRESERVATION_PROMPT =
        'Edit the supplied property photograph; do not generate a replacement building. The designated property reference is the architectural source of truth. Preserve the visible building geometry, roof silhouette, floor count, proportions, openings, columns, balconies, fence, entrance, materials, and viewpoint. Style references may influence atmosphere and presentation only, never architecture. Change only the explicitly allowed elements. Do not invent hidden sides or redesign the property. If the requested scene conflicts with architectural preservation, preserve the property and simplify the scene.';

      const systemPrompt = `You are performing constrained photographic editing under the AFFINITY ARCHITECTURAL CONSISTENCY GUARD. Image 1 is immutable physical architectural ground truth for this property. Preserve its camera viewpoint, perspective, building silhouette, roof geometry, floor count, wall boundaries, doors, windows, columns, gables, openings, proportions and permanent facade materials. Never reconstruct, redesign, replace or reinterpret the building. If a requested creative change conflicts with architecture preservation, preserve architecture and omit the conflicting change. Treat the task as editing the supplied photograph, not generating a new property.`;

      // Stage 1: Kebijakan Pelestarian Arsitektur
      const stage1 = `[STAGE 1: ARCHITECTURAL PRESERVATION POLICY]\n${CORE_PRESERVATION_PROMPT}`;

      // Stage 2: Identitas Properti & Peran Setiap Referensi
      const propertyTitle = req.body?.project?.name || req.body?.propertyId || 'Master Property';
      const refVersion = req.body?.referenceVersion || 1;
      const cropIndex = compositionCrop ? 2 : null;
      const styleIndex = styleRef ? (compositionCrop ? 3 : 2) : null;
      const talentIndex = talentImage ? (compositionCrop ? (styleRef ? 4 : 3) : (styleRef ? 3 : 2)) : null;
      const stage2 = `[STAGE 2: PROPERTY IDENTITY & REFERENCE ROLES]
- Image 1 (PRIMARY): FULL_MASTER_FACADE for "${propertyTitle}" (Version v${refVersion}). This is the IMMUTABLE architectural ground truth.
${cropIndex ? `- Image ${cropIndex}: COMPOSITION_CROP (Framing and visible-area guidance ONLY. It must never replace, redefine, or narrow the architectural ground truth in Image 1).\n` : ''}${styleIndex ? `- Image ${styleIndex}: STYLE_REFERENCE (Guidance for atmosphere, lighting mood, color palette ONLY. NEVER alter building shape).\n` : ''}${talentIndex ? `- Image ${talentIndex}: TALENT_REFERENCE (Human talent casting guidance ONLY).\n` : ''}- Active Viewpoint: Eye-level perspective matching Image 1.`;

      // Stage 3: Elemen yang Dilindungi
      const archElems = req.body?.architecturalElements || {};
      const stage3 = `[STAGE 3: PROTECTED ARCHITECTURAL ELEMENTS (DO NOT ALTER)]
- Building Stories & Massing: ${archElems.storyCount || '2'} stories; ${archElems.massingShape || 'Preserve structural footprint & massing proportions'}
- Roof Silhouette & Pitch: ${archElems.roofSilhouette || 'Preserve exact roof geometry, gable count, and overhangs'}
- Openings: ${archElems.windowDoorArrangement || 'Preserve exact positions, count, and framing of windows and doors'}
- Structural Features: ${archElems.columnsAndBalconies || 'Preserve all columns, balconies, railings, carports, and entrance boundaries'}
- Materials & Colors: ${archElems.materialsAndColors || 'Preserve permanent facade materials, masonry, stone accents, and wood siding'}
- Perspective: Keep camera viewpoint aligned with Image 1; do not distort vertical architectural lines.`;

      // Stage 4: Perubahan yang Diizinkan
      const allowedAreas = Array.isArray(req.body?.editableAreas) && req.body.editableAreas.length > 0
        ? req.body.editableAreas
        : [
            'Sky, clouds, and weather atmosphere',
            'Sunlight, shadows, and time of day lighting',
            'Foreground landscaping, lawn, and non-structural foliage',
            'Human talent and family lifestyle interactions in outdoor areas',
            'Vehicles positioned naturally in the driveway/street',
            'Movable outdoor furniture and patio decor',
            'Photographic color grading without altering physical structures',
          ];

      const stage4 = `[STAGE 4: ALLOWED MODIFICATIONS]
Only the following elements may be introduced or edited:
${allowedAreas.map((a: string) => `- ${a}`).join('\n')}
Strictly forbidden: Changing roof slope, altering floor count, adding/removing windows or doors, redesigning facade finishes, or inventing non-visible building sides.`;

      // Stage 5: Brief Slide
      const stage5 = `[STAGE 5: SLIDE SCENE BRIEF]
${lifestyleAddition}`;

      // Stage 6: Suasana, Pencahayaan, dan Komposisi
      const stage6 = `[STAGE 6: ATMOSPHERE & LIGHTING COMPOSITION]
Warm, natural Indonesian real-estate editorial photography, believable scale, physically plausible ambient lighting.
DO NOT RENDER ANY TEXT, TYPOGRAPHY, HEADLINES, WATERMARKS, OR GRAPHICS IN THE IMAGE.
The final output must visibly depict the exact same physical property shown in Image 1.`;

      let finalUserPrompt = '';

      if (isStricterRegen) {
        finalUserPrompt += `[CRITICAL REGENERATION OVERRIDE]
The previous generation was REJECTED because the architectural facade diverged from Image 1.
You must strictly preserve the building geometry in Image 1 without any deviation.
Do not redesign, do not substitute another house, do not add/remove facade elements.\n\n`;
      }

      if (mode === 'creative') {
        finalUserPrompt += `[MODE: REFERENCE-GUIDED EDIT — CREATIVE]
${CORE_PRESERVATION_PROMPT}
Maintain general building identity while creatively adapting atmosphere and presentation.
${stage2}
${stage5}
${stage6}`;
      } else {
        // STRICT PRESERVE MODE (Default)
        finalUserPrompt += `${stage1}\n\n${stage2}\n\n${stage3}\n\n${stage4}\n\n${stage5}\n\n${stage6}`;
      }

      // Requirement #11: Engine selection (Nano Banana Pro vs Seedream 5 Pro Precision Edit)
      const selectedModelId = engine === 'seedream'
        ? 'bytedance/seedream-v5.0-pro/edit'
        : 'fal-ai/nano-banana-pro/edit';

      console.log('[Image Gen] Submitting fal request', {
        modelId: selectedModelId,
        engine,
        mode,
        isStricterRegen,
        aspectRatio: targetAspect,
        resolution: targetRes,
        referenceCount: finalImageUrls.length,
        promptLength: finalUserPrompt.length,
      });

      const inputPayload: any = {
        prompt: finalUserPrompt,
        image_url: finalImageUrls[0],
        image_urls: finalImageUrls,
        aspect_ratio: targetAspect,
        resolution: targetRes,
      };

      // Apply system_prompt for Nano Banana Pro Edit
      if (selectedModelId === 'fal-ai/nano-banana-pro/edit') {
        inputPayload.system_prompt = systemPrompt;
      }

      let capturedRequestId: string | undefined;

      // Requirement #8: No automatic retry on paid generation
      const result: any = await fal.subscribe(selectedModelId, {
        input: inputPayload,
        logs: true,
        onEnqueue: (reqId: string) => {
          capturedRequestId = reqId;
          console.log(`[Image Gen] Request enqueued with ID: ${reqId}`);
        },
      });

      console.log('[Image Gen] fal response received');

      const requestId = capturedRequestId || result?.requestId || result?.request_id || result?.id || 'req_' + Date.now();
      const outputImageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url || result?.data?.image?.url || result?.image?.url;

      if (!outputImageUrl) {
        console.error('[Image Gen] Fal response does not contain output image URL:', JSON.stringify(result));
        return res.status(502).json({
          success: false,
          error: 'NO_IMAGE_URL_RETURNED',
          message: `${selectedModelId} selesai namun tidak menghasilkan URL gambar.`,
          requestId,
        });
      }

      console.log('[Image Gen] Output image URL received:', outputImageUrl.slice(0, 60) + '...');

      // Return consistent JSON
      res.json({
        success: true,
        imageUrl: outputImageUrl,
        requestId,
        model: selectedModelId,
        engine,
        mode,
        aspectRatio: targetAspect,
        resolution: targetRes,
        slideIndex,
        promptUsed: finalUserPrompt,
        lockedFacadeUsed: finalImageUrls[0],
        compositionCropUsed: compositionCrop ? finalImageUrls[1] : null,
      });
    } catch (err: any) {
      console.error('[Image Gen] Error in generation route:', err);
      const classified = classifyFalError(err);
      res.status(classified.code === 'AUTH_ERROR' ? 401 : 500).json({
        success: false,
        error: classified.code,
        message: classified.userMessage,
        details: classified.message,
      });
    }
  };

  app.post('/api/fal/generate-image', handleGenerateImage);
  app.post('/api/generate-scene', handleGenerateImage);

  // 5b. Visual QA: Strict Image Comparison via fal OpenRouter Vision (Requirement #8)
  app.post('/api/fal/visual-qa', async (req, res) => {
    try {
      const { referenceImageUrl, generatedImageUrl } = req.body || {};

      if (!referenceImageUrl || !generatedImageUrl) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_IMAGES',
          message: 'referenceImageUrl dan generatedImageUrl wajib disertakan untuk Visual QA.',
        });
      }

      const currentKey = (process.env.FAL_KEY || '').trim();
      if (!currentKey) {
        return res.status(400).json({
          success: false,
          error: 'FAL_KEY_MISSING',
          message: 'FAL_KEY belum dikonfigurasi di server environment.',
        });
      }

      fal.config({ credentials: currentKey });

      // Ensure both images are accessible URLs
      const [refUrl, genUrl] = await Promise.all([
        uploadToFalStorage(referenceImageUrl),
        uploadToFalStorage(generatedImageUrl),
      ]);

      const promptText = `Compare Image 1 (immutable reference facade) and Image 2 (generated/edited facade).
Perform strict architectural fidelity verification:
1. roof_geometry_match (0-100): pitch, ridge, gable count, eaves, tiles/metal.
2. window_door_layout_match (0-100): number, position, framing, mullions, balcony doors.
3. massing_match (0-100): overall building footprint, story count, volumetric profile.
4. facade_proportion_match (0-100): ratio of solid wall to glazed openings, column positions, finish materials.
5. camera_view_match (0-100): same viewpoint, perspective, and framing.
6. same_building (boolean): true ONLY if Image 2 is definitively the exact same physical house, not a replacement or redesign.
7. critical_changes (array of strings): list any detected architectural alterations (e.g. "Gable roof replaced by flat roof", "Window count changed", "Floor added", "Different facade stone").
8. overall_score (0-100): harmonic average of architectural scores.
9. pass (boolean): TRUE ONLY if same_building is true AND roof >= 90 AND window_door >= 90 AND massing >= 90 AND facade_proportion >= 90 AND overall_score >= 90. Otherwise false.

Return JSON in this exact structure:
{
  "same_building": boolean,
  "roof_geometry_match": number,
  "window_door_layout_match": number,
  "massing_match": number,
  "facade_proportion_match": number,
  "camera_view_match": number,
  "critical_changes": string[],
  "overall_score": number,
  "pass": boolean
}`;

      const openRouterUrl = 'https://fal.run/openrouter/router/openai/v1/chat/completions';
      const visionResponse = await fetch(openRouterUrl, {
        method: 'POST',
        headers: {
          Authorization: `Key ${currentKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an expert architectural facade comparator. You compare Image 1 (immutable reference) with Image 2 (generated image). Output only valid JSON.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                { type: 'image_url', image_url: { url: refUrl } },
                { type: 'image_url', image_url: { url: genUrl } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!visionResponse.ok) {
        const errJson = await visionResponse.json().catch(() => null);
        throw new Error(`Vision QA HTTP ${visionResponse.status}: ${errJson?.error?.message || visionResponse.statusText}`);
      }

      const visionData = await visionResponse.json();
      const rawContent = visionData.choices?.[0]?.message?.content || '{}';

      let parsedQA: any;
      try {
        parsedQA = JSON.parse(rawContent);
      } catch (parseErr) {
        throw new Error('Gagal mengurai respons JSON Visual QA.');
      }

      // Enforce honest 4-tier evaluation (Requirement #8)
      const roof = Number(parsedQA.roof_geometry_match) || 0;
      const windowDoor = Number(parsedQA.window_door_layout_match) || 0;
      const massing = Number(parsedQA.massing_match) || 0;
      const proportions = Number(parsedQA.facade_proportion_match) || 0;
      const overall = Number(parsedQA.overall_score) || 0;
      const sameBuilding = Boolean(parsedQA.same_building);

      let status = 'NOT_VALIDATED';
      let honestAssessment = '';

      if (sameBuilding && roof >= 90 && windowDoor >= 90 && massing >= 90 && proportions >= 90 && overall >= 90) {
        status = 'PASS';
        honestAssessment = 'Pemeriksaan visual tidak menemukan perubahan terlarang pada bentuk atap, bukaan, maupun massa bangunan.';
      } else if (!sameBuilding || roof < 75 || windowDoor < 75 || massing < 75 || proportions < 75 || overall < 75) {
        status = 'REJECT';
        honestAssessment = 'Terdeteksi perubahan signifikan pada arsitektur fasad dibandingkan foto referensi.';
      } else {
        status = 'NEEDS_REVIEW';
        honestAssessment = 'Terdapat potensi perubahan parsial atau beberapa bagian fasad tertutup oleh elemen baru. Diperlukan review manual pengguna.';
      }

      parsedQA.status = status;
      parsedQA.pass = status === 'PASS';
      parsedQA.honest_assessment = honestAssessment;
      parsedQA.reference_version_used = req.body?.referenceVersion || 1;

      console.log(`[Visual QA] Completed. Status: ${status}, Score: ${overall}%, Same Building: ${sameBuilding}`);

      res.json({
        success: true,
        qa: parsedQA,
      });
    } catch (qaErr: any) {
      console.error('[Visual QA] Error during visual comparison:', qaErr);
      res.status(200).json({
        success: true,
        qa: {
          status: 'NOT_VALIDATED',
          pass: false,
          same_building: false,
          overall_score: 0,
          roof_geometry_match: 0,
          window_door_layout_match: 0,
          massing_match: 0,
          facade_proportion_match: 0,
          camera_view_match: 0,
          critical_changes: ['Layanan evaluasi visual otomatis tidak tersedia atau mengalami kendala jaringan.'],
          honest_assessment: 'Pemeriksaan visual otomatis belum berjalan/tidak tersedia. Hasil wajib diperiksa secara manual.',
          reference_version_used: req.body?.referenceVersion || 1,
        },
      });
    }
  });

  // 6. Animate Slide with Kling 3.0 Pro Image-to-Video (Asynchronous Queue)
  app.post('/api/animate-slide', async (req, res) => {
    try {
      const {
        imageUrl,
        motionPreset = 'Subtle Cinematic',
        duration = '5',
        audio = false,
        customPrompt,
        slideIndex = 0,
      } = req.body;

      const currentKey = (process.env.FAL_KEY || '').trim();
      if (!currentKey) {
        return res.status(400).json({
          success: false,
          error: 'FAL_KEY belum dikonfigurasi di server environment / Secrets.',
        });
      }

      if (!imageUrl) {
        return res.status(400).json({ error: 'URL gambar slide awal wajib disertakan untuk animasi.' });
      }

      // Convert local base64 start image to fal storage URL if needed
      const cleanImageUrl = await uploadToFalStorage(imageUrl);

      // Kling Real-Estate Motion Prompt Construction (Requirement #12)
      let presetPrompt = 'Slow and subtle camera push in towards the architectural entrance, gentle tree foliage sway, authentic ambient lighting.';
      if (motionPreset === 'Slow Dolly In') {
        presetPrompt = 'Smooth cinematic dolly forward toward the front porch, natural breeze in the front garden, building remains completely stationary.';
      } else if (motionPreset === 'Architectural Reveal') {
        presetPrompt = 'Subtle crane or rising camera reveal showcasing the pristine roof geometry and modern facade lines, realistic environmental reflections.';
      } else if (motionPreset === 'Lifestyle Motion') {
        presetPrompt = 'Natural human movement on the terrace and driveway, authentic lifestyle interaction, camera holds rock-solid structural stability.';
      }

      const motionPrompt = customPrompt?.trim() || `Preserve the original building geometry and architectural identity. The building must remain structurally stable throughout the entire shot. Allowed motion: ${presetPrompt}. Forbidden: morphing facade, window movement, roof deformation, building expansion, changing materials.`;

      // Duration: '5' or '10' (string format as expected by Kling API schema)
      const validDuration = duration === '10' || duration === 10 ? '10' : '5';

      fal.config({ credentials: currentKey });

      const queueResult = await fal.queue.submit('fal-ai/kling-video/v3/pro/image-to-video', {
        input: {
          prompt: motionPrompt,
          start_image_url: cleanImageUrl,
          duration: validDuration as any,
          generate_audio: Boolean(audio),
        },
      });

      res.json({
        success: true,
        requestId: queueResult.request_id,
        status: 'Queued',
        duration: validDuration,
        audio: Boolean(audio),
        motionPreset,
        slideIndex,
      });
    } catch (err: any) {
      console.error('Error submitting Kling 3.0 video generation:', err);
      const classified = classifyFalError(err);
      res.status(500).json({
        success: false,
        code: classified.code,
        error: classified.userMessage,
        detail: classified.message,
      });
    }
  });

  // 7. Check Kling Animation Status
  app.get('/api/animate-slide/status/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const currentKey = (process.env.FAL_KEY || '').trim();
      if (!currentKey) {
        return res.status(400).json({ error: 'FAL_KEY belum dikonfigurasi.' });
      }

      fal.config({ credentials: currentKey });

      const queueStatus: any = await fal.queue.status('fal-ai/kling-video/v3/pro/image-to-video', {
        requestId,
        logs: false,
      });

      if (queueStatus.status === 'COMPLETED') {
        const result: any = await fal.queue.result('fal-ai/kling-video/v3/pro/image-to-video', {
          requestId,
        });
        const videoUrl = result?.data?.video?.url || result?.video?.url || result?.data?.url;
        return res.json({
          status: 'Completed',
          videoUrl,
        });
      }

      if (queueStatus.status === 'IN_PROGRESS') {
        return res.json({ status: 'Generating' });
      }

      if (queueStatus.status === 'IN_QUEUE') {
        return res.json({ status: 'Queued' });
      }

      res.json({ status: queueStatus.status });
    } catch (err: any) {
      const classified = classifyFalError(err);
      res.status(500).json({
        status: 'Failed',
        code: classified.code,
        error: classified.userMessage,
        detail: classified.message,
      });
    }
  });

  // 8. Generate UGC Script & Storyboard + Google Flow Prompt Pack (NO video generation)
  app.post('/api/generate-ugc-pack', async (req, res) => {
    try {
      const {
        project,
        masterAnalysis,
        objective = 'Consideration',
        platform = 'Instagram Reels',
        duration = '30 sec',
        talentPersona = 'Ibu muda milenial cerdas & stylish',
        targetAudience = 'Keluarga muda',
        tone = 'Natural',
        formula = 'Hook → Problem → Solution → CTA',
        additionalInstructions = '',
      } = req.body;

      const prompt = `Anda adalah Executive Producer & Creative Director spesialis UGC Video Real Estate viral untuk Agung Podomoro Land.
Tugas Anda adalah membuat PRODUKSI KONTEN LENGKAP untuk UGC yang siap diproduksi manual dan dimasukkan ke Google Flow.
TIDAK ADA GENERASI VIDEO DI SINI. HANYA STRATEGI, SCRIPT, STORYBOARD, DAN GOOGLE FLOW PROMPT PACK.

PROYEK:
- Nama: ${project?.name || 'Properti Modern'}
- Tipe/Harga: ${project?.type || 'Hunian'} / ${project?.price || 'Sesuai Pasar'}
- Lokasi: ${project?.location || 'Indonesia'}
- Keunggulan: ${(masterAnalysis?.property_usp || []).join(', ') || project?.features || 'Fasilitas lengkap'}
- Karakter Fasad: ${masterAnalysis?.architectural_style || 'Modern Tropis Kontemporer'}

BRIEF UGC:
- Campaign Objective: ${objective}
- Platform: ${platform}
- Durasi: ${duration}
- Talent Persona: ${talentPersona}
- Target Audience: ${targetAudience}
- Tone: ${tone}
- Formula: ${formula}
- Tambahan: ${additionalInstructions}

FORMAT KELUARAN JSON YANG HARUS DIPENUHI DENGAN DISIPLIN:
{
  "strategy": {
    "objective": "${objective}",
    "audience_insight": "Insight mendalam tentang keraguan atau aspirasi target audiens",
    "big_idea": "Satu ide besar cerita UGC",
    "hook_strategy": "Taktik psikologis 3 detik pertama"
  },
  "full_script": {
    "title": "Judul Script UGC",
    "duration": "${duration}",
    "spoken_script": "Naskah narasi lengkap bahasa Indonesia natural, santai (bukan korporat kaku), dengan jeda emosional.",
    "delivery_notes": "Panduan intonasi, ekspresi wajah, dan gestur tubuh talent."
  },
  "storyboard": [
    {
      "scene_number": 1,
      "duration": "0:00 - 0:05",
      "purpose": "Hook Opening",
      "visual": "Talent berdiri di teras rumah memegang smartphone dengan ekspresi kagum",
      "dialogue": "Jujur, tadinya aku ragu ada rumah 2 lantai se-estetik ini...",
      "talent_action": "Menunjuk ke arah fasad rumah sambil tersenyum hangat",
      "camera_framing": "Vertical handheld selfie POV",
      "camera_movement": "Natural handheld breathing camera",
      "environment": "Depan fasad master rumah, sinar matahari sore hangat",
      "lighting": "Natural golden hour",
      "property_visibility": "Fasad depan dan carport terlihat jelas di latar belakang",
      "continuity_note": "Pakaian kasual netral sama di setiap scene",
      "google_flow_prompt": "REFERENCE\\nUse @Talent as the exact recurring talent reference.\\nUse @Property as the exact architectural property reference.\\n\\nSCENE\\nAuthentic Indonesian smartphone UGC video. Young woman in stylish neutral casual wear holding camera in selfie mode in front of a modern two-story residential house facade.\\n\\nACTION\\nSmiling warmly and gesturing toward the house behind her.\\n\\nDIALOGUE\\n\\\"Jujur, tadinya aku ragu ada rumah se-estetik ini...\\\"\\n\\nCAMERA\\nVertical 9:16 smartphone camera, natural handheld micro-movements, authentic focal length.\\n\\nSTYLE\\nauthentic Indonesian smartphone UGC, realistic, natural imperfect handheld movement.\\n\\nCONTINUITY\\nsame person, same clothing, same property, same architectural geometry.\\n\\nAVOID\\nno building redesign, no changing talent identity, no text artifacts, no CGI morphing."
    }
  ],
  "ingredients_required": {
    "talent": "@Talent — Foto potret bersih talent yang konsisten",
    "property": "@Property — Foto Master Fasad Properti resmi",
    "product": "@Product — Opsional denah atau brosur digital"
  }
}

Buat storyboard berisi 3 hingga 5 scene yang proporsional sesuai durasi ${duration}.
Keluarkan HANYA JSON tanpa teks pengantar.`;

      const gptReply = await callGPTViaFal({
        messages: [
          { role: 'system', content: 'You are an award-winning UGC creative producer. Output only structured JSON matching the requested schema.' },
          { role: 'user', content: prompt },
        ],
        model: 'openai/gpt-5',
        responseFormatJson: true,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(gptReply);
      } catch (e) {
        throw new Error('Gagal memproses struktur JSON UGC dari GPT.');
      }

      res.json({
        success: true,
        pack: parsed,
      });
    } catch (err: any) {
      console.error('Error generating UGC pack:', err);
      const classified = classifyFalError(err);
      res.status(500).json({
        success: false,
        code: classified.code,
        error: classified.userMessage,
        detail: classified.message,
      });
    }
  });

  // 9. Generate Social Media Captions (Reasoning via GPT-5)
  app.post('/api/generate-captions', async (req, res) => {
    try {
      const { project, masterAnalysis, campaignAngle, tone = 'Luxury Editorial' } = req.body;

      const prompt = `Anda adalah Senior Social Media Copywriter spesialis properti prestisius Agung Podomoro Land.
Buat variasi caption Instagram untuk proyek "${project?.name || 'Hunian Modern'}":
- Keunggulan: ${(masterAnalysis?.property_usp || []).join(', ') || project?.features || 'Kawasan mandiri'}
- Lokasi: ${project?.location || 'Indonesia'}
- Tone: ${tone}
- Sudut Kampanye: ${campaignAngle || masterAnalysis?.campaign_angle || 'Investasi & Kenyamanan Masa Depan'}

Hasilkan JSON dengan format persis:
{
  "primaryCaption": "Caption storytelling utama yang elegan dan persuasif dengan paragraf teratur dan ajakan bertindak (CTA).",
  "shortCaption": "Caption singkat 2 kalimat untuk Instagram Reels/Story.",
  "callToAction": "Direct CTA dengan arahan DM / WhatsApp ke marketing gallery.",
  "hashtags": ["#AgungPodomoroLand", "#RumahImpian", "#PropertiIndonesia", "#InvestasiProperti", "#RumahMewah"],
  "storytelling": "Caption storytelling alternatif berfokus pada kehangatan momen keluarga di rumah baru.",
  "softselling": "Caption soft selling berfokus pada gaya hidup sehat dan kenyamanan lingkungan cluster.",
  "luxuryEditorial": "Caption gaya majalah arsitektur mewah bernuansa prestise tinggi."
}

Keluarkan HANYA JSON tanpa pengantar.`;

      const gptReply = await callGPTViaFal({
        messages: [
          { role: 'system', content: 'You are a luxury real estate copywriter. Output only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        model: 'openai/gpt-5',
        responseFormatJson: true,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(gptReply);
      } catch (e) {
        parsed = {
          primaryCaption: `Sebuah standar baru kenyamanan hidup modern hadir di ${project?.name || 'Agung Podomoro'}. Dirancang dengan fasad kontemporer dan tata ruang lapang untuk menyambut momen terbaik bersama keluarga tercinta.`,
          shortCaption: `Temukan hunian impian Anda di ${project?.name || 'kawasan prestisius kami'}. Hubungi kami untuk jadwal visit.`,
          callToAction: `Klik tautan di bio atau kirimkan DM untuk penawaran eksklusif minggu ini.`,
          hashtags: ['#AgungPodomoroLand', '#RumahModern', '#RealEstateIndonesia'],
        };
      }

      res.json({
        success: true,
        captions: parsed,
      });
    } catch (err: any) {
      console.error('Error generating captions:', err);
      const classified = classifyFalError(err);
      res.status(500).json({
        success: false,
        code: classified.code,
        error: classified.userMessage,
        detail: classified.message,
      });
    }
  });

  // Catch-all for undefined /api/* routes — MUST NEVER return HTML
  app.all('/api/*', (req, res) => {
    console.warn(`[404] API route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      error: 'API_ROUTE_NOT_FOUND',
      message: `API route tidak ditemukan: ${req.method} ${req.originalUrl}`,
      path: req.originalUrl,
    });
  });

  // Vite Dev Server Middleware mounting
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`[Affinity] Server running on port ${port} with Unified fal.ai Pipeline`);
  });
}

startServer();
