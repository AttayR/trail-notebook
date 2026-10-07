// App-wide configuration: model manifest, thresholds, LLM params, timeouts.
// Model weights are downloaded at runtime and never committed to git.

export type ModelKind = 'llm' | 'classifier' | 'labels';

export interface ModelManifestEntry {
  id: string;
  kind: ModelKind;
  displayName: string;
  url: string;
  filename: string;
  /** Exact expected size in bytes. Used as the integrity check after download. */
  bytes: number;
  license: string;
  licenseUrl: string;
}

export const GEMMA_1B_Q4_0: ModelManifestEntry = {
  id: 'gemma-3-1b-it-Q4_0',
  kind: 'llm',
  displayName: 'Gemma 3 1B IT (Q4_0)',
  url: 'https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_0.gguf',
  filename: 'gemma-3-1b-it-Q4_0.gguf',
  bytes: 721_918_496,
  license: 'Gemma Terms of Use',
  licenseUrl: 'https://ai.google.dev/gemma/terms',
};

/** Fallback F-L2 and a fast option for simulator testing. */
export const GEMMA_270M_Q8_0: ModelManifestEntry = {
  id: 'gemma-3-270m-it-Q8_0',
  kind: 'llm',
  displayName: 'Gemma 3 270M IT (Q8_0)',
  url: 'https://huggingface.co/unsloth/gemma-3-270m-it-GGUF/resolve/main/gemma-3-270m-it-Q8_0.gguf',
  filename: 'gemma-3-270m-it-Q8_0.gguf',
  bytes: 291_546_144,
  license: 'Gemma Terms of Use',
  licenseUrl: 'https://ai.google.dev/gemma/terms',
};

const LLM_VARIANTS: Record<string, ModelManifestEntry> = {
  '1b': GEMMA_1B_Q4_0,
  '270m': GEMMA_270M_Q8_0,
};

/**
 * Active LLM. Override at bundle time with EXPO_PUBLIC_LLM_VARIANT=270m
 * (e.g. for quick simulator checks). Default is the 1B model.
 */
export const ACTIVE_LLM: ModelManifestEntry =
  LLM_VARIANTS[process.env.EXPO_PUBLIC_LLM_VARIANT ?? '1b'] ?? GEMMA_1B_Q4_0;

/** Models that must be present before the app leaves Setup. BirdNET is added in T9. */
export const REQUIRED_MODELS: ModelManifestEntry[] = [ACTIVE_LLM];

export const MODELS_DIR_NAME = 'models';

export const LLM_PARAMS = {
  nCtx: 1024,
  nPredict: 120,
  temperature: 0.4,
  topP: 0.9,
  stop: ['<end_of_turn>', '<eos>'],
  /** Metal on iOS devices; ignored by the simulator build. */
  nGpuLayersIos: 99,
  nGpuLayersAndroid: 0,
  timeoutMs: 30_000,
};

export const MANUAL_INPUT_MAX_CHARS = 200;

export const CONFIDENCE = {
  veryLikely: 0.8,
  likely: 0.5,
  possible: 0.15,
};

export const LISTEN = {
  seconds: 9,
  sampleRate: 48_000,
  windowSamples: 144_000,
  hopSamples: 72_000,
  topK: 3,
};

export const LOCATION_TIMEOUT_MS = 5_000;
