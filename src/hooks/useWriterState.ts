import { useSyncExternalStore } from 'react';

import { gemmaWriter } from '../services/llm/gemmaWriter';

export function useWriterState() {
  return useSyncExternalStore(gemmaWriter.subscribe.bind(gemmaWriter), () => gemmaWriter.getState());
}
