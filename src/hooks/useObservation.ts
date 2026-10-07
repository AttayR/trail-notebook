// One state machine for both ways of making an entry:
//  - manual: text -> context -> Gemma (or template) -> SQLite
//  - listen: mic (or dev fixture) -> BirdNET -> detections -> Gemma -> SQLite
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

import { LISTEN, LLM_PARAMS } from '../config';
import { isConfident, toDetections } from '../core/birdnet/scores';
import { startOfLocalDay } from '../core/context/time';
import { listenPrefill } from '../core/llm/gemmaFormat';
import { buildListenPrompt, buildManualPrompt, sanitizeInput } from '../core/llm/prompt';
import { templateListenNote, templateManualNote } from '../core/llm/template';
import type { ChatMessage, Detection, EntryMode, NoteResult, ObservationContext, ParsedNote } from '../core/types';
import { makeId } from '../core/util/id';
import { captureSeconds } from '../services/audio/recorder';
import { loadDevFixture } from '../services/audio/devFixture';
import { birdnet } from '../services/classifier/tfliteClassifier';
import { insertEntry, speciesSince, updateEntryNote } from '../services/db/entries';
import { kv } from '../services/kv';
import { gemmaWriter } from '../services/llm/gemmaWriter';
import type { NoteWriter } from '../services/llm/NoteWriter';
import { writeNoteWithFallback } from '../services/llm/writeNote';
import { getCoarseLocation, type CoarseLocation } from '../services/location';
import { recordMetric } from '../services/metrics';
import { isOffline } from '../services/network';

export type ObservationPhase =
  | 'idle'
  | 'recording'
  | 'classifying'
  | 'locating'
  | 'writing'
  | 'done'
  | 'nothing'
  | 'error';

export interface ObservationState {
  phase: ObservationPhase;
  mode: EntryMode | null;
  input: string;
  progress: number;
  level: number;
  detections: Detection[];
  streaming: string | null;
  result: NoteResult | null;
  saved: boolean;
  error: string | null;
  elapsedMs: number | null;
  offline: boolean | null;
}

export interface RunOptions {
  /** Override the soft timeout (dev verification of the template path). */
  timeoutMs?: number;
  /** Skip Gemma entirely, as if it failed (dev verification). */
  forceTemplate?: boolean;
}

export type AudioSource = 'mic' | 'fixture';

const IDLE: ObservationState = {
  phase: 'idle',
  mode: null,
  input: '',
  progress: 0,
  level: 0,
  detections: [],
  streaming: null,
  result: null,
  saved: false,
  error: null,
  elapsedMs: null,
  offline: null,
};

const failingWriter: NoteWriter = {
  modelId: gemmaWriter.modelId,
  getState: () => gemmaWriter.getState(),
  getError: () => gemmaWriter.getError(),
  subscribe: (l) => gemmaWriter.subscribe(l),
  load: () => Promise.resolve(),
  release: () => Promise.resolve(),
  write: () => Promise.reject(new Error('forced failure (dev)')),
};

