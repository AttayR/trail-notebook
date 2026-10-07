// One-time model download into the app documents directory.
// Integrity check is the exact byte size from the manifest.
import { Directory, File, Paths } from 'expo-file-system';

import { MODELS_DIR_NAME, REQUIRED_MODELS, type ModelManifestEntry } from '../../config';
import { kv } from '../kv';

export interface DownloadProgressInfo {
  bytesWritten: number;
  totalBytes: number;
}

function modelsDir(): Directory {
  return new Directory(Paths.document, MODELS_DIR_NAME);
}

export function modelFile(entry: ModelManifestEntry): File {
  return new File(modelsDir(), entry.filename);
}

/** file:// URI for native loaders (llama.rn, fast-tflite). */
export function modelUri(entry: ModelManifestEntry): string {
  return modelFile(entry).uri;
}

/** Synchronous and cheap: exists + exact size. */
export function isModelPresent(entry: ModelManifestEntry): boolean {
  const f = modelFile(entry);
  return f.exists && f.size === entry.bytes;
}

export function areRequiredModelsReady(): boolean {
  return REQUIRED_MODELS.every(isModelPresent);
}

export function deleteModel(entry: ModelManifestEntry): void {
  const f = modelFile(entry);
  if (f.exists) f.delete();
  kv.setModelFile(entry.id, { path: f.uri, bytes: 0, ok: false });
}

export async function downloadModel(
  entry: ModelManifestEntry,
  onProgress: (p: DownloadProgressInfo) => void,
  signal?: AbortSignal,
): Promise<{ ms: number; bytes: number }> {
  const dir = modelsDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = modelFile(entry);
  if (dest.exists && dest.size !== entry.bytes) dest.delete();
  if (dest.exists) return { ms: 0, bytes: entry.bytes };

  const free = Paths.availableDiskSpace;
  if (free > 0 && free < entry.bytes * 1.1) {
    throw new Error(
      `Not enough free space: need ${(entry.bytes / 1e6).toFixed(0)} MB, have ${(free / 1e6).toFixed(0)} MB.`,
    );
  }

  const start = Date.now();
  // downloadFileAsync writes to a temp location and only moves into place on success.
  const out = await File.downloadFileAsync(entry.url, dest, {
    idempotent: true,
    signal,
    onProgress: ({ bytesWritten, totalBytes }) =>
      onProgress({ bytesWritten, totalBytes: totalBytes > 0 ? totalBytes : entry.bytes }),
  });
  const ms = Date.now() - start;
  const size = out.size ?? 0;
  if (size !== entry.bytes) {
    out.delete();
    kv.setModelFile(entry.id, { path: out.uri, bytes: size, ok: false });
    throw new Error(`Size mismatch for ${entry.filename}: got ${size}, expected ${entry.bytes}.`);
  }
  kv.setModelFile(entry.id, { path: out.uri, bytes: size, ok: true });
  console.log(`[metric] download ${entry.id} ${ms}ms ${(size / 1e6).toFixed(1)}MB`);
  return { ms, bytes: size };
}
