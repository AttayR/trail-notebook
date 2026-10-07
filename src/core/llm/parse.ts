// Extract NOTE / NEXT from raw model output, tolerating the ways a 1B model drifts.
import type { NoteResult, ParsedNote } from '../types';

const STOP_TOKENS = /<end_of_turn>|<eos>|<start_of_turn>(model|user)?/gi;

function clean(s: string): string {
  return s
    .replace(/\*\*|__|`/g, '')
    .replace(/^[\s\-*>#:]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First one or two sentences of free text. */
function firstSentences(text: string, n = 2): string {
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts) return text.trim();
  return parts.slice(0, n).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Returns null when nothing usable was produced. `next` may be '' when the
 * model gave a note but no NEXT line; the caller fills it from the template.
 */
export function parseNote(raw: string): ParsedNote | null {
  const text = raw.replace(STOP_TOKENS, '').replace(/\r/g, '').trim();
  if (!text) return null;

  const noteMatch = /(?:^|\n)\W*note\W*:\s*([\s\S]*?)(?=\n\W*next\W*:|$)/i.exec(text);
  const nextMatch = /(?:^|\n)\W*next\W*:\s*([^\n]*)/i.exec(text);

  let note = noteMatch ? clean(noteMatch[1]) : '';
  const next = nextMatch ? clean(nextMatch[1]) : '';

  if (!note) {
    // No NOTE label: use whatever prose appears before NEXT (or all of it).
    const before = nextMatch ? text.slice(0, nextMatch.index) : text;
    note = clean(firstSentences(before.replace(/\n+/g, ' ')));
  }
  if (!note && !next) return null;
  if (!note) return null;
  return { note, next };
}

/** Combine a parse with a deterministic fallback. Missing NEXT is filled from the fallback. */
export function finalizeNote(raw: string, fallback: ParsedNote): NoteResult {
  const parsed = parseNote(raw);
  if (!parsed) return { ...fallback, source: 'template', raw };
  return { note: parsed.note, next: parsed.next || fallback.next, source: 'gemma', raw };
}
