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

/**
 * BirdNET V2.4 FP16 TFLite. This file is byte-identical (SHA-256 5c64ba3f...546b)
 * to `audio-model-fp16.tflite` in the official Zenodo release
 * (doi:10.5281/zenodo.15050749, BirdNET_v2.4_tflite_fp16.zip). It is served
 * unzipped from the whoBIRD-TFlite mirror because the app cannot unzip.
 */
export const BIRDNET_MODEL: ModelManifestEntry = {
  id: 'birdnet-v2.4-fp16',
  kind: 'classifier',
  displayName: 'BirdNET V2.4 bird sound model',
  url: 'https://raw.githubusercontent.com/woheller69/whoBIRD-TFlite/master/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite',
  filename: 'BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite',
  bytes: 25_932_528,
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
};

/**
 * BirdNET V2.4 English labels (6,522 lines). Byte-identical to `labels/en_uk.txt`
 * in the official Zenodo release; served from the tphakala/BirdNET-v2.4 HF mirror.
 */
export const BIRDNET_LABELS: ModelManifestEntry = {
  id: 'birdnet-v2.4-labels-en',
  kind: 'labels',
  displayName: 'BirdNET species names',
  url: 'https://huggingface.co/tphakala/BirdNET-v2.4/resolve/main/labels.txt',
  filename: 'BirdNET_GLOBAL_6K_V2.4_Labels_en.txt',
  bytes: 259_894,
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
};

/** Models that must be present before the app leaves Setup. Small files first. */
export const REQUIRED_MODELS: ModelManifestEntry[] = [BIRDNET_LABELS, BIRDNET_MODEL, ACTIVE_LLM];

/** Dev-only: a WAV placed at Documents/<this> can replace the mic (see scripts/dev-fixture.sh). */
export const DEV_FIXTURE_FILENAME = 'dev-fixture.wav';

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


export const LISTEN = {
  seconds: 9,
  /** BirdNET sigmoid sensitivity (BirdNET-Analyzer default 1.0). */
  sensitivity: 1.0,
  sampleRate: 48_000,
  windowSamples: 144_000,
  hopSamples: 72_000,
  topK: 3,
};

export const LOCATION_TIMEOUT_MS = 5_000;
