import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListenButton } from '../components/ListenButton';
import { ManualInput } from '../components/ManualInput';
import { ResultCard } from '../components/ResultCard';
import { SpotNameField } from '../components/SpotNameField';
import { StatusChip } from '../components/StatusChip';
import { useObservation } from '../hooks/useObservation';
import { birdnet } from '../services/classifier/tfliteClassifier';
import { onDevCommand } from '../services/devCommands';
import { kv } from '../services/kv';
import { areRequiredModelsReady } from '../services/models/downloader';
import { colors, spacing } from '../theme';

export default function ListenScreen() {
  const [ready] = useState(areRequiredModelsReady);
  const [spot, setSpot] = useState(kv.getLastSpotName);
  const [manualOpen, setManualOpen] = useState(false);
  const { state, runManual, runListen, reset } = useObservation();

  // Load BirdNET as soon as Listen is shown so the first tap is fast.
  useEffect(() => {
    if (ready) birdnet.load().catch((e) => console.warn('[birdnet] load failed', e));
  }, [ready]);

  useEffect(
    () =>
      onDevCommand((c) => {
        if (c.action === 'manualNote') {
          if (c.spot !== undefined) setSpot(c.spot);
          runManual(c.text, c.spot ?? spot, { timeoutMs: c.timeoutMs, forceTemplate: c.forceTemplate });
        }
        if (c.action === 'listen') {
          if (c.spot !== undefined) setSpot(c.spot);
          runListen(c.spot ?? spot, c.source ?? 'fixture', { timeoutMs: c.timeoutMs });
        }
      }),
    [runManual, runListen, spot],
  );

  if (!ready) return <Redirect href="/setup" />;
  const busy = state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'nothing' && state.phase !== 'error';
  const showButton = state.phase === 'idle' || state.phase === 'recording';

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Text style={styles.title}>Trail Notebook</Text>
            <StatusChip />
          </View>
          {showButton ? (
            <View style={styles.center}>
              <ListenButton
                progress={state.phase === 'recording' ? state.progress : null}
                level={state.level}
                onPress={() => runListen(spot, 'mic')}
                caption={state.phase === 'recording' ? 'Listening...' : 'Hear a bird? Tap and hold the phone up for 9 seconds.'}
              />
            </View>
          ) : (
            <ResultCard state={state} onDismiss={reset} onTellInstead={() => setManualOpen(true)} />
          )}
          <View style={styles.manual}>
            <ManualInput
              key={manualOpen ? 'open' : 'closed'}
              initiallyOpen={manualOpen}
              disabled={busy}
              onSubmit={(t) => runManual(t, spot)}
            />
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
