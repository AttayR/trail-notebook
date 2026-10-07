// Raw PCM capture with react-native-audio-api. Requests 48 kHz mono, reads the
// sample rate the hardware actually delivers, and resamples to 48 kHz if needed.
import { Platform } from 'react-native';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';

import { LISTEN } from '../../config';
import { SampleAccumulator } from '../../core/audio/accumulator';
import { levelFromRms, rms } from '../../core/audio/level';
import { clampUnit, resampleLinear } from '../../core/audio/resample';

export interface CaptureResult {
  /** Mono Float32 at 48 kHz, clamped to [-1, 1]. */
  samples: Float32Array;
  /** Sample rate the device actually delivered. */
  deliveredRate: number;
  rawSamples: number;
  chunks: number;
  ms: number;
  peakLevel: number;
}

export interface CaptureOptions {
  seconds?: number;
  onProgress?: (p: { progress: number; level: number }) => void;
  signal?: AbortSignal;
}

export type MicPermission = 'granted' | 'denied' | 'undetermined';

const map = (s: string): MicPermission => (s === 'Granted' ? 'granted' : s === 'Denied' ? 'denied' : 'undetermined');

/**
 * On the S23 Ultra (Android 16) `requestRecordingPermissions()` never resolved after the
 * user tapped Allow, which hung the whole Listen flow. So the request is time-bounded
 * and the permission is re-checked afterwards.
 */
export async function ensureMicPermission(): Promise<MicPermission> {
  const s = await AudioManager.checkRecordingPermissions();
  if (s !== 'Undetermined') return map(s);
  const asked = await Promise.race([
    AudioManager.requestRecordingPermissions(),
    new Promise<null>((r) => setTimeout(() => r(null), 20_000)),
  ]);
  if (asked && asked !== 'Undetermined') return map(asked);
  return map(await AudioManager.checkRecordingPermissions());
}

let busy = false;

export async function captureSeconds(opts: CaptureOptions = {}): Promise<CaptureResult> {
  if (busy) throw new Error('Already recording');
  busy = true;
  const seconds = opts.seconds ?? LISTEN.seconds;
  const recorder = new AudioRecorder();
  const t0 = Date.now();
  try {
    const perm = await ensureMicPermission();
    if (perm !== 'granted') throw new Error('Microphone permission not granted');

    if (Platform.OS === 'ios') {
      // 'measurement' turns off iOS voice processing / auto gain: we want raw ambience.
      AudioManager.setAudioSessionOptions({ iosCategory: 'record', iosMode: 'measurement', iosOptions: [] });
      await Promise.race([AudioManager.setAudioSessionActivity(true), new Promise((r) => setTimeout(r, 3000))]);
    }
    console.log(`[audio] permission ok, starting recorder after ${Date.now() - t0} ms`);

    let acc: SampleAccumulator | null = null;
    let deliveredRate = 0;
    let chunks = 0;
    let peak = 0;
    let safety: ReturnType<typeof setTimeout> | null = null;

    const result = await new Promise<CaptureResult>((resolve, reject) => {
      const finish = () => {
        const raw = acc ? acc.toArray() : new Float32Array(0);
        const samples = clampUnit(
          deliveredRate === LISTEN.sampleRate ? raw : resampleLinear(raw, deliveredRate || LISTEN.sampleRate, LISTEN.sampleRate),
        );
        resolve({ samples, deliveredRate, rawSamples: raw.length, chunks, ms: Date.now() - t0, peakLevel: peak });
      };

      const onAbort = () => reject(new Error('Recording cancelled'));
      opts.signal?.addEventListener('abort', onAbort, { once: true });

      const reg = recorder.onAudioReady(
        { sampleRate: LISTEN.sampleRate, bufferLength: Math.round(LISTEN.sampleRate * 0.1), channelCount: 1 },
        ({ buffer }) => {
          if (acc?.isFull) return;
          if (!acc) {
            deliveredRate = buffer.sampleRate;
            acc = new SampleAccumulator(Math.round(deliveredRate * seconds));
            console.log(`[audio] delivered sample rate ${deliveredRate} Hz, buffer ${buffer.length} frames`);
          }
          const data = buffer.getChannelData(0);
          acc.push(data);
          chunks++;
          const level = levelFromRms(rms(data));
          if (level > peak) peak = level;
          opts.onProgress?.({ progress: acc.progress, level });
          if (acc.isFull) finish();
        },
      );
      if (reg.status === 'error') {
        reject(new Error(`onAudioReady: ${reg.message}`));
        return;
      }
      recorder.onError((e) => reject(new Error(`recorder error: ${JSON.stringify(e)}`)));
      recorder.start().then((r) => {
        if (r.status === 'error') reject(new Error(`start: ${r.message}`));
      }, reject);
      // Safety net: never hang longer than the capture plus 5 s.
      safety = setTimeout(() => (acc ? finish() : reject(new Error('No audio received'))), (seconds + 5) * 1000);
    }).finally(() => {
      if (safety) clearTimeout(safety);
    });
    return result;
  } finally {
    recorder.clearOnAudioReady();
    recorder.clearOnError();
    if (recorder.isRecording()) await recorder.stop().catch(() => {});
    if (Platform.OS === 'ios') await AudioManager.setAudioSessionActivity(false).catch(() => {});
    busy = false;
  }
}
