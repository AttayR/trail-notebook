import { assertLabelCount, BIRDNET_V24_LABEL_COUNT, parseLabelLine, parseLabels } from '../birdnet/labels';
import { confidenceWord, isConfident, maxOverWindows, sigmoid, toDetections, topK } from '../birdnet/scores';

describe('labels', () => {
  it('splits "Scientific_Common"', () => {
    expect(parseLabelLine('Turdus merula_Eurasian Blackbird')).toEqual({
      scientific: 'Turdus merula',
      common: 'Eurasian Blackbird',
    });
  });
  it('keeps underscores in the common name and tolerates lines without one', () => {
    expect(parseLabelLine('Homo sapiens_Human_vocal').common).toBe('Human_vocal');
    expect(parseLabelLine('Noise')).toEqual({ scientific: 'Noise', common: 'Noise' });
  });
  it('parses a file and checks the count', () => {
    const labels = parseLabels('A a_x\r\nB b_y\n\n');
    expect(labels).toHaveLength(2);
    expect(() => assertLabelCount(labels)).toThrow(/6522/);
    const full = parseLabels(Array.from({ length: BIRDNET_V24_LABEL_COUNT }, (_, i) => `S${i}_C${i}`).join('\n'));
    expect(() => assertLabelCount(full)).not.toThrow();
  });
});

describe('scores', () => {
  it('sigmoid(0) = 0.5 and respects sensitivity', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(2, 1.5)).toBeCloseTo(1 / (1 + Math.exp(-3)), 10);
  });
  it('takes the max over windows', () => {
    const out = maxOverWindows([new Float32Array([0, -5, 3]), new Float32Array([2, -6, -1])]);
    expect(out[0]).toBeCloseTo(sigmoid(2), 6);
    expect(out[1]).toBeCloseTo(sigmoid(-5), 6);
    expect(out[2]).toBeCloseTo(sigmoid(3), 6);
    expect(maxOverWindows([]).length).toBe(0);
    expect(() => maxOverWindows([new Float32Array(2), new Float32Array(3)])).toThrow();
  });
  it('topK orders descending and applies the threshold', () => {
    const s = new Float32Array([0.1, 0.9, 0.2, 0.6, 0.95, 0.14]);
    expect(topK(s, 3)).toEqual([
      { index: 4, score: expect.closeTo(0.95, 5) },
      { index: 1, score: expect.closeTo(0.9, 5) },
      { index: 3, score: expect.closeTo(0.6, 5) },
    ]);
    expect(topK(new Float32Array([0.1, 0.12]), 3)).toEqual([]);
    expect(topK(s, 10).map((x) => x.index)).toEqual([4, 1, 3, 2]);
  });
  it('builds ranked detections with labels', () => {
    const labels = [{ scientific: 'a', common: 'A' }, { scientific: 'b', common: 'B' }];
    const d = toDetections(new Float32Array([0.3, 0.8]), labels);
    expect(d.map((x) => [x.common, x.rank])).toEqual([['B', 1], ['A', 2]]);
    expect(isConfident(d)).toBe(true);
    expect(isConfident(toDetections(new Float32Array([0.3, 0.2]), labels))).toBe(false);
    expect(isConfident([])).toBe(false);
  });
  it('confidence words at boundaries', () => {
    expect([0.8, 0.5, 0.15, 0.1].map(confidenceWord)).toEqual(['very likely', 'likely', 'possible', null]);
  });
});
