// T2 smoke test: load each native module and call one cheap function.
// Each check is isolated with require() inside try/catch so one broken
// module is reported instead of crashing the app at import time.
/* eslint-disable @typescript-eslint/no-require-imports */

export interface ModuleCheck {
  name: string;
  ok: boolean;
  detail: string;
}

async function check(name: string, fn: () => Promise<string> | string): Promise<ModuleCheck> {
  let result: ModuleCheck;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timed out after 8 s')), 8000),
    );
    const detail = await Promise.race([Promise.resolve().then(fn), timeout]);
    result = { name, ok: true, detail };
  } catch (e) {
    result = { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
  console.log(`[native] ${result.name}: ${result.ok ? 'OK' : 'FAIL'} ${result.detail}`);
  return result;
}

export async function runNativeChecks(): Promise<ModuleCheck[]> {
  return Promise.all([
    check('llama.rn', async () => {
      const llama = require('llama.rn') as typeof import('llama.rn');
      const devices = await llama.getBackendDevicesInfo();
      return `build ${llama.BuildInfo.number}, devices: ${devices.map((d) => d.deviceName ?? d.type).join(', ') || 'none'}`;
    }),
    check('react-native-fast-tflite', () => {
      const tflite = require('react-native-fast-tflite') as typeof import('react-native-fast-tflite');
      if (typeof tflite.loadTensorflowModel !== 'function') throw new Error('loadTensorflowModel missing');
      return 'loadTensorflowModel available';
    }),
    check('react-native-audio-api', () => {
      const audio = require('react-native-audio-api') as typeof import('react-native-audio-api');
      const recorder = new audio.AudioRecorder();
      return `AudioRecorder created (${typeof recorder})`;
    }),
    check('expo-sqlite', async () => {
      const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
      const db = await SQLite.openDatabaseAsync(':memory:');
      const row = await db.getFirstAsync<{ v: string }>('select sqlite_version() as v');
      await db.closeAsync();
      return `sqlite ${row?.v}`;
    }),
    check('expo-file-system', () => {
      const FS = require('expo-file-system') as typeof import('expo-file-system');
      return `documents: ${FS.Paths.document.uri}, free ${(FS.Paths.availableDiskSpace / 1e9).toFixed(1)} GB`;
    }),
    check('expo-location', async () => {
      const Location = require('expo-location') as typeof import('expo-location');
      const perm = await Location.getForegroundPermissionsAsync();
      return `permission: ${perm.status}`;
    }),
  ]);
}
