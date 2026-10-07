import { entryFromRows, roundCoord, type DetectionRow, type EntryRow } from '../db/rows';

const row = (id: string, created_at: number): EntryRow => ({
  id, created_at, mode: 'manual', manual_text: 'crows', spot_name: null, lat: 31.52, lon: 74.35,
  note: 'n', next_nudge: 'x', note_source: 'gemma', model_id: 'm', offline: 1, walk_id: null, raw_output: 'raw',
});
const det = (entry_id: string, rank: number): DetectionRow => ({
  id: rank, entry_id, label_index: rank, scientific: 's' + rank, common: 'c' + rank, confidence: 0.9 / rank, rank,
});

describe('entryFromRows', () => {
  it('keeps entry order and groups detections by rank', () => {
    const out = entryFromRows([row('b', 2), row('a', 1)], [det('a', 2), det('b', 1), det('a', 1)]);
    expect(out.map((e) => e.id)).toEqual(['b', 'a']);
    expect(out[1].detections.map((d) => d.rank)).toEqual([1, 2]);
    expect(out[0].detections).toHaveLength(1);
    expect(out[0].offline).toBe(true);
    expect(out[0].manualText).toBe('crows');
  });
  it('maps nulls safely', () => {
    const r = { ...row('z', 1), note: null, next_nudge: null, offline: null };
    const [e] = entryFromRows([r], []);
    expect(e.note).toBe('');
    expect(e.offline).toBeNull();
    expect(e.detections).toEqual([]);
  });
});

describe('roundCoord', () => {
  it('rounds to 2 decimals and handles null', () => {
    expect(roundCoord(31.5204)).toBe(31.52);
    expect(roundCoord(-0.005)).toBe(-0);
    expect(roundCoord(null)).toBeNull();
    expect(roundCoord(NaN)).toBeNull();
  });
});
