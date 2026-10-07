// Metric sink. Always logs a "[metric]" console line; persists to SQLite once
// the DB is registered (T6).
export type MetricKind =
  | 'birdnet_load'
  | 'birdnet_window'
  | 'listen_total'
  | 'llm_load'
  | 'llm_ttft'
  | 'llm_gen'
  | 'download'
  | 'battery';

type Sink = (kind: MetricKind, value: number, extra?: Record<string, unknown>) => void;
let sink: Sink | null = null;

export function setMetricSink(s: Sink | null): void {
  sink = s;
}

export function recordMetric(kind: MetricKind, value: number, extra?: Record<string, unknown>): void {
  console.log(`[metric] ${kind} ${Math.round(value * 10) / 10}${extra ? ' ' + JSON.stringify(extra) : ''}`);
  try {
    sink?.(kind, value, extra);
  } catch (e) {
    console.warn('[metric] sink failed', e);
  }
}
