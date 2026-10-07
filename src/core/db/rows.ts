// Pure row <-> domain mapping so it can be unit tested without SQLite.
import type { Detection, Entry, EntryMode, NoteSource } from '../types';

export interface EntryRow {
  id: string;
  created_at: number;
  mode: string;
  manual_text: string | null;
  spot_name: string | null;
  lat: number | null;
  lon: number | null;
  note: string | null;
  next_nudge: string | null;
  note_source: string;
  model_id: string | null;
  offline: number | null;
  walk_id: string | null;
  raw_output: string | null;
}

export interface DetectionRow {
  id: number;
  entry_id: string;
  label_index: number;
  scientific: string;
  common: string;
  confidence: number;
  rank: number;
}

export function detectionFromRow(r: DetectionRow): Detection {
  return {
    labelIndex: r.label_index,
    scientific: r.scientific,
    common: r.common,
    confidence: r.confidence,
    rank: r.rank,
  };
}

export function entryFromRow(r: EntryRow, detections: Detection[] = []): Entry {
  return {
    id: r.id,
    createdAt: r.created_at,
    mode: r.mode as EntryMode,
    manualText: r.manual_text,
    spotName: r.spot_name,
    lat: r.lat,
    lon: r.lon,
    note: r.note ?? '',
    nextNudge: r.next_nudge ?? '',
    noteSource: r.note_source as NoteSource,
    modelId: r.model_id,
    offline: r.offline == null ? null : r.offline === 1,
    walkId: r.walk_id,
    rawOutput: r.raw_output,
    detections,
  };
}

/** Join entries with their detections, preserving entry order and detection rank order. */
export function entryFromRows(entries: EntryRow[], detections: DetectionRow[]): Entry[] {
  const byEntry = new Map<string, Detection[]>();
  for (const d of [...detections].sort((a, b) => a.rank - b.rank)) {
    const list = byEntry.get(d.entry_id) ?? [];
    list.push(detectionFromRow(d));
    byEntry.set(d.entry_id, list);
  }
  return entries.map((e) => entryFromRow(e, byEntry.get(e.id) ?? []));
}

/** Round a coordinate to 2 decimals (about 1 km) for privacy. */
export function roundCoord(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.round(v * 100) / 100;
}
