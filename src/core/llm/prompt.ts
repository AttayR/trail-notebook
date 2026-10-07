// Prompt builders for Gemma 3. Gemma has no real system role (the chat template
// folds it into the first user turn), so we emit a single user message.
// Confidence goes in as words, not numbers: a 1B model handles words better.
import { confidenceWord } from '../birdnet/confidence';
import { formatClock, partOfDay, season } from '../context/time';
import type { ChatMessage, Detection, ObservationContext } from '../types';

export const MANUAL_MAX_CHARS = 200;

const HEADER =
  "You write one entry in a walker's field notebook. Use only the facts below. " +
  'Calm, concrete, no emojis, no greetings.';

const FOOTER = [
  'Write exactly two lines:',
  'NOTE: one or two sentences for the journal.',
  'NEXT: one short thing to look or listen for in the next few minutes, phrased as an action outdoors.',
].join('\n');

/** Collapse whitespace and neutralise characters that could break the facts block. */
export function sanitizeInput(text: string, max = MANUAL_MAX_CHARS): string {
  const clean = text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() : clean;
}

function placeLine(ctx: ObservationContext): string | null {
  const spot = ctx.spotName ? sanitizeInput(ctx.spotName, 60) : '';
  if (spot) return `- Place: ${spot}`;
  return null;
}

function contextLines(ctx: ObservationContext): string[] {
  const lines = [`- Time: ${formatClock(ctx.date)}, ${partOfDay(ctx.date)}, ${season(ctx.date, ctx.lat)}`];
  const place = placeLine(ctx);
  if (place) lines.push(place);
  return lines;
}

function alreadyLine(ctx: ObservationContext): string | null {
  const names = Array.from(new Set((ctx.alreadyToday ?? []).filter(Boolean))).slice(0, 5);
  return names.length ? `- Already logged today: ${names.join(', ')}` : null;
}

/** Detections rendered as "Common Myna (very likely); House Sparrow (possible)". */
export function describeDetections(detections: Detection[]): string {
  return detections
    .map((d) => ({ d, w: confidenceWord(d.confidence) }))
    .filter((x) => x.w !== null)
    .map(({ d, w }) => `${d.common} (${w})`)
    .join('; ');
}

function wrap(lines: (string | null)[], extra: string[] = []): ChatMessage[] {
  const facts = lines.filter((l): l is string => !!l);
  const content = [HEADER, ...extra, 'Facts:', ...facts, FOOTER].join('\n');
  return [{ role: 'user', content }];
}

export function buildListenPrompt(detections: Detection[], ctx: ObservationContext): ChatMessage[] {
  const heard = describeDetections(detections);
  return wrap([
    ...contextLines(ctx),
    `- Heard (identified by BirdNET on this phone): ${heard || 'nothing clear'}`,
    alreadyLine(ctx),
  ]);
}

export function buildManualPrompt(text: string, ctx: ObservationContext): ChatMessage[] {
  return wrap(
    [...contextLines(ctx), `- The walker noticed: "${sanitizeInput(text)}"`, alreadyLine(ctx)],
    ['Do not state a species identity as fact.'],
  );
}
