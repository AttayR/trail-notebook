// BirdNET V2.4 FP16 via react-native-fast-tflite, CPU delegate.
// Input float32 [1, 144000] (3 s @ 48 kHz); output float32 [1, 6522] logits.
import { File } from 'expo-file-system';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';

import { BIRDNET_LABELS, BIRDNET_MODEL, LISTEN } from '../../config';
import { sliceWindows } from '../../core/audio/windows';
import { assertLabelCount, parseLabels, type Label } from '../../core/birdnet/labels';
import { maxOverWindows } from '../../core/birdnet/scores';
import { recordMetric } from '../metrics';
import { modelFile, modelUri } from '../models/downloader';
import type { Classifier, ClassifyResult } from './Classifier';

class TfliteBirdNet implements Classifier {
  readonly id = BIRDNET_MODEL.id;
  private model: TfliteModel | null = null;
  private labelList: Label[] = [];
  private loading: Promise<void> | null = null;

  isLoaded() {
    return this.model !== null && this.labelList.length > 0;
  }

  labels() {
    return this.labelList;
  }

  load(): Promise<void> {
    if (this.isLoaded()) return Promise.resolve();
    if (!this.loading) {
      this.loading = this.doLoad().finally(() => {
        this.loading = null;
      });
    }
    return this.loading;
  }

  private async doLoad() {
    const t0 = Date.now();
    const text = await new File(modelFile(BIRDNET_LABELS).uri).text();
    const labels = parseLabels(text);
    assertLabelCount(labels);
    const model = await loadTensorflowModel({ url: modelUri(BIRDNET_MODEL) }, []);
    const inShape = model.inputs[0]?.shape.join('x');
    const outShape = model.outputs[0]?.shape.join('x');
    if (model.inputs[0]?.shape[1] !== LISTEN.windowSamples || model.outputs[0]?.shape[1] !== labels.length) {
      throw new Error(`Unexpected BirdNET tensors: in ${inShape}, out ${outShape}`);
    }
    this.model = model;
    this.labelList = labels;
    recordMetric('birdnet_load', Date.now() - t0, {
      in: inShape,
      out: outShape,
      inType: model.inputs[0]?.dataType,
      labels: labels.length,
    });
  }

  async classify(samples48k: Float32Array): Promise<ClassifyResult> {
    await this.load();
    const model = this.model!;
    const t0 = Date.now();
    const windows = sliceWindows(samples48k, LISTEN.windowSamples, LISTEN.hopSamples);
    const logits: Float32Array[] = [];
    const windowMs: number[] = [];
    for (const w of windows) {
      const s = Date.now();
      // `w` is a fresh slice, so its buffer is exactly 144,000 float32s.
      const [out] = await model.run([w.buffer as ArrayBuffer]);
      windowMs.push(Date.now() - s);
      // fast-tflite is zero-copy and REUSES its output buffer on every run, so a
      // plain `new Float32Array(out)` view would be overwritten by the next window.
      // Copy it (bug found in T9: every window showed the last window's scores).
      logits.push(new Float32Array(out.slice(0)));
    }
    const scores = maxOverWindows(logits, LISTEN.sensitivity);
    const totalMs = Date.now() - t0;
    const sorted = [...windowMs].sort((a, b) => a - b);
    recordMetric('birdnet_window', sorted[Math.floor(sorted.length / 2)], {
      windows: windows.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      all: windowMs,
    });
    return { scores, windows: windows.length, windowMs, totalMs };
  }
}

export const birdnet: Classifier = new TfliteBirdNet();
