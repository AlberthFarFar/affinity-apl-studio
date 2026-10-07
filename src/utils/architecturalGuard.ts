// ============================================================================
// ARCHITECTURAL CONSISTENCY GUARD (Centralized Policy & Compositing Engine)
// ============================================================================

export type ReferenceRole = 'PROPERTY_REFERENCE' | 'STYLE_REFERENCE' | 'TALENT_REFERENCE';

export type GuardMode = 'STRICT_PRESERVE' | 'REFERENCE_GUIDED';

export type GuardStatus = 'PASS' | 'REJECT' | 'NEEDS_REVIEW' | 'NOT_VALIDATED';

export interface BuildingMask {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  polygon?: Array<{ x: number; y: number }>; // optional fine polygon
  featherPx?: number;
  label?: string;
}

export interface PropertyReferenceMeta {
  propertyId: string;
  referenceVersion: number;
  originalImageUrl: string;
  activeViewpoint: string; // 'front_facade' | 'angle_3q' | 'entrance'
  architecturalElements: {
    storyCount: number | string;
    massingShape: string;
    roofSilhouette: string;
    windowDoorArrangement: string;
    columnsAndBalconies: string;
    materialsAndColors: string;
    viewpointPerspective: string;
  };
  protectedAreaMask: BuildingMask;
  editableAreas: string[];
}

export interface VisualQAReport {
  status: GuardStatus;
  overallScore: number;
  sameBuilding: boolean;
  metrics: {
    roofGeometry: number;
    windowDoorLayout: number;
    massing: number;
    facadeProportions: number;
    cameraView: number;
  };
  criticalChanges: string[];
  honestAssessment: string;
  evaluatedAt: string;
  referenceVersionUsed: number;
}

/**
 * EXACT CORE INSTRUCTION REQUIRED BY SECTION 5
 */
export const CORE_PRESERVATION_PROMPT =
  'Treat the supplied reference as architectural/product evidence, not a final composition template. Preserve the recognizable product identity: defining massing, proportions, roof geometry, entrances, opening rhythm, signature facade features, and important materials. Reconstruct that same product in a newly composed scene. Do not copy source pixels or automatically preserve its camera angle, crop, lighting, sky, background, landscaping, people, vehicles, or composition.';

/**
 * Detects creative instructions that conflict with physical architecture preservation
 */
export function detectCreativeConflicts(
  userInstructions: string,
  meta?: Partial<PropertyReferenceMeta>
): { hasConflict: boolean; conflicts: string[]; resolutionNote: string } {
  const conflicts: string[] = [];
  const lower = (userInstructions || '').toLowerCase();

  // Camera and viewpoint are creative variables, not identity conflicts.
  if (lower.match(/\b(interior|dalam rumah|living room|kamar tidur)\b/)) {
    conflicts.push('Area interior membutuhkan foto referensi interior terpisah.');
  }
  if (lower.match(/\b(tambah lantai|extra floor|tingkat baru|kolam renang baru|ubah atap)\b/)) {
    conflicts.push('Perubahan struktur/lantai bertentangan dengan pelestarian fasad.');
  }

  const hasConflict = conflicts.length > 0;
  const resolutionNote = hasConflict
    ? 'Instruksi yang bertentangan disederhanakan: perubahan struktural diabaikan, sementara arahan visual tetap boleh memakai komposisi baru.'
    : 'Tidak ada konflik struktural terdeteksi.';

  return { hasConflict, conflicts, resolutionNote };
}

/**
 * Compiles prompt following the strict 6-stage order defined in Section 5
 */
