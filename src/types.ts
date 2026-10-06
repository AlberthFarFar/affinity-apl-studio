export interface ProjectData {
  name: string;
  type: string;
  price: string;
  location: string;
  features: string;
  style: string;
  developer: string;
  contactPhone: string;
  website: string;
}

export interface MasterAnalysis {
  property_identity: string;
  architectural_style: string;
  target_audience: string;
  property_usp: string[];
  facade_lock: {
    immutable_features: string[];
    editable_environment_features: string[];
  };
  visual_style: string;
  brand_tone: string;
  campaign_angle: string;
  reference_images?: string[];
  // Compatibility fields
  locked: string[];
  flexible: string[];
  architecturalSummary: string;
}

export interface BlueprintSlide {
  index: number;
  slide_number?: number;
  slide_role?: string;
  narrative_purpose?: string;
  type: 'Hook' | 'Feature' | 'Lifestyle' | 'Benefit' | 'CTA' | string;
  headline: string;
  subheadline?: string;
  copy: string;
  subtext?: string;
  visual_direction: string;
  scene_description: string;
  casting_direction: string;
  camera_direction: string;
  lighting: string;
  facade_preservation_instruction: string;
  nano_banana_prompt: string;
  negative_constraints?: string;
  shot: string;
  badge?: string;
}

export type AspectRatioOption = '9:16' | '4:5' | '1:1' | '5:4' | '16:9';
export type ResolutionOption = '1K' | '2K' | '4K';
export type FacadeLockMode = 'strict' | 'creative';
export type GuardMode = 'STRICT_PRESERVE' | 'REFERENCE_GUIDED';
export type GuardStatus = 'PASS' | 'REJECT' | 'NEEDS_REVIEW' | 'NOT_VALIDATED';
export type ReferenceRole = 'PROPERTY_REFERENCE' | 'STYLE_REFERENCE' | 'TALENT_REFERENCE';
export type ImageGenerationEngine = 'nano-banana' | 'seedream';

export interface BuildingMask {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  polygon?: Array<{ x: number; y: number }>;
  featherPx?: number;
  label?: string;
}

export interface PropertyReferenceMeta {
  propertyId: string;
  referenceVersion: number;
  originalImageUrl: string;
  activeViewpoint: string;
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

export interface VisualQAResult {
  status?: GuardStatus;
  same_building: boolean;
  roof_geometry_match: number;
  window_door_layout_match: number;
  massing_match: number;
  facade_proportion_match: number;
  camera_view_match: number;
  critical_changes: string[];
  overall_score: number;
  pass: boolean;
  honest_assessment?: string;
  reference_version_used?: number;
}

export interface KlingAnimationConfig {
  preset: 'Subtle Cinematic' | 'Slow Dolly In' | 'Architectural Reveal' | 'Lifestyle Motion' | 'Custom';
  duration: '5' | '10';
  audio: boolean;
  prompt: string;
}

export interface VideoJobStatus {
  status: 'Ready' | 'Queued' | 'Generating' | 'Completed' | 'Failed';
  requestId?: string;
  videoUrl?: string;
  error?: string;
}

export interface UGCScene {
  scene_number: number;
  duration: string;
  purpose: string;
  visual: string;
  dialogue: string;
  talent_action: string;
  camera_framing: string;
  camera_movement: string;
  environment: string;
  lighting: string;
  property_visibility: string;
  continuity_note: string;
  google_flow_prompt: string;
}

export interface UGCPack {
  strategy: {
    objective: string;
    audience_insight: string;
    big_idea: string;
    hook_strategy: string;
  };
  full_script: {
    title: string;
    duration: string;
    spoken_script: string;
    delivery_notes: string;
  };
  storyboard: UGCScene[];
  ingredients_required: {
    talent: string;
    property: string;
    product?: string;
  };
}

export interface CaptionsData {
  primaryCaption: string;
  shortCaption: string;
  callToAction: string;
  hashtags: string[];
  // Compatibility fields
  storytelling?: string;
  softselling?: string;
  luxuryEditorial?: string;
}
