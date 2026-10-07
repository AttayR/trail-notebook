// Shared domain types. Pure TypeScript: no react-native or expo imports in src/core.

export type EntryMode = 'manual' | 'listen' | 'walk';
export type NoteSource = 'gemma' | 'template';
export type PartOfDay = 'night' | 'early morning' | 'morning' | 'midday' | 'afternoon' | 'evening';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type ConfidenceWord = 'very likely' | 'likely' | 'possible';

export interface Detection {
  labelIndex: number;
  scientific: string;
  common: string;
  /** Max sigmoid score over windows, 0..1. */
  confidence: number;
  /** 1-based rank. */
  rank: number;
}

/** Facts given to the note writer. Everything is optional except time. */
export interface ObservationContext {
  date: Date;
  /** Latitude, used for hemisphere-aware season. */
  lat?: number | null;
  lon?: number | null;
  spotName?: string | null;
  /** Common names of species already logged today (deduplicated by caller or not). */
  alreadyToday?: string[];
}

export interface ParsedNote {
  note: string;
  next: string;
}

export interface NoteResult extends ParsedNote {
  source: NoteSource;
  raw: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Entry {
  id: string;
  createdAt: number;
  mode: EntryMode;
  manualText: string | null;
  spotName: string | null;
  lat: number | null;
  lon: number | null;
  note: string;
  nextNudge: string;
  noteSource: NoteSource;
  modelId: string | null;
  offline: boolean | null;
  walkId: string | null;
  rawOutput: string | null;
  detections: Detection[];
}
