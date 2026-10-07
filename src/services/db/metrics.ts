import { getDb } from './schema';

export interface MetricRow {
  id: number;
  created_at: number;
  kind: string;
  value: number;
  extra: string | null;
}

export async function insertMetric(kind: string, value: number, extra?: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO metrics (created_at, kind, value, extra) VALUES (?, ?, ?, ?)',
    Date.now(),
    kind,
    value,
    extra ? JSON.stringify(extra) : null,
  );
}

export async function listMetrics(limit = 500): Promise<MetricRow[]> {
  const db = await getDb();
  return db.getAllAsync<MetricRow>('SELECT * FROM metrics ORDER BY created_at DESC LIMIT ?', limit);
}
