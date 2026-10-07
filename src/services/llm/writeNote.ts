// Run Gemma with a soft timeout. If the timeout fires first, the caller gets the
// template note via onTimeout (so the walker sees something and the entry is
// saved), and Gemma keeps going; the returned promise resolves with the final
// note (Gemma's if it finishes, otherwise the template).
import { finalizeNote } from '../../core/llm/parse';
import type { ChatMessage, NoteResult, ParsedNote } from '../../core/types';
import type { NoteWriter } from './NoteWriter';

export interface WriteNoteOptions {
  onToken?: (accumulated: string) => void;
  onTimeout?: (template: NoteResult) => void;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Start of the model turn, e.g. "NOTE: Black-capped Chickadee" (default "NOTE:"). */
  prefill?: string;
}

export async function writeNoteWithFallback(
  writer: NoteWriter,
  messages: ChatMessage[],
  fallback: ParsedNote,
  opts: WriteNoteOptions,
): Promise<NoteResult> {
  const template: NoteResult = { ...fallback, source: 'template', raw: '' };
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    opts.onTimeout?.(template);
  }, opts.timeoutMs);
  try {
    const res = await writer.write(messages, (acc) => opts.onToken?.(acc), opts.signal, opts.prefill);
    if (res.aborted && !res.text.trim()) return template;
    // Facts = the prompt minus its fixed instructions, so a real "wren" sighting is not rejected.
    const facts = messages.map((m) => m.content.split('Facts:')[1]?.split('Reply with')[0] ?? '').join(' ');
    return finalizeNote(res.text, fallback, facts);
  } catch (e) {
    console.warn('[llm] write failed, using template', e);
    return template;
  } finally {
    clearTimeout(timer);
    if (timedOut) console.log('[llm] note exceeded soft timeout');
  }
}
