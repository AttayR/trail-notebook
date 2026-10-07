import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing } from '../theme';

export function SpotNameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.collapsed}>
        <Text style={styles.link}>{value ? `Spot: ${value}` : 'Name this spot (optional)'}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Riverside path"
        placeholderTextColor={colors.inkSoft}
        style={styles.input}
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={() => setOpen(false)}
        autoFocus
        accessibilityLabel="Spot name"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: { paddingVertical: spacing.sm },
  link: { color: colors.inkSoft, fontSize: 14, textDecorationLine: 'underline' },
  row: { paddingVertical: spacing.xs },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: spacing.sm,
  },
});
