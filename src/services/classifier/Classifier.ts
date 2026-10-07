import type { Label } from '../../core/birdnet/labels';

export interface ClassifyResult {
  /** Max sigmoid score per class across windows. */
  scores: Float32Array;
  windows: number;
  windowMs: number[];
  totalMs: number;
}

export interface Classifier {
  readonly id: string;
  load(): Promise<void>;
  isLoaded(): boolean;
  labels(): Label[];
  /** `samples48k`: mono Float32 at 48 kHz in [-1, 1]. */
  classify(samples48k: Float32Array): Promise<ClassifyResult>;
}
