import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LLM_PARAMS } from '../config';
import { buildManualPrompt } from '../core/llm/prompt';
import { templateManualNote } from '../core/llm/template';
import type { NoteResult } from '../core/types';
import { onDevCommand } from '../services/devCommands';
import { gemmaWriter } from '../services/llm/gemmaWriter';
import { writeNoteWithFallback } from '../services/llm/writeNote';
import { colors, spacing } from '../theme';

const SAMPLE = 'small brown bird hopping under the hedge, short rising whistle twice';

/** Diagnostics: run one manual-style prompt through Gemma and show the stream + result. */
export function GemmaTest() {
  const [stream, setStream] = useState('');
  const [result, setResult] = useState<NoteResult | null>(null);
  const [status, setStatus] = useState('');
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStream('');
    setResult(null);
    const ctx = { date: new Date(), spotName: 'Test spot' };
    const t0 = Date.now();
    try {
      setStatus('Loading Gemma...');
      await gemmaWriter.load();
      setStatus(`Loaded in ${Date.now() - t0} ms. Writing...`);
      const t1 = Date.now();
      const r = await writeNoteWithFallback(
        gemmaWriter,
        buildManualPrompt(SAMPLE, ctx),
        templateManualNote(SAMPLE, ctx),
        { onToken: setStream, timeoutMs: LLM_PARAMS.timeoutMs },
      );
      setResult(r);
      setStatus(`Done in ${Date.now() - t1} ms (source: ${r.source})`);
      console.log(`[gemma-test] source=${r.source} raw=${JSON.stringify(r.raw)}`);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  }, [running]);

  useEffect(() => onDevCommand((c) => c.action === 'testGemma' && run()), [run]);

  return (
    <View style={styles.root}>
      <Pressable accessibilityRole="button" onPress={run} disabled={running} style={styles.button}>
        <Text style={styles.buttonText}>{running ? 'Running...' : 'Test Gemma'}</Text>
      </Pressable>
      {status ? <Text style={styles.mono}>{status}</Text> : null}
      {stream && !result ? <Text style={styles.stream}>{stream}</Text> : null}
      {result ? (
        <View>
          <Text style={styles.stream}>NOTE: {result.note}</Text>
          <Text style={styles.stream}>NEXT: {result.next}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.sm },
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
  stream: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
});
