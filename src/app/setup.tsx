import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

export default function SetupScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Setup (stub)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, padding: spacing.md },
  text: { fontSize: 16, color: colors.ink },
});
