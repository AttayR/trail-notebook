import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Entry } from '../core/types';
import { listEntries } from '../services/db/entries';

export function useJournal() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    listEntries()
      .then((e) => {
        setEntries(e);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useFocusEffect(reload);
  return { entries, error, reload };
}
