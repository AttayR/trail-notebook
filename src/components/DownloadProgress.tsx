import { StyleSheet, Text, View } from 'react-native';

import type { ModelDownloadState } from '../hooks/useModels';
import { colors, spacing } from '../theme';

const mb = (b: number) => (b / 1e6).toFixed(b < 10e6 ? 1 : 0);

export function DownloadProgress({ model }: { model: ModelDownloadState }) {
  const pct = model.totalBytes > 0 ? Math.min(1, model.bytesWritten / model.totalBytes) : 0;
  const label =
    model.status === 'done'
      ? 'Ready'
      : model.status === 'downloading'
        ? `${mb(model.bytesWritten)} / ${mb(model.totalBytes)} MB  (${Math.round(pct * 100)}%)`
        : model.status === 'error'
          ? 'Failed'
          : `${mb(model.totalBytes)} MB`;
  return (
    <View style={styles.root} accessibilityLabel={`${model.entry.displayName}: ${label}`}>
      <View style={styles.row}>
        <Text style={styles.name}>{model.entry.displayName}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      {model.error ? <Text style={styles.error}>{model.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginVertical: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  name: { color: colors.ink, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  label: { color: colors.inkSoft, fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.rule, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: colors.moss },
  error: { color: colors.warn, marginTop: spacing.xs, fontSize: 13 },
});
