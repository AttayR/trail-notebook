import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

interface Props {
  disabled?: boolean;
  caption?: string;
  onPress?: () => void;
}

/** Large circular primary action. Countdown ring and level meter arrive with T11. */
export function ListenButton({ disabled, caption, onPress }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Listen"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}
      >
        <Text style={styles.label}>Listen</Text>
      </Pressable>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  button: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: colors.mossLight,
  },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.8 },
  label: { color: colors.white, fontSize: 26, fontWeight: '700' },
  caption: { color: colors.inkSoft, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});
