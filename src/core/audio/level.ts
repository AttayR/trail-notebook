/** Root mean square of a block, 0..1 for unit-range audio. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

/** Map RMS to a 0..1 display level on a dB scale (-60 dBFS -> 0, 0 dBFS -> 1). */
export function levelFromRms(value: number, floorDb = -60): number {
  if (value <= 0) return 0;
  const db = 20 * Math.log10(value);
  return Math.max(0, Math.min(1, (db - floorDb) / -floorDb));
}
