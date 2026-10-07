import { StyleSheet, Text, View } from 'react-native';

import { useWriterState } from '../hooks/useWriterState';
import { colors, spacing } from '../theme';

const LABEL = { idle: 'Gemma idle', loading: 'Gemma warming up', ready: 'Ready', error: 'Gemma unavailable' } as const;

export function StatusChip() {
  const s = useWriterState();
  return (
    <View style={[styles.chip, s === 'ready' && styles.ready, s === 'error' && styles.err]}>
      <Text style={styles.text}>{LABEL[s]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.rule,
  },
  ready: { backgroundColor: colors.mossLight },
  err: { backgroundColor: '#F1D9C9' },
  text: { color: colors.ink, fontSize: 12, fontWeight: '600' },
});
