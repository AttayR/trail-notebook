// BirdNET post-processing: logits -> sigmoid -> max over windows -> top-k detections.
import type { Detection } from '../types';
import { CONFIDENCE_THRESHOLDS } from './confidence';
import type { Label } from './labels';

export { confidenceWord, CONFIDENCE_THRESHOLDS } from './confidence';

/** BirdNET's flat sigmoid with sensitivity (default 1.0), as in BirdNET-Analyzer. */
export function sigmoid(x: number, sensitivity = 1): number {
  return 1 / (1 + Math.exp(-sensitivity * x));
}

/** Element-wise max of sigmoid(logits) across windows. */
export function maxOverWindows(windowLogits: Float32Array[], sensitivity = 1): Float32Array {
  if (windowLogits.length === 0) return new Float32Array(0);
  const n = windowLogits[0].length;
  const out = new Float32Array(n);
  for (const logits of windowLogits) {
    if (logits.length !== n) throw new Error('window outputs differ in length');
    for (let i = 0; i < n; i++) {
      const p = sigmoid(logits[i], sensitivity);
      if (p > out[i]) out[i] = p;
    }
  }
  return out;
}

/** Top-k classes with score >= minScore, descending. */
export function topK(scores: Float32Array, k: number, minScore: number = CONFIDENCE_THRESHOLDS.possible): { index: number; score: number }[] {
  const picked: { index: number; score: number }[] = [];
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    if (s < minScore) continue;
    if (picked.length < k) {
      picked.push({ index: i, score: s });
      picked.sort((a, b) => b.score - a.score);
    } else if (s > picked[k - 1].score) {
      picked[k - 1] = { index: i, score: s };
      picked.sort((a, b) => b.score - a.score);
    }
  }
  return picked;
}

export function toDetections(scores: Float32Array, labels: Label[], k = 3, minScore?: number): Detection[] {
  return topK(scores, k, minScore).map(({ index, score }, i) => ({
    labelIndex: index,
    scientific: labels[index]?.scientific ?? `class ${index}`,
    common: labels[index]?.common ?? `class ${index}`,
    confidence: score,
    rank: i + 1,
  }));
}

/** True when the best detection reaches the "likely" threshold. */
export function isConfident(detections: Detection[]): boolean {
  return detections.length > 0 && detections[0].confidence >= CONFIDENCE_THRESHOLDS.likely;
}

/**
 * BirdNET V2.4 environmental (non-bird) classes, plus a plain phrase for the UI.
 * These never appear as alternates or in the Gemma prompt.
 */
export const NON_BIRD_PHRASES: Record<string, string> = {
  Dog: 'a dog',
  Engine: 'an engine',
  Environmental: 'background noise',
  Fireworks: 'fireworks',
  Gun: 'a gunshot',
  'Human non-vocal': 'people moving about',
  'Human vocal': 'people talking',
  'Human whistle': 'a human whistle',
  Noise: 'noise',
  'Power tools': 'power tools',
  Siren: 'a siren',
};

export function isNonBird(label: Label | undefined): boolean {
  return !!label && label.scientific === label.common && label.common in NON_BIRD_PHRASES;
}

export interface ListenOutcome {
  /** Bird detections only, ranked 1..k. */
  detections: Detection[];
  /** Set when a non-bird class wins overall with at least "likely" confidence. */
  nonBird: { common: string; phrase: string; confidence: number } | null;
}

/**
 * Bird-only top-k. If a non-bird class (e.g. "Human whistle") is the overall top-1,
 * is at least "likely", and beats the best bird, report it instead of naming a species.
 */
export function analyzeScores(scores: Float32Array, labels: Label[], k = 3, minScore?: number): ListenOutcome {
  const birdScores = new Float32Array(scores);
  let bestNonBird = -1;
  for (let i = 0; i < scores.length; i++) {
    if (isNonBird(labels[i])) {
      if (bestNonBird < 0 || scores[i] > scores[bestNonBird]) bestNonBird = i;
      birdScores[i] = 0;
    }
  }
  const detections = toDetections(birdScores, labels, k, minScore);
  const topBird = detections[0]?.confidence ?? 0;
  const nb = bestNonBird >= 0 ? scores[bestNonBird] : 0;
  const nonBird =
    bestNonBird >= 0 && nb >= CONFIDENCE_THRESHOLDS.likely && nb > topBird
      ? { common: labels[bestNonBird].common, phrase: NON_BIRD_PHRASES[labels[bestNonBird].common], confidence: nb }
      : null;
  return { detections: nonBird ? [] : detections, nonBird };
}
