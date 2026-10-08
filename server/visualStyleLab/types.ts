export const NANO_MODEL_ID = 'fal-ai/nano-banana-pro/edit' as const;
export const SEEDREAM_MODEL_ID = 'bytedance/seedream/v5/pro/edit' as const;

export interface FalImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

export interface FalSubscriptionResult {
  data?: { images?: FalImage[] };
  images?: FalImage[];
  requestId?: string;
  request_id?: string;
}

export interface FalRunner {
  subscribe: (
    modelId: string,
    options: {
      input: Record<string, unknown>;
      onEnqueue?: (requestId: string) => void;
    },
  ) => Promise<FalSubscriptionResult>;
}

export interface LabScene {
  index: number;
  id: string;
  name: string;
  compiled_prompt: string;
}

export interface LabStyle {
  id: string;
  name: string;
  scenes: LabScene[];
}

export interface LabPresetLibrary {
  schema_version: string;
  finishing_prompt: string;
  styles: LabStyle[];
  run_policy: {
    scenes_per_style: number;
    separate_calls_required: boolean;
    maximum_concurrency: number;
    default_paid_generation: boolean;
  };
}

export interface DryRunInput {
  styleId: string;
  referenceUrls: string[];
  verifiedFacts?: string[];
}

export interface CompiledScene {
  index: number;
  id: string;
  name: string;
  prompt: string;
}

export interface SlideGenerationResult {
  sceneId: string;
  sceneIndex: number;
  sceneName: string;
  modelId: typeof NANO_MODEL_ID;
  status: 'succeeded' | 'failed';
  imageUrl?: string;
  requestId?: string;
  error?: string;
}
