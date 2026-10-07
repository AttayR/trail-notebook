import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Stat } from '../core/metrics/summary';
import { onDevCommand } from '../services/devCommands';
import { buildMetricsExport, exportMetrics } from '../services/metricsExport';
import { colors, spacing } from '../theme';

type Export = Awaited<ReturnType<typeof buildMetricsExport>>;

const SHOW: [string, string, string][] = [
  ['birdnet_load', 'BirdNET load', 'ms'],
  ['birdnet_window_each', 'BirdNET per 3 s window', 'ms'],
  ['listen_total', 'Tap-to-species after capture', 'ms'],
  ['llm_load', 'Gemma load', 'ms'],
  ['llm_ttft', 'Gemma first token', 'ms'],
  ['llm_tok_per_s', 'Gemma decode', 'tok/s'],
  ['llm_gen', 'Gemma full note', 'ms'],
  ['download', 'Download', 'ms'],
  ['battery', 'Battery', '%'],
];

const fmt = (s: Stat, unit: string) =>
  `${s.median} ${unit} median (p90 ${s.p90}, n=${s.count})`;

export function MetricsPanel() {
  const [data, setData] = useState<Export | null>(null);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(() => {
    buildMetricsExport().then(setData).catch((e) => setMsg(String(e)));
  }, []);

  const copy = useCallback(async () => {
    const r = await exportMetrics();
    setMsg(`Copied ${r.count} metrics as JSON (also saved to metrics-export.json)`);
    refresh();
  }, [refresh]);

  useEffect(refresh, [refresh]);
  useEffect(() => onDevCommand((c) => c.action === 'copyMetrics' && copy()), [copy]);

  if (!data) return null;
  const d = data.device;
  return (
    <View style={styles.root}>
      <Text style={styles.h}>Device</Text>
      <Text style={styles.mono}>
        {d.model ?? 'unknown'} · {d.osName} {d.osVersion} · {d.totalMemoryGB ?? '?'} GB RAM{d.isDevice ? '' : ' · simulator'}
      </Text>
      <Text style={styles.h}>Models on this phone</Text>
      {data.models.map((m) => (
        <Text key={m.id} style={styles.mono}>
          {m.onDiskBytes === m.expectedBytes ? 'OK' : 'MISSING'} {m.file} {(m.expectedBytes / 1e6).toFixed(1)} MB · {m.license}
        </Text>
      ))}
      <Text style={styles.h}>Measured</Text>
      {SHOW.map(([k, label, unit]) =>
        data.summary[k] ? (
          <Text key={k} style={styles.mono}>
            {label}: {fmt(data.summary[k], unit)}
          </Text>
        ) : null,
      )}
      <Pressable accessibilityRole="button" onPress={copy} style={styles.button}>
        <Text style={styles.buttonText}>Copy metrics JSON</Text>
      </Pressable>
      {msg ? <Text style={styles.mono}>{msg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.md, gap: 2 },
  h: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: spacing.sm },
  mono: { color: colors.inkSoft, fontSize: 11, fontFamily: 'Menlo' },
  button: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.moss,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.moss, fontWeight: '600' },
});