export function useObservation() {
  const [state, setState] = useState<ObservationState>(IDLE);
  const busy = useRef(false);
  const patch = useCallback((p: Partial<ObservationState>) => setState((s) => ({ ...s, ...p })), []);

  /** Shared tail: context -> Gemma/template -> save. */
  const writeAndSave = useCallback(
    async (args: {
      id: string;
      t0: number;
      mode: EntryMode;
      manualText: string | null;
      spot: string | null;
      loc: CoarseLocation | null;
      offline: boolean | null;
      detections: Detection[];
      buildMessages: (ctx: ObservationContext) => ChatMessage[];
      buildFallback: (ctx: ObservationContext) => ParsedNote;
      prefill?: string;
      opts: RunOptions;
    }) => {
      const { id, t0, mode, spot, loc, detections, opts } = args;
      const alreadyToday = await speciesSince(startOfLocalDay(new Date(t0))).catch(() => [] as string[]);
      const ctx: ObservationContext = {
        date: new Date(t0),
        lat: loc?.lat ?? null,
        lon: loc?.lon ?? null,
        spotName: spot,
        alreadyToday: alreadyToday.filter((n) => !detections.some((d) => d.common === n)),
      };
      const base = {
        id,
        createdAt: t0,
        mode,
        manualText: args.manualText,
        spotName: spot,
        lat: ctx.lat ?? null,
        lon: ctx.lon ?? null,
        modelId: gemmaWriter.modelId,
        offline: args.offline,
        walkId: null,
        detections,
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

      patch({ phase: 'writing', streaming: '' });
      const writer = opts.forceTemplate ? failingWriter : gemmaWriter;
      const final = await writeNoteWithFallback(writer, args.buildMessages(ctx), args.buildFallback(ctx), {
        timeoutMs: opts.timeoutMs ?? LLM_PARAMS.timeoutMs,
        prefill: args.prefill,
        onToken: (acc) => setState((s) => (s.result ? s : { ...s, streaming: acc })),
        onTimeout: (template) => {
          setState((s) => ({ ...s, result: template, streaming: null }));
          save(template).catch((e) => console.warn('[note] template save failed', e));
        },
      });
      if (!saved || final.source === 'gemma') await save(final);
      return final;
    },
    [patch],
  );

  const runManual = useCallback(
    async (rawText: string, spotName: string, opts: RunOptions = {}) => {
      const text = sanitizeInput(rawText);
      if (!text || busy.current) return;
      busy.current = true;
      const t0 = Date.now();
      const id = makeId(t0);
      const spot = spotName.trim() || null;
      if (spot) kv.setLastSpotName(spot);
      setState({ ...IDLE, phase: 'locating', mode: 'manual', input: text });
      try {
        const [loc, offline] = await Promise.all([getCoarseLocation(), isOffline()]);
        patch({ offline });
        const final = await writeAndSave({
          id,
          t0,
          mode: 'manual',
          manualText: text,
          spot,
          loc,
          offline,
          detections: [],
          buildMessages: (ctx) => buildManualPrompt(text, ctx),
          buildFallback: (ctx) => templateManualNote(text, ctx),
          opts,
        });
        const elapsedMs = Date.now() - t0;
        console.log(`[note] manual entry ${id} source=${final.source} offline=${offline} ${elapsedMs}ms`);
        patch({ phase: 'done', streaming: null, result: final, saved: true, elapsedMs });
      } catch (e) {
        patch({ phase: 'error', streaming: null, error: e instanceof Error ? e.message : String(e) });
      } finally {
        busy.current = false;
      }
    },
    [patch, writeAndSave],
  );

  const runListen = useCallback(
    async (spotName: string, source: AudioSource = 'mic', opts: RunOptions = {}) => {
      console.log(`[listen] start source=${source} busy=${busy.current}`);
      if (busy.current) return;
      busy.current = true;
      const t0 = Date.now();
      const id = makeId(t0);
      const spot = spotName.trim() || null;
      if (spot) kv.setLastSpotName(spot);
      setState({ ...IDLE, phase: 'recording', mode: 'listen' });
      // Context lookups run while we listen.
      const ctxPromise = Promise.all([getCoarseLocation(), isOffline()]);
      birdnet.load().catch(() => {});
      try {
        let samples: Float32Array;
        if (source === 'fixture') {
          const f = await loadDevFixture();
          samples = f.samples;
          patch({ progress: 1, input: 'test clip (dev)' });
        } else {
          const cap = await captureSeconds({
            seconds: LISTEN.seconds,
            onProgress: ({ progress, level }) => patch({ progress, level }),
          });
          samples = cap.samples;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const tCaptured = Date.now();

        patch({ phase: 'classifying' });
        const res = await birdnet.classify(samples);
        const detections = toDetections(res.scores, birdnet.labels(), LISTEN.topK);
        const tClassified = Date.now();
        const tapToSpeciesMs = tClassified - tCaptured;
        console.log(
          `[listen] ${res.windows} windows in ${res.totalMs}ms; top: ${detections.map((d) => `${d.common} ${d.confidence.toFixed(3)}`).join(', ') || 'none'}`,
        );
        patch({ detections });

        const [loc, offline] = await ctxPromise;
        patch({ offline });
        if (!isConfident(detections)) {
          recordMetric('listen_total', tapToSpeciesMs, { source, confident: false, windows: res.windows });
          patch({ phase: 'nothing', elapsedMs: Date.now() - t0 });
          return;
        }
        const final = await writeAndSave({
          id,
          t0,
          mode: 'listen',
          manualText: null,
          spot,
          loc,
          offline,
          detections,
          buildMessages: (ctx) => buildListenPrompt(detections, ctx),
          buildFallback: (ctx) => templateListenNote(detections, ctx),
          prefill: listenPrefill(detections[0]?.common),
          opts,
        });
        const noteMs = Date.now() - tClassified;
        recordMetric('listen_total', tapToSpeciesMs, {
          source,
          confident: true,
          windows: res.windows,
          classifyMs: res.totalMs,
          noteMs,
          noteSource: final.source,
        });
        const elapsedMs = Date.now() - t0;
        console.log(`[note] listen entry ${id} source=${final.source} offline=${offline} ${elapsedMs}ms`);
        patch({ phase: 'done', streaming: null, result: final, saved: true, elapsedMs });
      } catch (e) {
        console.warn('[listen] failed', e);
        patch({ phase: 'error', streaming: null, error: e instanceof Error ? e.message : String(e) });
      } finally {
        busy.current = false;
      }
    },
    [patch, writeAndSave],
  );

  const reset = useCallback(() => {
    if (!busy.current) setState(IDLE);
  }, []);

  return { state, runManual, runListen, reset };
}
