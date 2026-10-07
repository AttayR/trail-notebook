// Pure aggregation of metric rows for the export / write-up.
export interface MetricLike {
  kind: string;
  value: number;
  extra?: Record<string, unknown> | null;
}

export interface Stat {
  count: number;
  min: number;
  median: number;
  p90: number;
  max: number;
  mean: number;
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function stat(values: number[]): Stat | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const r = (x: number) => Math.round(x * 10) / 10;
  return {
    count: v.length,
    min: r(v[0]),
    median: r(quantile(v, 0.5)),
    p90: r(quantile(v, 0.9)),
    max: r(v[v.length - 1]),
    mean: r(v.reduce((a, b) => a + b, 0) / v.length),
  };
}

/** Per-kind stats of `value`, plus stats of numeric extras worth reporting. */
export function summarize(rows: MetricLike[]): Record<string, Stat> {
  const groups = new Map<string, number[]>();
  const add = (k: string, v: unknown) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    const list = groups.get(k) ?? [];
    list.push(v);
    groups.set(k, list);
  };
  for (const r of rows) {
    add(r.kind, r.value);
    const e = r.extra ?? {};
    if (r.kind === 'llm_gen') {
      add('llm_tok_per_s', e.tok_s);
      add('llm_tokens', e.tokens);
      add('llm_prompt_ms', e.prompt_ms);
    }
    if (r.kind === 'birdnet_window' && Array.isArray(e.all)) e.all.forEach((x) => add('birdnet_window_each', x));
    if (r.kind === 'listen_total') {
      add('listen_classify_ms', e.classifyMs);
      add('listen_note_ms', e.noteMs);
    }
  }
  const out: Record<string, Stat> = {};
  for (const [k, v] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const s = stat(v);
    if (s) out[k] = s;
  }
  return out;
}
