// Module-level download state so a download survives screen remounts
// (navigation, Fast Refresh). Screens subscribe; nothing aborts on unmount.
import { REQUIRED_MODELS, type ModelManifestEntry } from '../../config';
import { recordMetric } from '../metrics';
import { downloadModel, isModelPresent } from './downloader';

export type DownloadStatus = 'missing' | 'downloading' | 'done' | 'error';

export interface ModelDownloadState {
  entry: ModelManifestEntry;
  status: DownloadStatus;
  bytesWritten: number;
  totalBytes: number;
  error: string | null;
}

const PROGRESS_THROTTLE_MS = 250;

function fresh(): ModelDownloadState[] {
  return REQUIRED_MODELS.map((entry) => {
    const present = isModelPresent(entry);
    return {
      entry,
      status: present ? 'done' : 'missing',
      bytesWritten: present ? entry.bytes : 0,
      totalBytes: entry.bytes,
      error: null,
    };
  });
}

let state: ModelDownloadState[] = fresh();
let running: Promise<void> | null = null;
const listeners = new Set<(s: ModelDownloadState[]) => void>();

function patch(id: string, p: Partial<ModelDownloadState>) {
  state = state.map((m) => (m.entry.id === id ? { ...m, ...p } : m));
  listeners.forEach((l) => l(state));
}

export const downloadManager = {
  getState: () => state,
  subscribe(l: (s: ModelDownloadState[]) => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** Re-read files from disk (e.g. after models were deleted). No-op while downloading. */
  refresh() {
    if (running) return;
    state = fresh();
    listeners.forEach((l) => l(state));
  },
  start(): Promise<void> {
    if (running) return running;
    running = (async () => {
      for (const entry of REQUIRED_MODELS) {
        if (isModelPresent(entry)) {
          patch(entry.id, { status: 'done', bytesWritten: entry.bytes, error: null });
          continue;
        }
        patch(entry.id, { status: 'downloading', bytesWritten: 0, error: null });
        let last = 0;
        try {
          const { ms, bytes } = await downloadModel(entry, ({ bytesWritten, totalBytes }) => {
            const now = Date.now();
            if (now - last < PROGRESS_THROTTLE_MS) return;
            last = now;
            patch(entry.id, { bytesWritten, totalBytes });
          });
          if (ms > 0) recordMetric('download', ms, { model: entry.id, bytes });
          patch(entry.id, { status: 'done', bytesWritten: entry.bytes });
        } catch (e) {
          patch(entry.id, { status: 'error', error: e instanceof Error ? e.message : String(e) });
          return;
        }
      }
    })().finally(() => {
      running = null;
    });
    return running;
  },
};
