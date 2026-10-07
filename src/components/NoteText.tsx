import { StyleSheet, Text, View } from 'react-native';

import type { NoteSource } from '../core/types';
import { colors, spacing } from '../theme';

interface Props {
  note: string;
  next: string;
  source: NoteSource | null;
  /** Raw streaming text shown while Gemma is still writing. */
  streaming?: string | null;
}

export function NoteText({ note, next, source, streaming }: Props) {
  if (streaming != null) {
    const shown = streaming
      .replace(/\*\*/g, '')
      .replace(/^\s*NOTE:\s*/i, '')
      .replace(/\n\s*NEXT:\s*/i, '\nNext: ')
      .trim();
    return (
      <View>
        <Text style={styles.note}>{shown || 'Gemma is writing...'}</Text>
        <Text style={styles.tag}>written by Gemma on this phone</Text>
      </View>
    );
  }
  return (
    <View>
      <Text style={styles.note}>{note}</Text>
      {next ? (
        <Text style={styles.next}>
          <Text style={styles.nextLabel}>Next: </Text>
          {next}
        </Text>
      ) : null}
      {source ? (
        <Text style={styles.tag}>{source === 'gemma' ? 'written by Gemma on this phone' : 'template note'}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.ink, fontSize: 17, lineHeight: 25 },
  next: { color: colors.ink, fontSize: 16, lineHeight: 23, marginTop: spacing.sm },
  nextLabel: { color: colors.moss, fontWeight: '700' },
  tag: { color: colors.inkSoft, fontSize: 11, marginTop: spacing.sm, letterSpacing: 0.3 },
});
