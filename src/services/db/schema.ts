// SQLite schema with PRAGMA user_version migrations. See docs/architecture.md section 4.1.
import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'trail.db';
const DB_VERSION = 1;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DB_VERSION) return;
  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY NOT NULL,
        created_at INTEGER NOT NULL,
        mode TEXT NOT NULL,
        manual_text TEXT,
        spot_name TEXT,
        lat REAL,
        lon REAL,
        note TEXT,
        next_nudge TEXT,
        note_source TEXT NOT NULL,
        model_id TEXT,
        offline INTEGER,
        walk_id TEXT,
        raw_output TEXT
      );
      CREATE TABLE IF NOT EXISTS detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        label_index INTEGER NOT NULL,
        scientific TEXT NOT NULL,
        common TEXT NOT NULL,
        confidence REAL NOT NULL,
        rank INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        kind TEXT NOT NULL,
        value REAL NOT NULL,
        extra TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_detections_entry ON detections(entry_id);
    `);
    version = 1;
  }
  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Lazily opened singleton with migrations applied. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA foreign_keys = ON');
      await migrate(db);
      return db;
    })().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}
