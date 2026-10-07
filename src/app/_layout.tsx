import { router, Stack, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { REQUIRED_MODELS } from '../config';
import { insertMetric } from '../services/db/metrics';
import { onDevCommand, startDevCommandPolling } from '../services/devCommands';
import { gemmaWriter } from '../services/llm/gemmaWriter';
import { setMetricSink } from '../services/metrics';
import { areRequiredModelsReady, deleteModel } from '../services/models/downloader';
import { colors } from '../theme';

export default function RootLayout() {
  useEffect(() => {
    setMetricSink((kind, value, extra) => {
      insertMetric(kind, value, extra).catch((e) => console.warn('[metric] db insert failed', e));
    });
    // Warm Gemma in the background so it is ready by the time the walker needs it.
    if (areRequiredModelsReady()) gemmaWriter.load().catch(() => {});
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    startDevCommandPolling();
    return onDevCommand((cmd) => {
      if (cmd.action === 'navigate') router.navigate(cmd.href as Href);
      if (cmd.action === 'deleteModels') {
        gemmaWriter.release().finally(() => {
          REQUIRED_MODELS.forEach(deleteModel);
          router.replace('/setup');
        });
      }
    });
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Listen' }} />
        <Stack.Screen name="journal" options={{ title: 'Journal' }} />
        <Stack.Screen name="setup" options={{ title: 'Setup', headerBackVisible: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}
