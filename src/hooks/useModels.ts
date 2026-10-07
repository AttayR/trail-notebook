import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { downloadManager } from '../services/models/downloadManager';

export type { ModelDownloadState } from '../services/models/downloadManager';

export function useModels() {
  const models = useSyncExternalStore(downloadManager.subscribe, downloadManager.getState);

  // Re-check files on disk when a screen using this mounts (e.g. models were deleted).
  useEffect(() => {
    downloadManager.refresh();
  }, []);

  const downloadAll = useCallback(() => {
    downloadManager.start().catch(() => {});
  }, []);

  const allDone = models.every((m) => m.status === 'done');
  const busy = models.some((m) => m.status === 'downloading');
  return { models, allDone, busy, downloadAll };
}
