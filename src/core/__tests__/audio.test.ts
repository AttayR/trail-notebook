import { SampleAccumulator } from '../audio/accumulator';
import { levelFromRms, rms } from '../audio/level';
import { clampUnit, resampleLinear } from '../audio/resample';
import { parseWav } from '../audio/wav';
import { sliceWindows } from '../audio/windows';

function sine(freq: number, rate: number, seconds: number, amp = 0.5): Float32Array {
  const n = Math.round(rate * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / rate);
  return out;
}

function zeroCrossings(x: Float32Array): number {
  let c = 0;
  for (let i = 1; i < x.length; i++) if ((x[i - 1] < 0 && x[i] >= 0) || (x[i - 1] >= 0 && x[i] < 0)) c++;
  return c;
}

describe('resampleLinear', () => {
  it('44.1 kHz 1 kHz sine of 1 s -> 48,000 samples with frequency preserved', () => {
    const input = sine(1000, 44100, 1);
    const out = resampleLinear(input, 44100, 48000);
    expect(out.length).toBe(48000);
    const zIn = zeroCrossings(input);
    const zOut = zeroCrossings(out);
    expect(Math.abs(zOut - zIn) / zIn).toBeLessThan(0.01);
  });
  it('is identity at equal rates and handles empty input', () => {
    const x = new Float32Array([0.1, 0.2]);
    expect(resampleLinear(x, 48000, 48000)).toBe(x);
    expect(resampleLinear(new Float32Array(0), 16000, 48000).length).toBe(0);
  });
  it('upsamples 16 kHz by 3x with interpolated values', () => {
    const out = resampleLinear(new Float32Array([0, 0.3]), 16000, 48000);
    expect(out.length).toBe(6);
    expect(out[1]).toBeCloseTo(0.1, 5);
    expect(out[5]).toBeCloseTo(0.3, 5);
  });
  it('rejects bad rates', () => {
    expect(() => resampleLinear(new Float32Array(1), 0, 48000)).toThrow();
  });
});

describe('clampUnit', () => {
  it('clamps and zeroes NaN', () => {
    expect(Array.from(clampUnit(new Float32Array([2, -3, 0.5, NaN])))).toEqual([1, -1, 0.5, 0]);
  });
});

describe('sliceWindows', () => {
  it('432,000 samples -> 5 windows of 144,000 with hop 72,000', () => {
    const x = new Float32Array(432000).map((_, i) => i);
    const w = sliceWindows(x, 144000, 72000);
    expect(w).toHaveLength(5);
    w.forEach((win) => expect(win.length).toBe(144000));
    expect(w[1][0]).toBe(72000);
    expect(w[4][143999]).toBe(431999);
  });
  it('zero-pads a short buffer to one window', () => {
    const w = sliceWindows(new Float32Array([0.5, 0.5]), 10, 5);
    expect(w).toHaveLength(1);
    expect(w[0].length).toBe(10);
    expect(w[0][1]).toBe(0.5);
    expect(w[0][2]).toBe(0);
  });
});

describe('SampleAccumulator', () => {
  it('fills to exactly N from uneven chunks and drops overflow', () => {
    const acc = new SampleAccumulator(10);
    expect(acc.push(new Float32Array(3).fill(1))).toBe(3);
    expect(acc.push(new Float32Array(4).fill(2))).toBe(4);
    expect(acc.isFull).toBe(false);
    expect(acc.push(new Float32Array(7).fill(3))).toBe(3);
    expect(acc.isFull).toBe(true);
    expect(acc.push(new Float32Array(5))).toBe(0);
    expect(Array.from(acc.toArray())).toEqual([1, 1, 1, 2, 2, 2, 2, 3, 3, 3]);
    expect(acc.progress).toBe(1);
    acc.reset();
    expect(acc.length).toBe(0);
  });
});

describe('level', () => {
  it('rms of a full-scale square wave is 1, of silence 0', () => {
    expect(rms(new Float32Array([1, -1, 1, -1]))).toBe(1);
    expect(rms(new Float32Array(4))).toBe(0);
    expect(rms(new Float32Array(0))).toBe(0);
  });
  it('maps dB to 0..1', () => {
    expect(levelFromRms(1)).toBe(1);
    expect(levelFromRms(0.001)).toBeCloseTo(0, 5); // -60 dBFS
    expect(levelFromRms(0.0316)).toBeCloseTo(0.5, 1); // about -30 dBFS
    expect(levelFromRms(0)).toBe(0);
  });
});

function makeWav(opts: { format: number; bits: number; channels: number; rate: number; frames: number[][] }): ArrayBuffer {
  const { format, bits, channels, rate, frames } = opts;
  const bytes = bits / 8;
  const dataLen = frames.length * channels * bytes;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, format, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * channels * bytes, true);
  v.setUint16(32, channels * bytes, true);
  v.setUint16(34, bits, true);
  w(36, 'data');
  v.setUint32(40, dataLen, true);
  let o = 44;
  for (const f of frames)
    for (const s of f) {
      if (format === 3) v.setFloat32(o, s, true);
      else v.setInt16(o, Math.round(s * 32767), true);
      o += bytes;
    }
  return buf;
}

describe('parseWav', () => {
  it('parses 16-bit PCM mono', () => {
    const r = parseWav(makeWav({ format: 1, bits: 16, channels: 1, rate: 48000, frames: [[0], [0.5], [-0.5]] }));
    expect(r.sampleRate).toBe(48000);
    expect(r.samples.length).toBe(3);
    expect(r.samples[1]).toBeCloseTo(0.5, 3);
    expect(r.samples[2]).toBeCloseTo(-0.5, 3);
  });
  it('downmixes stereo float', () => {
    const r = parseWav(makeWav({ format: 3, bits: 32, channels: 2, rate: 44100, frames: [[1, 0], [0.5, -0.5]] }));
    expect(r.channels).toBe(2);
    expect(Array.from(r.samples)).toEqual([0.5, 0]);
  });
  it('rejects non-PCM and non-WAV input', () => {
    expect(() => parseWav(makeWav({ format: 2, bits: 16, channels: 1, rate: 8000, frames: [[0]] }))).toThrow(/unsupported/);
    expect(() => parseWav(new ArrayBuffer(8))).toThrow(/RIFF/);
  });
});
