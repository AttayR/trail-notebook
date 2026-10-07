// Manual observation flow (the demo floor): text -> context -> Gemma (or template) -> SQLite.
import { useCallback, useRef, useState } from 'react';

import { LLM_PARAMS } from '../config';
import { startOfLocalDay } from '../core/context/time';
import { buildManualPrompt, sanitizeInput } from '../core/llm/prompt';
import { templateManualNote } from '../core/llm/template';
import type { NoteResult, ObservationContext } from '../core/types';
import { makeId } from '../core/util/id';
import { insertEntry, speciesSince, updateEntryNote } from '../services/db/entries';
import { kv } from '../services/kv';
import { gemmaWriter } from '../services/llm/gemmaWriter';
import type { NoteWriter } from '../services/llm/NoteWriter';
import { writeNoteWithFallback } from '../services/llm/writeNote';
import { getCoarseLocation } from '../services/location';

export type NotePhase = 'idle' | 'locating' | 'writing' | 'done' | 'error';

export interface NoteCardState {
  phase: NotePhase;
  input: string;
  streaming: string | null;
  result: NoteResult | null;
  saved: boolean;
  error: string | null;
  elapsedMs: number | null;
}

const failingWriter: NoteWriter = {
  ...gemmaWriter,
  modelId: gemmaWriter.modelId,
  getState: () => gemmaWriter.getState(),
  getError: () => gemmaWriter.getError(),
  subscribe: (l) => gemmaWriter.subscribe(l),
  load: () => Promise.resolve(),
  release: () => Promise.resolve(),
  write: () => Promise.reject(new Error('forced failure (dev)')),
};

const IDLE: NoteCardState = {
  phase: 'idle',
  input: '',
  streaming: null,
  result: null,
  saved: false,
  error: null,
  elapsedMs: null,
};

export interface SubmitOptions {
  /** Override the soft timeout (dev verification of the template path). */
  timeoutMs?: number;
  /** Skip Gemma entirely, as if it failed (dev verification). */
  forceTemplate?: boolean;
}

export function useManualNote() {
  const [state, setState] = useState<NoteCardState>(IDLE);
  const busy = useRef(false);

  const submit = useCallback(async (rawText: string, spotName: string, opts: SubmitOptions = {}) => {
    const text = sanitizeInput(rawText);
    if (!text || busy.current) return;
    busy.current = true;
    const t0 = Date.now();
    const id = makeId(t0);
    const spot = spotName.trim() || null;
    if (spot) kv.setLastSpotName(spot);
    setState({ ...IDLE, phase: 'locating', input: text });

    try {
      const [loc, alreadyToday] = await Promise.all([
        getCoarseLocation(),
        speciesSince(startOfLocalDay(new Date(t0))).catch(() => [] as string[]),
      ]);
      const ctx: ObservationContext = {
        date: new Date(t0),
        lat: loc?.lat ?? null,
        lon: loc?.lon ?? null,
        spotName: spot,
        alreadyToday,
      };
      const fallback = templateManualNote(text, ctx);
      const base = {
        id,
        createdAt: t0,
        mode: 'manual' as const,
        manualText: text,
        spotName: spot,
        lat: ctx.lat ?? null,
        lon: ctx.lon ?? null,
        modelId: gemmaWriter.modelId,
        offline: null,
        walkId: null,
      };
      let saved = false;
      let chain: Promise<void> = Promise.resolve();
      // Serialised so the late Gemma update never runs before the template insert.
      const save = (r: NoteResult) => {
        const first = !saved;
        saved = true;
        const row = { note: r.note, nextNudge: r.next, noteSource: r.source, rawOutput: r.raw || null };
        chain = chain.then(() => (first ? insertEntry({ ...base, ...row }) : updateEntryNote(id, row)));
        return chain;
      };

      setState((s) => ({ ...s, phase: 'writing', streaming: '' }));
      const writer = opts.forceTemplate ? failingWriter : gemmaWriter;
      const final = await writeNoteWithFallback(writer, buildManualPrompt(text, ctx), fallback, {
        timeoutMs: opts.timeoutMs ?? LLM_PARAMS.timeoutMs,
        onToken: (acc) => setState((s) => (s.result ? s : { ...s, streaming: acc })),
        onTimeout: (template) => {
          // Show and save the template now; Gemma's text replaces it if it finishes.
          setState((s) => ({ ...s, result: template, streaming: null }));
          save(template).catch((e) => console.warn('[note] template save failed', e));
        },
      });
      if (!saved || final.source === 'gemma') await save(final);
      const elapsedMs = Date.now() - t0;
      console.log(`[note] manual entry ${id} source=${final.source} ${elapsedMs}ms`);
      setState((s) => ({ ...s, phase: 'done', streaming: null, result: final, saved: true, elapsedMs }));
    } catch (e) {
      setState((s) => ({ ...s, phase: 'error', streaming: null, error: e instanceof Error ? e.message : String(e) }));
    } finally {
      busy.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    if (!busy.current) setState(IDLE);
  }, []);

  return { state, submit, reset };
}
