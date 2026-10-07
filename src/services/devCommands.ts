// __DEV__-only simulator automation. The iOS Simulator here runs headless with
// no UI-automation tool, so verification scripts drop a JSON command file into
// the app's Documents dir (via `xcrun simctl get_app_container ... data`).
// The app polls it, deletes it, and dispatches the command. Never active in
// release builds.
import { File, Paths } from 'expo-file-system';

export type DevCommand =
  | { action: 'navigate'; href: string }
  | { action: 'setupDownload' }
  | { action: 'testGemma' }
  | { action: 'manualNote'; text: string; spot?: string; timeoutMs?: number; forceTemplate?: boolean }
  | { action: 'deleteModels' }
  | { action: 'seedEntries'; count?: number };

type Listener = (cmd: DevCommand) => void;
const listeners = new Set<Listener>();

export function onDevCommand(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startDevCommandPolling(): void {
  if (!__DEV__ || timer) return;
  const file = new File(Paths.document, 'dev-command.json');
  timer = setInterval(() => {
    try {
      if (!file.exists) return;
      const text = file.textSync();
      file.delete();
      const cmd = JSON.parse(text) as DevCommand;
      console.log(`[dev] command ${text}`);
      listeners.forEach((l) => l(cmd));
    } catch (e) {
      console.warn('[dev] bad command', e);
    }
  }, 1000);
}
