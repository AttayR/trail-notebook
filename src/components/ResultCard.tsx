import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ObservationState } from '../hooks/useObservation';
import { colors, spacing } from '../theme';
import { DetectionList } from './DetectionList';
import { NoteText } from './NoteText';

interface Props {
  state: ObservationState;
  onDismiss: () => void;
  onTellInstead?: () => void;
}

const WORKING_LABEL: Partial<Record<ObservationState['phase'], string>> = {
  classifying: 'Identifying...',
  locating: 'Getting ready...',
};

export function ResultCard({ state, onDismiss, onTellInstead }: Props) {
  if (state.phase === 'idle' || state.phase === 'recording') return null;
  const working = state.phase === 'classifying' || state.phase === 'locating' || state.phase === 'writing';
  const label = WORKING_LABEL[state.phase];
  return (
    <View style={styles.card}>
      {state.mode === 'manual' ? <Text style={styles.observed}>&ldquo;{state.input}&rdquo;</Text> : null}
      {state.detections.length && state.phase !== 'nothing' ? <DetectionList detections={state.detections} /> : null}
      {label ? (
        <View style={styles.row}>
          <ActivityIndicator color={colors.moss} />
          <Text style={styles.muted}>{label}</Text>
        </View>
      ) : null}
      {state.phase === 'nothing' ? (
        <View style={styles.nothing}>
          <Text style={styles.nothingTitle}>{state.nonBird ? "Didn't catch a bird." : 'Nothing clear.'}</Text>
          <Text style={styles.body}>
            {state.nonBird
              ? `It sounded like ${state.nonBird}. Try again when it is quieter, or tell me what you noticed.`
              : 'Try again closer, or tell me what you noticed.'}
          </Text>
          {state.detections.length && !state.nonBird ? (
            <Text style={styles.muted}>
              Faint guesses: {state.detections.map((d) => d.common).join(', ')}
            </Text>
          ) : null}
          {onTellInstead ? (
            <Pressable onPress={onTellInstead} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>Tell it instead</Text>
            </Pressable>
          ) : null}
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
          {state.phase === 'done'
            ? `Saved to journal${state.elapsedMs ? ` · ${(state.elapsedMs / 1000).toFixed(1)} s` : ''}${state.offline ? ' · offline' : ''}`
            : ''}
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
  body: { color: colors.ink, fontSize: 15 },
  nothing: { gap: spacing.xs },
  nothingTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  link: { color: colors.moss, fontSize: 16, fontWeight: '600', marginTop: spacing.xs },
  error: { color: colors.warn },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  dismiss: { color: colors.moss, fontSize: 16, fontWeight: '700' },
});
