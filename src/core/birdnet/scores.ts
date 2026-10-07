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
