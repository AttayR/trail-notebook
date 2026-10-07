import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListenButton } from '../components/ListenButton';
import { ManualInput } from '../components/ManualInput';
import { ResultCard } from '../components/ResultCard';
import { SpotNameField } from '../components/SpotNameField';
import { StatusChip } from '../components/StatusChip';
import { useManualNote } from '../hooks/useManualNote';
import { onDevCommand } from '../services/devCommands';
import { kv } from '../services/kv';
import { areRequiredModelsReady } from '../services/models/downloader';
import { colors, spacing } from '../theme';

/** Listen mode (BirdNET) is wired in T9-T11; until then manual mode is the primary path. */
const LISTEN_AVAILABLE = false;

export default function ListenScreen() {
  const [ready] = useState(areRequiredModelsReady);
  const [spot, setSpot] = useState(kv.getLastSpotName);
  const { state, submit, reset } = useManualNote();

  useEffect(
    () =>
      onDevCommand((c) => {
        if (c.action !== 'manualNote') return;
        if (c.spot !== undefined) setSpot(c.spot);
        submit(c.text, c.spot ?? spot, { timeoutMs: c.timeoutMs, forceTemplate: c.forceTemplate });
      }),
    [submit, spot],
  );

  if (!ready) return <Redirect href="/setup" />;
  const busy = state.phase === 'locating' || state.phase === 'writing';

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Text style={styles.title}>Trail Notebook</Text>
            <StatusChip />
          </View>
          {state.phase === 'idle' ? (
            <View style={styles.center}>
              <ListenButton
                disabled={!LISTEN_AVAILABLE}
                caption={LISTEN_AVAILABLE ? undefined : 'Bird sound ID is coming next. For now, tell it what you noticed.'}
              />
            </View>
          ) : (
            <ResultCard state={state} onDismiss={reset} />
          )}
          <View style={styles.manual}>
            <ManualInput initiallyOpen={!LISTEN_AVAILABLE} disabled={busy} onSubmit={(t) => submit(t, spot)} />
            <SpotNameField value={spot} onChange={setSpot} />
          </View>
        </ScrollView>
        <Link href="/journal" style={styles.link}>
          Journal
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.lg, flexGrow: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  manual: { gap: spacing.xs },
  link: { alignSelf: 'center', fontSize: 18, fontWeight: '600', color: colors.moss, padding: spacing.md },
});
