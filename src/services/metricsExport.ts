// Build the metrics JSON for the write-up: device, model files, per-kind stats and raw rows.
// Copied to the clipboard and written to Documents/metrics-export.json (pullable from a dev machine).
import * as Battery from 'expo-battery';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { ACTIVE_LLM, REQUIRED_MODELS } from '../config';
import { summarize } from '../core/metrics/summary';
import { listMetrics } from './db/metrics';
import { recordMetric } from './metrics';
import { modelFile } from './models/downloader';

export function deviceInfo() {
  return {
    platform: Platform.OS,
    model: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    isDevice: Device.isDevice,
    totalMemoryGB: Device.totalMemory ? Math.round((Device.totalMemory / 1024 ** 3) * 10) / 10 : null,
    yearClass: Device.deviceYearClass,
  };
}

export async function recordBattery(where: string): Promise<void> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level >= 0) recordMetric('battery', Math.round(level * 1000) / 10, { where, unit: 'percent' });
  } catch {
    // Simulators may not report battery; ignore.
  }
}

export async function buildMetricsExport() {
  const rows = await listMetrics(2000);
  const parsed = rows.map((r) => ({
    at: new Date(r.created_at).toISOString(),
    kind: r.kind,
    value: r.value,
    extra: r.extra ? (JSON.parse(r.extra) as Record<string, unknown>) : null,
  }));
  const models = REQUIRED_MODELS.map((m) => {
    const f = modelFile(m);
    return { id: m.id, file: m.filename, expectedBytes: m.bytes, onDiskBytes: f.exists ? f.size : 0, license: m.license };
  });
  return {
    exportedAt: new Date().toISOString(),
    app: { version: Constants.expoConfig?.version ?? null, llm: ACTIVE_LLM.id },
    device: deviceInfo(),
    models,
    totalModelBytes: models.reduce((s, m) => s + (m.onDiskBytes ?? 0), 0),
    summary: summarize(parsed),
    metrics: parsed,
  };
}

export async function exportMetrics(): Promise<{ json: string; path: string; count: number }> {
  const data = await buildMetricsExport();
  const json = JSON.stringify(data, null, 2);
  const file = new File(Paths.document, 'metrics-export.json');
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Clipboard.setStringAsync(json).catch(() => {});
  console.log(`[metrics] exported ${data.metrics.length} rows to ${file.uri}`);
  return { json, path: file.uri, count: data.metrics.length };
}
