import { useCallback, useEffect, useRef, useState } from 'react';

import { REQUIRED_MODELS, type ModelManifestEntry } from '../config';
import { downloadModel, isModelPresent } from '../services/models/downloader';
import { recordMetric } from '../services/metrics';

export type DownloadStatus = 'missing' | 'downloading' | 'done' | 'error';

export interface ModelDownloadState {
  entry: ModelManifestEntry;
  status: DownloadStatus;
  bytesWritten: number;
  totalBytes: number;
  error: string | null;
}

const PROGRESS_THROTTLE_MS = 250;

function initial(): ModelDownloadState[] {
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

export function useModels() {
  const [models, setModels] = useState<ModelDownloadState[]>(initial);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = useCallback((id: string, p: Partial<ModelDownloadState>) => {
    setModels((prev) => prev.map((m) => (m.entry.id === id ? { ...m, ...p } : m)));
  }, []);

  const downloadAll = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    for (const entry of REQUIRED_MODELS) {
      if (isModelPresent(entry)) {
        patch(entry.id, { status: 'done', bytesWritten: entry.bytes, error: null });
        continue;
      }
      patch(entry.id, { status: 'downloading', bytesWritten: 0, error: null });
      let last = 0;
      try {
        const { ms, bytes } = await downloadModel(
          entry,
          ({ bytesWritten, totalBytes }) => {
            const now = Date.now();
            if (now - last < PROGRESS_THROTTLE_MS) return;
            last = now;
            patch(entry.id, { bytesWritten, totalBytes });
          },
          controller.signal,
        );
        recordMetric('download', ms, { model: entry.id, bytes });
        patch(entry.id, { status: 'done', bytesWritten: entry.bytes });
      } catch (e) {
        if (controller.signal.aborted) return;
        patch(entry.id, { status: 'error', error: e instanceof Error ? e.message : String(e) });
        return;
      }
    }
  }, [patch]);

  const allDone = models.every((m) => m.status === 'done');
  const busy = models.some((m) => m.status === 'downloading');
  return { models, allDone, busy, downloadAll };
}
