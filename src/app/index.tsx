import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { areRequiredModelsReady } from '../services/models/downloader';
import { colors, spacing } from '../theme';

export default function ListenScreen() {
  const [ready] = useState(areRequiredModelsReady);
  if (!ready) return <Redirect href="/setup" />;
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.title}>Trail Notebook</Text>
        <Text style={styles.sub}>Listen (stub)</Text>
      </View>
      <Link href="/journal" style={styles.link}>
        Journal
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 16, color: colors.inkSoft, marginTop: spacing.sm },
  link: { alignSelf: 'center', fontSize: 18, color: colors.moss, padding: spacing.md },
});
