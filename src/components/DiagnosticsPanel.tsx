import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GemmaTest } from './GemmaTest';
import { runNativeChecks, type ModuleCheck } from '../services/nativeCheck';
import { colors, spacing } from '../theme';

export function DiagnosticsPanel({ autoOpen = false }: { autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [checks, setChecks] = useState<ModuleCheck[] | null>(null);

  const load = useCallback(() => {
    runNativeChecks().then(setChecks);
  }, []);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
    if (!checks) load();
  }, [checks, load]);

  useEffect(() => {
    if (autoOpen) load();
  }, [autoOpen, load]);

  return (
    <View style={styles.root}>
      <Pressable onPress={toggle} accessibilityRole="button" style={styles.header}>
        <Text style={styles.headerText}>{open ? 'Hide diagnostics' : 'Diagnostics'}</Text>
      </Pressable>
      {open && (
        <View>
          {!checks && <Text style={styles.line}>Checking native modules...</Text>}
          {checks?.map((c) => (
            <Text key={c.name} style={[styles.line, !c.ok && styles.fail]}>
              {c.ok ? 'OK' : 'FAIL'}  {c.name}: {c.detail}
            </Text>
          ))}
          <GemmaTest />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: spacing.sm, marginTop: spacing.md },
  header: { paddingVertical: spacing.sm },
  headerText: { color: colors.moss, fontSize: 16, fontWeight: '600' },
  line: { color: colors.ink, fontSize: 12, fontFamily: 'Menlo', marginBottom: spacing.xs },
  fail: { color: colors.warn },
});
