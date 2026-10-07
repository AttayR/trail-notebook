import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { captureSeconds, type CaptureResult } from '../services/audio/recorder';
import { onDevCommand } from '../services/devCommands';
import { colors, spacing } from '../theme';

/** Diagnostics: record 9 s and report sample count, delivered rate and level. */
export function MicTest() {
  const [status, setStatus] = useState('');
  const [level, setLevel] = useState(0);
  const [res, setRes] = useState<CaptureResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setRes(null);
    setStatus('Recording 9 s...');
    try {
      const r = await captureSeconds({
        onProgress: ({ progress, level: l }) => {
          setLevel(l);
          setStatus(`Recording... ${Math.round(progress * 100)}%`);
        },
      });
      setRes(r);
      setStatus('Done');
      console.log(
        `[mic-test] samples48k=${r.samples.length} delivered=${r.deliveredRate}Hz raw=${r.rawSamples} chunks=${r.chunks} peak=${r.peakLevel.toFixed(2)} ms=${r.ms}`,
      );
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
      console.warn('[mic-test] failed', e);
    } finally {
      setRunning(false);
    }
  }, [running]);

  useEffect(() => onDevCommand((c) => c.action === 'testMic' && run()), [run]);

  return (
    <View style={styles.root}>
      <Pressable accessibilityRole="button" onPress={run} disabled={running} style={styles.button}>
        <Text style={styles.buttonText}>{running ? 'Recording...' : 'Test mic (9 s)'}</Text>
      </Pressable>
      {status ? <Text style={styles.mono}>{status}</Text> : null}
      {running ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${level * 100}%` }]} />
        </View>
      ) : null}
      {res ? (
        <Text style={styles.mono}>
          {res.samples.length.toLocaleString()} samples at 48 kHz (device delivered {res.deliveredRate} Hz, {res.chunks}{' '}
          chunks), peak level {res.peakLevel.toFixed(2)}, {res.ms} ms
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.md },
  button: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.moss,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: { color: colors.moss, fontWeight: '600' },
  mono: { color: colors.inkSoft, fontSize: 12, fontFamily: 'Menlo', marginTop: spacing.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.rule, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.moss },
});
