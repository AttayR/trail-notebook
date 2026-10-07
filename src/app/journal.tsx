import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { colors, spacing } from '../theme';

export default function JournalScreen() {
  // __DEV__ deep link for simulator verification: trailnotebook://journal?diag=1
  const { diag } = useLocalSearchParams<{ diag?: string }>();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.text}>Journal (stub)</Text>
      <DiagnosticsPanel autoOpen={__DEV__ && diag === '1'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.md },
  text: { fontSize: 16, color: colors.ink },
});
