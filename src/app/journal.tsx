import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { JournalRow } from '../components/JournalRow';
import { LicenseNotice } from '../components/LicenseNotice';
import { makeId } from '../core/util/id';
import { useJournal } from '../hooks/useJournal';
import { insertEntry } from '../services/db/entries';
import { onDevCommand } from '../services/devCommands';
import { colors, spacing } from '../theme';

async function seed(count: number) {
  const base = Date.now();
  for (let i = 0; i < count; i++) {
    const at = base - i * 3_600_000;
    await insertEntry({
      id: makeId(at),
      createdAt: at,
      mode: i % 2 ? 'listen' : 'manual',
      manualText: i % 2 ? null : `test observation ${i + 1}`,
      spotName: 'Seed path',
      lat: 31.52,
      lon: 74.35,
      note: `Seeded note number ${i + 1}, written ${new Date(at).toLocaleTimeString()}.`,
      nextNudge: 'Listen for a reply from the tree line.',
      noteSource: 'template',
      modelId: null,
      offline: null,
      walkId: null,
      rawOutput: null,
      detections: i % 2
        ? [
            { labelIndex: 1, scientific: 'Acridotheres tristis', common: 'Common Myna', confidence: 0.86, rank: 1 },
            { labelIndex: 2, scientific: 'Passer domesticus', common: 'House Sparrow', confidence: 0.31, rank: 2 },
          ]
        : [],
    });
  }
}

export default function JournalScreen() {
  // __DEV__ automation: trailnotebook://journal?diag=1 or the dev command channel.
  const { diag, expand } = useLocalSearchParams<{ diag?: string; expand?: string }>();
  const { entries, error, reload } = useJournal();

  useEffect(
    () =>
      onDevCommand((c) => {
        if (c.action === 'seedEntries') seed(c.count ?? 3).then(reload);
      }),
    [reload],
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>Could not read journal: {error}</Text> : null}
      {entries && entries.length === 0 ? (
        <Text style={styles.empty}>No entries yet. Go outside, then tap Listen or tell it what you noticed.</Text>
      ) : null}
      {entries?.map((e, i) => (
        <JournalRow key={e.id} entry={e} initiallyOpen={__DEV__ && expand === '1' && i === 0} />
      ))}
      <DiagnosticsPanel autoOpen={__DEV__ && diag === '1'} />
      <LicenseNotice />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.inkSoft, fontSize: 15, lineHeight: 21, marginVertical: spacing.lg },
  error: { color: colors.warn, marginBottom: spacing.md },
});
