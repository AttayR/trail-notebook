// Prompt builders for Gemma 3. Gemma has no real system role (the chat template
// folds it into the first user turn), so we emit a single user message.
// Confidence goes in as words, not numbers: a 1B model handles words better.
import { confidenceWord } from '../birdnet/confidence';
import { formatClock, partOfDay, season } from '../context/time';
import type { ChatMessage, Detection, ObservationContext } from '../types';

export const MANUAL_MAX_CHARS = 200;

// Prompt v2 from the scored comparison in docs/build-log.md (prompt tuning):
// best format adherence with the fewest invented details on Gemma 3 1B Q4_0.
export const HEADER = [
  "You keep a walker's field notebook. Write like a naturalist's pocket journal: present tense, plain words.",
  'Use only the facts below. Do not add trees, plants, weather, colours, numbers, nests or other birds that are not in the facts.',
  'You may describe the sound or the moment. No emojis, no greetings.',
].join('\n');

export const FOOTER = [
  'Reply with exactly two lines:',
  'NOTE: (one or two short sentences, at most 30 words)',
  'NEXT: (one thing to do in the next few minutes, starting with a verb such as listen, look, wait or walk)',
  'Example with other facts. Facts: 18:05, evening, spring; Heard: Eurasian Wren (very likely).',
  'NOTE: A wren sings in the evening, loud and fast for such a small bird.',
  'NEXT: Wait a minute and listen for the song to start again from the same spot.',
].join('\n');

const LISTEN_RULE = 'Name the bird that was heard. Say "maybe" for anything only possible.';
const MANUAL_RULE = 'Do not state a species identity as fact. Do not name a species unless the walker did.';

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
  return wrap(
    [...contextLines(ctx), `- Heard (identified by BirdNET on this phone): ${heard || 'nothing clear'}`, alreadyLine(ctx)],
    [LISTEN_RULE],
  );
}

export function buildManualPrompt(text: string, ctx: ObservationContext): ChatMessage[] {
  return wrap(
    [...contextLines(ctx), `- The walker noticed: "${sanitizeInput(text)}"`, alreadyLine(ctx)],
    [MANUAL_RULE],
  );
}
