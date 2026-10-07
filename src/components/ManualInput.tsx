import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MANUAL_MAX_CHARS } from '../core/llm/prompt';
import { colors, spacing } from '../theme';

interface Props {
  initiallyOpen?: boolean;
  disabled?: boolean;
  onSubmit: (text: string) => void;
}

export function ManualInput({ initiallyOpen = false, disabled, onSubmit }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const [text, setText] = useState('');

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.collapsed}>
        <Text style={styles.link}>Tell it instead</Text>
      </Pressable>
    );
  }
  const canSend = !disabled && text.trim().length > 0;
  return (
    <View style={styles.root}>
      <Text style={styles.label}>What did you notice?</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="small brown bird, rising whistle near the hedge"
        placeholderTextColor={colors.inkSoft}
        multiline
        maxLength={MANUAL_MAX_CHARS}
        style={styles.input}
        accessibilityLabel="What did you notice"
      />
      <Pressable
        accessibilityRole="button"
        disabled={!canSend}
        onPress={() => {
          onSubmit(text);
          setText('');
        }}
        style={[styles.button, !canSend && styles.dim]}
      >
        <Text style={styles.buttonText}>Write note</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: { paddingVertical: spacing.sm, alignItems: 'center' },
  link: { color: colors.moss, fontSize: 16, fontWeight: '600' },
  root: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 10,
    padding: spacing.sm + 2,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.moss,
    borderRadius: 22,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  dim: { opacity: 0.4 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
