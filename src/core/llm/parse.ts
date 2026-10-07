// Extract NOTE / NEXT from raw model output, tolerating the ways a 1B model drifts.
import type { NoteResult, ParsedNote } from '../types';

const STOP_TOKENS = /<end_of_turn>|<eos>|<start_of_turn>(model|user)?/gi;

// Instruction text a small model may echo back; removed before use.
const ECHO = [
  /\(?one or two (calm |short )?sentences[^)\n]*\)?\.?/gi,
  /\(?one short thing to look or listen for[^.)\n]*\)?\.?/gi,
  /\(?one thing to do in the next few minutes[^)\n]*\)?\.?/gi,
];

function stripEcho(s: string): string {
  return ECHO.reduce((acc, re) => acc.replace(re, ' '), s);
}

function clean(s: string): string {
  return s
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*\(([^()]*)\)\.?\s*$/, '$1')
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

  let noteBody = noteMatch ? stripEcho(noteMatch[1]) : '';
  let next = nextMatch ? clean(stripEcho(nextMatch[1])) : '';

  // No NEXT label: a 1B model often puts the nudge in a final paragraph instead.
  if (!next && noteMatch) {
    const paras = noteBody.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paras.length >= 2) {
      next = clean(paras[paras.length - 1]);
      noteBody = paras.slice(0, -1).join(' ');
    }
  }
  let note = clean(noteBody);

  if (!note) {
    // No NOTE label: use whatever prose appears before NEXT (or all of it).
    const before = nextMatch ? text.slice(0, nextMatch.index) : text;
    note = clean(firstSentences(stripEcho(before).replace(/^\W*note\W*:/i, '').replace(/\n+/g, ' ')));
  }
  if (!note) return null;
  return { note, next };
}

/** Words that only appear in the prompt's style example; seeing them means the model copied it. */
const EXAMPLE_ONLY = /\b(wren|reservoir)\b/i;

/**
 * Combine a parse with a deterministic fallback. Missing NEXT is filled from the fallback.
 * Lines that copy the style example (unless the facts themselves mention those words)
 * are replaced by the fallback.
 */
export function finalizeNote(raw: string, fallback: ParsedNote, facts = ''): NoteResult {
  const parsed = parseNote(raw);
  if (!parsed) return { ...fallback, source: 'template', raw };
  const copied = (t: string) => EXAMPLE_ONLY.test(t) && !EXAMPLE_ONLY.test(facts);
  if (copied(parsed.note)) return { ...fallback, source: 'template', raw };
  const next = parsed.next && !copied(parsed.next) ? parsed.next : fallback.next;
  return { note: parsed.note, next, source: 'gemma', raw };
}
