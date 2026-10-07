// Small settings and model state in expo-sqlite/kv-store (no extra native module).
import Storage from 'expo-sqlite/kv-store';

export interface ModelFileState {
  path: string;
  bytes: number;
  ok: boolean;
}
export type ModelState = Record<string, ModelFileState>;

const KEYS = {
  modelState: 'modelState',
  lastSpotName: 'lastSpotName',
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const kv = {
  getModelState(): ModelState {
    return readJson<ModelState>(KEYS.modelState, {});
  },
  setModelFile(id: string, state: ModelFileState): void {
    const all = kv.getModelState();
    all[id] = state;
    Storage.setItemSync(KEYS.modelState, JSON.stringify(all));
  },
  getLastSpotName(): string {
    return Storage.getItemSync(KEYS.lastSpotName) ?? '';
  },
  setLastSpotName(name: string): void {
    Storage.setItemSync(KEYS.lastSpotName, name);
  },
};
