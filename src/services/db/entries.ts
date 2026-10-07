import type { Detection, Entry } from '../../core/types';
import { entryFromRows, type DetectionRow, type EntryRow } from '../../core/db/rows';
import { getDb } from './schema';

export type NewEntry = Omit<Entry, 'detections'> & { detections?: Detection[] };

export async function insertEntry(e: NewEntry): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO entries (id, created_at, mode, manual_text, spot_name, lat, lon, note, next_nudge,
        note_source, model_id, offline, walk_id, raw_output)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      e.id,
      e.createdAt,
      e.mode,
      e.manualText,
      e.spotName,
      e.lat,
      e.lon,
      e.note,
      e.nextNudge,
      e.noteSource,
      e.modelId,
      e.offline == null ? null : e.offline ? 1 : 0,
      e.walkId,
      e.rawOutput,
    );
    for (const d of e.detections ?? []) {
      await db.runAsync(
        `INSERT INTO detections (entry_id, label_index, scientific, common, confidence, rank)
         VALUES (?, ?, ?, ?, ?, ?)`,
        e.id,
        d.labelIndex,
        d.scientific,
        d.common,
        d.confidence,
        d.rank,
      );
    }
  });
}

/** Update the note of an existing entry (used when Gemma finishes after the template was saved). */
export async function updateEntryNote(
  id: string,
  p: { note: string; nextNudge: string; noteSource: Entry['noteSource']; rawOutput: string | null },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE entries SET note = ?, next_nudge = ?, note_source = ?, raw_output = ? WHERE id = ?',
    p.note,
    p.nextNudge,
    p.noteSource,
    p.rawOutput,
    id,
  );
}

export async function listEntries(limit = 200): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries ORDER BY created_at DESC LIMIT ?',
    limit,
  );
  if (!rows.length) return [];
  const placeholders = rows.map(() => '?').join(',');
  const dets = await db.getAllAsync<DetectionRow>(
    `SELECT * FROM detections WHERE entry_id IN (${placeholders}) ORDER BY rank ASC`,
    ...rows.map((r) => r.id),
  );
  return entryFromRows(rows, dets);
}

/** Common names (rank 1) logged since `sinceMs`, for the "already logged today" prompt line. */
export async function speciesSince(sinceMs: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ common: string }>(
    `SELECT DISTINCT d.common FROM detections d JOIN entries e ON e.id = d.entry_id
     WHERE e.created_at >= ? AND d.rank = 1 AND d.confidence >= 0.5`,
    sinceMs,
  );
  return rows.map((r) => r.common);
}

export async function deleteAllEntries(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM detections; DELETE FROM entries;');
}