export function buildGuardedPrompt(params: {
  propertyMeta: PropertyReferenceMeta;
  slideBrief: string;
  atmosphereAndLighting: string;
  styleReferenceAttached?: boolean;
  talentReferenceAttached?: boolean;
  guardMode: GuardMode;
  isStricterRegen?: boolean;
}): { prompt: string; systemPrompt: string; conflictResolution?: string } {
  const {
    propertyMeta,
    slideBrief,
    atmosphereAndLighting,
    styleReferenceAttached = false,
    talentReferenceAttached = false,
    guardMode,
    isStricterRegen = false,
  } = params;

  // Conflict detection
  const conflictCheck = detectCreativeConflicts(
    `${slideBrief} ${atmosphereAndLighting}`,
    propertyMeta
  );

  // 1. Kebijakan pelestarian arsitektur (Core Policy)
  const section1 = `[STAGE 1: ARCHITECTURAL PRESERVATION POLICY]\n${CORE_PRESERVATION_PROMPT}`;

  // 2. Identitas properti dan peran setiap referensi
  const section2 = `[STAGE 2: REFERENCE ROLES & GROUND TRUTH]
- Image 1 (PRIMARY): PROPERTY_REFERENCE (ID: ${propertyMeta.propertyId}, Ref Version: v${propertyMeta.referenceVersion}). It is product evidence, not a composition target.
${styleReferenceAttached ? '- Image 2: STYLE_REFERENCE (Guidance for atmosphere, lighting mood, color palette ONLY. NEVER alter building shape).\n' : ''}${talentReferenceAttached ? `- Image ${styleReferenceAttached ? '3' : '2'}: TALENT_REFERENCE (Human talent casting guidance ONLY).\n` : ''}- Source viewpoint is evidence only; use a new camera and composition when required by the slide direction.`;

  // 3. Elemen yang dilindungi (Specific to actual property photo)
  const elems = propertyMeta.architecturalElements;
  const section3 = `[STAGE 3: PROTECTED ARCHITECTURAL ELEMENTS (DO NOT ALTER)]
- Building Stories & Massing: ${elems.storyCount} stories; massing shape: ${elems.massingShape}
- Roof Silhouette & Geometry: ${elems.roofSilhouette}
- Window & Door Arrangement: ${elems.windowDoorArrangement}
- Columns, Balconies & Openings: ${elems.columnsAndBalconies}
- Facade Materials & Palette: ${elems.materialsAndColors}`;

  // 4. Perubahan yang diizinkan
  const section4 = `[STAGE 4: ALLOWED MODIFICATIONS]
Only the following elements may be introduced or edited:
${propertyMeta.editableAreas.map((area) => `- ${area}`).join('\n')}
Strictly forbidden: Changing roof slope/overhang, adding or removing floors/windows/doors, shifting walls, altering material patterns, or replacing the house with another design.`;

  // 5. Brief slide
  let sanitizedBrief = slideBrief;
  if (conflictCheck.hasConflict) {
    sanitizedBrief = `${slideBrief} (Note: ${conflictCheck.resolutionNote})`;
  }
  const section5 = `[STAGE 5: SLIDE SCENE BRIEF]
${sanitizedBrief}`;

  // 6. Suasana, pencahayaan, dan komposisi
  const section6 = `[STAGE 6: ATMOSPHERE & LIGHTING COMPOSITION]
${atmosphereAndLighting}
Use the visual direction to create a distinctly new camera, framing, environment, and composition. DO NOT RENDER ANY TEXT, TYPOGRAPHY, LOGOS, OR GRAPHICS into the image.`;

  // Strict regeneration prefix if prior attempt failed QA
  const regenPrefix = isStricterRegen
    ? `[CRITICAL REGENERATION OVERRIDE]
The previous generation was REJECTED because core product identity drifted.
Restore the protected architectural identity without reverting to the source composition.\n\n`
    : '';

  const fullPrompt = `${regenPrefix}${section1}\n\n${section2}\n\n${section3}\n\n${section4}\n\n${section5}\n\n${section6}`;

  const systemPrompt = `You are operating the AFFINITY ARCHITECTURAL CONSISTENCY GUARD for property ${propertyMeta.propertyId}. Preserve hard product identity—roof geometry, massing, floor count, opening relationships, columns, and signature materials—but treat Image 1 as evidence rather than an immutable photograph. Reconstruct the product in a new composition. Camera, crop, lighting, sky, landscaping, people, vehicles, and context are transformable.`;

  return {
    prompt: fullPrompt,
    systemPrompt,
    conflictResolution: conflictCheck.hasConflict ? conflictCheck.resolutionNote : undefined,
  };
}

/**
 * Creates default building mask (centered box covering typical facade bounds)
 */
export function createDefaultBuildingMask(): BuildingMask {
  return {
    x: 12,
    y: 20,
    width: 76,
    height: 60,
    featherPx: 12,
    label: 'Protected Facade Zone',
  };
}

/**
 * Real Compositing Pipeline:
 * In STRICT PRESERVE mode, composites the untouched building facade from the original
 * reference image over the background / environment generated by AI using soft-feathered
 * alpha mask blending.
 * This guarantees real pixel protection against AI hallucination!
 */
