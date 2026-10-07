import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatClock } from '../core/context/time';
import type { Entry } from '../core/types';
import { colors, spacing } from '../theme';
import { DetectionList } from './DetectionList';
import { NoteText } from './NoteText';

function title(e: Entry): string {
  if (e.detections[0]) return e.detections[0].common;
  if (e.manualText) return e.manualText;
  return e.mode === 'listen' ? 'Nothing clear' : 'Entry';
}

function day(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function JournalRow({ entry, initiallyOpen = false }: { entry: Entry; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const d = new Date(entry.createdAt);
  return (
    <Pressable
      onPress={() => setOpen((o) => !o)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={styles.root}
    >
      <View style={styles.head}>
        <Text style={styles.time}>
          {day(entry.createdAt)} {formatClock(d)}
          {entry.spotName ? ` · ${entry.spotName}` : ''}
        </Text>
        {entry.offline ? <Text style={styles.stamp}>offline</Text> : null}
      </View>
      <Text style={styles.title} numberOfLines={open ? undefined : 1}>
        {title(entry)}
      </Text>
      {!open ? (
        <Text style={styles.preview} numberOfLines={1}>
          {entry.note}
        </Text>
      ) : (
        <View style={styles.body}>
          {entry.detections.length ? <DetectionList detections={entry.detections} showScores /> : null}
          <NoteText note={entry.note} next={entry.nextNudge} source={entry.noteSource} />
          {entry.lat != null ? (
            <Text style={styles.meta}>
              {entry.lat.toFixed(2)}, {entry.lon?.toFixed(2)} · {entry.mode}
            </Text>
          ) : (
            <Text style={styles.meta}>{entry.mode}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.inkSoft, fontSize: 12 },
  stamp: { color: colors.moss, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '600', marginTop: 2 },
  preview: { color: colors.inkSoft, fontSize: 14, marginTop: 2 },
  body: { marginTop: spacing.sm, gap: spacing.sm },
  meta: { color: colors.inkSoft, fontSize: 11 },
});
