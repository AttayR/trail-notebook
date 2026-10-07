import { quantile, stat, summarize } from '../metrics/summary';

describe('metrics summary', () => {
  it('quantile interpolates', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([10], 0.9)).toBe(10);
    expect(quantile([], 0.5)).toBeNaN();
  });
  it('stat handles empty and rounds', () => {
    expect(stat([])).toBeNull();
    expect(stat([3, 1, 2])).toEqual({ count: 3, min: 1, median: 2, p90: 2.8, max: 3, mean: 2 });
  });
  it('summarize groups kinds and pulls useful extras', () => {
    const s = summarize([
      { kind: 'llm_gen', value: 3000, extra: { tok_s: 40, tokens: 20, prompt_ms: 2500 } },
      { kind: 'llm_gen', value: 2000, extra: { tok_s: 44, tokens: 22 } },
      { kind: 'birdnet_window', value: 50, extra: { all: [40, 50, 60] } },
      { kind: 'listen_total', value: 400, extra: { classifyMs: 300, noteMs: 2500 } },
      { kind: 'battery', value: 0.8, extra: null },
    ]);
    expect(s.llm_gen.count).toBe(2);
    expect(s.llm_tok_per_s.median).toBe(42);
    expect(s.llm_prompt_ms.count).toBe(1);
    expect(s.birdnet_window_each).toMatchObject({ count: 3, median: 50 });
    expect(s.listen_classify_ms.median).toBe(300);
    expect(Object.keys(s)).toEqual([...Object.keys(s)].sort());
  });
});