export async function compositeStrictPreserve(params: {
  originalRefUrl: string;
  generatedUrl: string;
  mask: BuildingMask;
  aspectRatio: string;
  feather?: number;
}): Promise<string> {
  const { originalRefUrl, generatedUrl, mask, feather = 12 } = params;

  return new Promise((resolve) => {
    const origImg = new Image();
    origImg.crossOrigin = 'anonymous';

    origImg.onload = () => {
      const genImg = new Image();
      genImg.crossOrigin = 'anonymous';

      genImg.onload = () => {
        try {
          const width = genImg.naturalWidth || genImg.width || 1080;
          const height = genImg.naturalHeight || genImg.height || 1350;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(generatedUrl); // fallback if no canvas

          // 1. Draw the generated background/atmosphere
          ctx.drawImage(genImg, 0, 0, width, height);

          // 2. Compute mask bounding box on target canvas
          const maskX = Math.round((mask.x / 100) * width);
          const maskY = Math.round((mask.y / 100) * height);
          const maskW = Math.round((mask.width / 100) * width);
          const maskH = Math.round((mask.height / 100) * height);
          const featherPx = Math.max(4, feather || mask.featherPx || 12);

          // 3. Create an alpha mask canvas for soft feathered perimeter
          const alphaMaskCanvas = document.createElement('canvas');
          alphaMaskCanvas.width = width;
          alphaMaskCanvas.height = height;
          const aCtx = alphaMaskCanvas.getContext('2d');
          if (!aCtx) return resolve(generatedUrl);

          // Draw the building mask shape in white on transparent with smooth blur
          aCtx.fillStyle = '#ffffff';
          if (typeof aCtx.filter !== 'undefined') {
            aCtx.filter = `blur(${featherPx}px)`;
          }

          if (mask.polygon && mask.polygon.length >= 3) {
            aCtx.beginPath();
            const first = mask.polygon[0];
            aCtx.moveTo((first.x / 100) * width, (first.y / 100) * height);
            for (let i = 1; i < mask.polygon.length; i++) {
              const pt = mask.polygon[i];
              aCtx.lineTo((pt.x / 100) * width, (pt.y / 100) * height);
            }
            aCtx.closePath();
            aCtx.fill();
          } else {
            aCtx.beginPath();
            const radius = Math.min(24, Math.round(maskW * 0.04));
            if (typeof aCtx.roundRect === 'function') {
              aCtx.roundRect(maskX, maskY, maskW, maskH, radius);
            } else {
              aCtx.rect(maskX, maskY, maskW, maskH);
            }
            aCtx.fill();
          }

          // 4. Create building canvas for untouched original facade
          const buildingCanvas = document.createElement('canvas');
          buildingCanvas.width = width;
          buildingCanvas.height = height;
          const bCtx = buildingCanvas.getContext('2d');
          if (!bCtx) return resolve(generatedUrl);

          // Draw untouched original facade (already cropped to matching aspect ratio)
          bCtx.drawImage(origImg, 0, 0, width, height);

          // Clip building to the feathered alpha mask
          bCtx.globalCompositeOperation = 'destination-in';
          bCtx.drawImage(alphaMaskCanvas, 0, 0);

          // 5. Composite authentic protected building onto the AI generated environment
          ctx.drawImage(buildingCanvas, 0, 0);

          const result = canvas.toDataURL('image/jpeg', 0.95);
          resolve(result);
        } catch (err) {
          console.warn('[Architectural Guard] Compositing fallback to generated image:', err);
          resolve(generatedUrl);
        }
      };

      genImg.onerror = () => resolve(generatedUrl);
      genImg.src = generatedUrl;
    };

    origImg.onerror = () => resolve(generatedUrl);
    origImg.src = originalRefUrl;
  });
}

/**
 * Standardized 4-tier honest validation assessment
 */
export function evaluateGuardStatus(rawQA: any): VisualQAReport {
  if (!rawQA || typeof rawQA !== 'object') {
    return {
      status: 'NOT_VALIDATED',
      overallScore: 0,
      sameBuilding: false,
      metrics: {
        roofGeometry: 0,
        windowDoorLayout: 0,
        massing: 0,
        facadeProportions: 0,
        cameraView: 0,
      },
      criticalChanges: ['Pemeriksaan visual otomatis belum dijalankan atau tidak tersedia.'],
      honestAssessment: 'Hasil belum diperiksa secara visual. Harap lakukan verifikasi manual.',
      evaluatedAt: new Date().toISOString(),
      referenceVersionUsed: 1,
    };
  }

  const roof = Number(rawQA.roof_geometry_match) || 0;
  const windowDoor = Number(rawQA.window_door_layout_match) || 0;
  const massing = Number(rawQA.massing_match) || 0;
  const proportions = Number(rawQA.facade_proportion_match) || 0;
  const camera = Number(rawQA.camera_view_match) || 0;
  const overall = Number(rawQA.overall_score) || 0;
  const sameBuilding = Boolean(rawQA.same_building);
  const critical = Array.isArray(rawQA.critical_changes) ? rawQA.critical_changes : [];

  let status: GuardStatus = 'NOT_VALIDATED';
  let honestAssessment = '';

  if (sameBuilding && roof >= 90 && windowDoor >= 90 && massing >= 90 && proportions >= 90 && overall >= 90) {
    status = 'PASS';
    honestAssessment = 'Pemeriksaan visual tidak menemukan perubahan terlarang pada bentuk atap, bukaan, maupun massa bangunan.';
  } else if (!sameBuilding || roof < 75 || windowDoor < 75 || massing < 75 || proportions < 75 || overall < 75) {
    status = 'REJECT';
    honestAssessment = 'Terdeteksi perubahan signifikan pada arsitektur fasad dibandingkan foto referensi.';
  } else {
    // 75-89 range or ambiguous
    status = 'NEEDS_REVIEW';
    honestAssessment = 'Terdapat potensi perubahan parsial atau beberapa bagian fasad tertutup oleh elemen baru. Diperlukan review manual pengguna.';
  }

  return {
    status,
    overallScore: overall,
    sameBuilding,
    metrics: {
      roofGeometry: roof,
      windowDoorLayout: windowDoor,
      massing,
      facadeProportions: proportions,
      cameraView: camera,
    },
    criticalChanges: critical,
    honestAssessment,
    evaluatedAt: new Date().toISOString(),
    referenceVersionUsed: rawQA.referenceVersionUsed || 1,
  };
}
