// Linear-interpolation resampler. Good enough for BirdNET input (birdsong energy
// sits well below the 24 kHz Nyquist of 48 kHz), and cheap in JS.
export function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate <= 0 || toRate <= 0) throw new Error('sample rates must be positive');
  if (fromRate === toRate) return input;
  const outLength = Math.round((input.length * toRate) / fromRate);
  const out = new Float32Array(outLength);
  if (input.length === 0) return out;
  const step = fromRate / toRate;
  const last = input.length - 1;
  for (let i = 0; i < outLength; i++) {
    const pos = i * step;
    const i0 = Math.floor(pos);
    if (i0 >= last) {
      out[i] = input[last];
      continue;
    }
    const frac = pos - i0;
    out[i] = input[i0] + (input[i0 + 1] - input[i0]) * frac;
  }
  return out;
}

/** Clamp samples into [-1, 1] in place and return the same array. */
export function clampUnit(samples: Float32Array): Float32Array {
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    if (v > 1) samples[i] = 1;
    else if (v < -1) samples[i] = -1;
    else if (Number.isNaN(v)) samples[i] = 0;
  }
  return samples;
}
