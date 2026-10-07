import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DownloadProgress } from '../components/DownloadProgress';
import { LicenseNotice } from '../components/LicenseNotice';
import { useModels } from '../hooks/useModels';
import { onDevCommand } from '../services/devCommands';
import { colors, spacing } from '../theme';

export default function SetupScreen() {
  const { models, allDone, busy, downloadAll } = useModels();
  const totalMb = Math.round(models.reduce((s, m) => s + m.entry.bytes, 0) / 1e6);
  const failed = models.some((m) => m.status === 'error');

  useEffect(() => {
    if (allDone) router.replace('/');
  }, [allDone]);

  useEffect(
    () =>
      onDevCommand((cmd) => {
        if (cmd.action === 'setupDownload') downloadAll();
      }),
    [downloadAll],
  );

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>One download, then no signal needed</Text>
        <Text style={styles.body}>
          Trail Notebook runs its AI on this phone. It needs to download about {totalMb} MB once, ideally on
          Wi-Fi. After that it works in airplane mode.
        </Text>
        {models.map((m) => (
          <DownloadProgress key={m.entry.id} model={m} />
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={downloadAll}
          style={({ pressed }) => [styles.button, (busy || pressed) && styles.buttonDim]}
        >
          <Text style={styles.buttonText}>{busy ? 'Downloading...' : failed ? 'Retry download' : 'Download'}</Text>
        </Pressable>
        <LicenseNotice />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700', marginBottom: spacing.sm },
  body: { color: colors.inkSoft, fontSize: 15, lineHeight: 21, marginBottom: spacing.md },
  button: {
    backgroundColor: colors.moss,
    borderRadius: 28,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDim: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '700' },
});
