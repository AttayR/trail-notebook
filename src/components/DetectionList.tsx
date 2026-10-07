import { StyleSheet, Text, View } from 'react-native';

import { confidenceWord } from '../core/birdnet/confidence';
import type { Detection } from '../core/types';
import { colors, spacing } from '../theme';

/** Top species large, up to two candidates small. `showScores` adds raw numbers (Journal). */
export function DetectionList({ detections, showScores = false }: { detections: Detection[]; showScores?: boolean }) {
  const visible = detections.filter((d) => confidenceWord(d.confidence) !== null);
  if (!visible.length) return null;
  const [top, ...rest] = visible;
  return (
    <View>
      <Text style={styles.top}>{top.common}</Text>
      <Text style={styles.sci}>
        {top.scientific} · {confidenceWord(top.confidence)}
        {showScores ? ` (${top.confidence.toFixed(2)})` : ''}
      </Text>
      {rest.slice(0, 2).map((d) => (
        <Text key={d.labelIndex} style={styles.alt}>
          or {d.common}, {confidenceWord(d.confidence)}
          {showScores ? ` (${d.confidence.toFixed(2)})` : ''}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  sci: { color: colors.inkSoft, fontSize: 14, fontStyle: 'italic', marginBottom: spacing.xs },
  alt: { color: colors.inkSoft, fontSize: 13 },
});
