import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { NoteCardState } from '../hooks/useManualNote';
import { colors, spacing } from '../theme';
import { NoteText } from './NoteText';

export function ResultCard({ state, onDismiss }: { state: NoteCardState; onDismiss: () => void }) {
  if (state.phase === 'idle') return null;
  const working = state.phase === 'locating' || state.phase === 'writing';
  return (
    <View style={styles.card}>
      <Text style={styles.observed}>&ldquo;{state.input}&rdquo;</Text>
      {state.phase === 'locating' ? (
        <View style={styles.row}>
          <ActivityIndicator color={colors.moss} />
          <Text style={styles.muted}>Getting ready...</Text>
        </View>
      ) : null}
      {state.phase === 'error' ? <Text style={styles.error}>{state.error}</Text> : null}
      {state.result ? (
        <NoteText note={state.result.note} next={state.result.next} source={state.result.source} />
      ) : state.streaming != null ? (
        <NoteText note="" next="" source={null} streaming={state.streaming} />
      ) : null}
      <View style={styles.footer}>
        <Text style={styles.muted}>
          {state.phase === 'done' ? `Saved to journal${state.elapsedMs ? ` · ${(state.elapsedMs / 1000).toFixed(1)} s` : ''}` : ''}
          {working && state.result ? 'Saved a quick note; Gemma is still writing...' : ''}
        </Text>
        {!working ? (
          <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={12}>
            <Text style={styles.dismiss}>Done</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.rule,
    gap: spacing.sm,
  },
  observed: { color: colors.inkSoft, fontSize: 14, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  muted: { color: colors.inkSoft, fontSize: 12, flexShrink: 1 },
  error: { color: colors.warn },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  dismiss: { color: colors.moss, fontSize: 16, fontWeight: '700' },
});
