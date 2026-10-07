import { assertLabelCount, BIRDNET_V24_LABEL_COUNT, parseLabelLine, parseLabels } from '../birdnet/labels';
import { analyzeScores, confidenceWord, isConfident, isNonBird, maxOverWindows, sigmoid, toDetections, topK } from '../birdnet/scores';

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

describe('non-bird classes', () => {
  const labels = [
    { scientific: 'Pycnonotus xanthopygos', common: 'White-spectacled Bulbul' },
    { scientific: 'Human whistle', common: 'Human whistle' },
    { scientific: 'Eudynamys scolopaceus', common: 'Asian Koel' },
    { scientific: 'Engine', common: 'Engine' },
    { scientific: 'Gryllus assimilis', common: 'Gryllus assimilis' }, // a cricket species, not filtered
  ];
  it('recognises environmental labels only', () => {
    expect(labels.map(isNonBird)).toEqual([false, true, false, true, false]);
  });
  it('drops non-bird classes from the alternates', () => {
    const r = analyzeScores(new Float32Array([0.9, 0.3, 0.2, 0.25, 0.1]), labels);
    expect(r.nonBird).toBeNull();
    expect(r.detections.map((d) => d.common)).toEqual(['White-spectacled Bulbul', 'Asian Koel']);
    expect(r.detections.map((d) => d.rank)).toEqual([1, 2]);
  });
  it('reports a winning non-bird class instead of naming a species', () => {
    const r = analyzeScores(new Float32Array([0.3, 0.7, 0.2, 0.1, 0]), labels);
    expect(r.detections).toEqual([]);
    expect(r.nonBird).toMatchObject({ common: 'Human whistle', phrase: 'a human whistle' });
  });
  it('ignores a weak non-bird top-1 (below likely) and keeps bird guesses', () => {
    const r = analyzeScores(new Float32Array([0.3, 0.45, 0, 0, 0]), labels);
    expect(r.nonBird).toBeNull();
    expect(r.detections[0].common).toBe('White-spectacled Bulbul');
  });
});
