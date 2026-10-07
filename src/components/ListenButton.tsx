import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LISTEN } from '../config';
import { colors, spacing } from '../theme';

interface Props {
  disabled?: boolean;
  caption?: string;
  /** 0..1 while recording, null when idle. */
  progress?: number | null;
  /** 0..1 mic level, drawn as ring thickness. */
  level?: number;
  onPress?: () => void;
}

/** Large circular primary action. While recording it shows the seconds left and the mic level as ring width. */
export function ListenButton({ disabled, caption, progress = null, level = 0, onPress }: Props) {
  const recording = progress !== null;
  const secondsLeft = recording ? Math.max(0, Math.ceil(LISTEN.seconds * (1 - progress))) : 0;
  const ring = recording ? 6 + Math.round(level * 22) : 8;
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? `Listening, ${secondsLeft} seconds left` : 'Listen'}
        accessibilityState={{ disabled: disabled || recording }}
        disabled={disabled || recording}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { borderWidth: ring },
          recording && styles.recording,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.label}>{recording ? `${secondsLeft}` : 'Listen'}</Text>
        {recording ? <Text style={styles.sub}>hold it up</Text> : null}
      </Pressable>
      {recording ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      ) : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  button: {
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.mossLight,
  },
  recording: { backgroundColor: '#2F5A2B' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.8 },
  label: { color: colors.white, fontSize: 30, fontWeight: '700' },
  sub: { color: colors.mossLight, fontSize: 13, marginTop: 2 },
  track: { width: 184, height: 6, borderRadius: 3, backgroundColor: colors.rule, marginTop: spacing.md, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.moss },
  caption: { color: colors.inkSoft, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});
