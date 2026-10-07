// Slice a buffer into fixed-size analysis windows with a hop. The tail that does
// not fill a whole window is dropped, except that a buffer shorter than one window
// is zero-padded to one window so we always classify something.
export function sliceWindows(samples: Float32Array, windowSize: number, hop: number): Float32Array[] {
  if (windowSize <= 0 || hop <= 0) throw new Error('windowSize and hop must be positive');
  if (samples.length < windowSize) {
    const padded = new Float32Array(windowSize);
    padded.set(samples);
    return [padded];
  }
  const out: Float32Array[] = [];
  for (let start = 0; start + windowSize <= samples.length; start += hop) {
    out.push(samples.slice(start, start + windowSize));
  }
  return out;
}
