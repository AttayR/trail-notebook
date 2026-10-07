import type { ConfidenceWord } from '../types';

export const CONFIDENCE_THRESHOLDS = {
  veryLikely: 0.8,
  likely: 0.5,
  possible: 0.15,
} as const;

/** Map a 0..1 score to a word. Below the "possible" threshold returns null (not shown). */
export function confidenceWord(score: number): ConfidenceWord | null {
  if (score >= CONFIDENCE_THRESHOLDS.veryLikely) return 'very likely';
  if (score >= CONFIDENCE_THRESHOLDS.likely) return 'likely';
  if (score >= CONFIDENCE_THRESHOLDS.possible) return 'possible';
  return null;
}
