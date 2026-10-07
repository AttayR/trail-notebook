// Gemma 3 via llama.rn. One context, loaded in the background and kept alive.
import { initLlama, type LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';

import { ACTIVE_LLM, LLM_PARAMS } from '../../config';
import { NOTE_PREFILL, toGemmaPrompt } from '../../core/llm/gemmaFormat';
import type { ChatMessage } from '../../core/types';
import { recordMetric } from '../metrics';
import { isModelPresent, modelUri } from '../models/downloader';
import type { NoteWriter, WriterState, WriteResult } from './NoteWriter';

class GemmaWriter implements NoteWriter {
  readonly modelId = ACTIVE_LLM.id;
  private ctx: LlamaContext | null = null;
  private loading: Promise<void> | null = null;
  private state: WriterState = 'idle';
  private error: string | null = null;
  private listeners = new Set<(s: WriterState) => void>();
  private busy = false;

  getState() {
    return this.state;
  }
  getError() {
    return this.error;
  }
  subscribe(l: (s: WriterState) => void) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
  private set(s: WriterState, err: string | null = null) {
    this.state = s;
    this.error = err;
    this.listeners.forEach((l) => l(s));
  }

  load(): Promise<void> {
    if (this.ctx) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = this.doLoad().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private async doLoad() {
    if (!isModelPresent(ACTIVE_LLM)) {
      this.set('error', 'Model file missing');
      throw new Error('Model file missing');
    }
    this.set('loading');
    const model = modelUri(ACTIVE_LLM);
    const gpuLayers = Platform.OS === 'ios' ? LLM_PARAMS.nGpuLayersIos : LLM_PARAMS.nGpuLayersAndroid;
    const start = Date.now();
    try {
      try {
        this.ctx = await initLlama({ model, n_ctx: LLM_PARAMS.nCtx, n_gpu_layers: gpuLayers, use_mlock: false });
      } catch (gpuErr) {
        if (gpuLayers === 0) throw gpuErr;
        // Metal can be unavailable (e.g. some simulators); retry on CPU.
        console.warn('[llm] GPU init failed, retrying on CPU', gpuErr);
        this.ctx = await initLlama({ model, n_ctx: LLM_PARAMS.nCtx, n_gpu_layers: 0, use_mlock: false });
      }
      const ms = Date.now() - start;
      recordMetric('llm_load', ms, {
        model: this.modelId,
        gpu: this.ctx.gpu,
        reasonNoGPU: this.ctx.reasonNoGPU,
        platform: Platform.OS,
      });
      this.set('ready');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.set('error', msg);
      throw e;
    }
  }

  async write(
    messages: ChatMessage[],
    onToken: (accumulated: string) => void,
    signal?: AbortSignal,
    prefill: string = NOTE_PREFILL,
  ): Promise<WriteResult> {
    await this.load();
    const ctx = this.ctx;
    if (!ctx) throw new Error('Gemma not loaded');
    if (this.busy) throw new Error('Gemma is already writing');
    this.busy = true;

    const start = Date.now();
    let firstAt: number | null = null;
    // Manual Gemma template with the model turn prefilled with "NOTE:".
    const prompt = toGemmaPrompt(messages, prefill);
    let acc = prefill;
    let aborted = false;
    const onAbort = () => {
      aborted = true;
      ctx.stopCompletion().catch(() => {});
    };
    signal?.addEventListener('abort', onAbort);
    try {
      if (signal?.aborted) onAbort();
      const res = await ctx.completion(
        {
          prompt,
          n_predict: LLM_PARAMS.nPredict,
          temperature: LLM_PARAMS.temperature,
          top_p: LLM_PARAMS.topP,
          stop: LLM_PARAMS.stop,
        },
        (data) => {
          if (firstAt === null) firstAt = Date.now();
          acc += data.token;
          onToken(acc);
        },
      );
      const totalMs = Date.now() - start;
      const ttftMs = firstAt === null ? null : firstAt - start;
      const tokens = res.timings?.predicted_n ?? res.tokens_predicted ?? 0;
      const tokPerSec = res.timings?.predicted_per_second ?? null;
      if (ttftMs !== null) recordMetric('llm_ttft', ttftMs, { model: this.modelId });
      recordMetric('llm_gen', totalMs, {
        model: this.modelId,
        tokens,
        tok_s: tokPerSec ? Math.round(tokPerSec * 10) / 10 : null,
        prompt_tokens: res.timings?.prompt_n,
        prompt_ms: res.timings?.prompt_ms,
        aborted,
      });
      return { text: res.text != null ? prefill + res.text : acc, tokens, ttftMs, totalMs, tokPerSec, aborted };
    } finally {
      signal?.removeEventListener('abort', onAbort);
      this.busy = false;
    }
  }

  async release() {
    const ctx = this.ctx;
    this.ctx = null;
    this.set('idle');
    await ctx?.release();
  }
}

export const gemmaWriter: NoteWriter = new GemmaWriter();
