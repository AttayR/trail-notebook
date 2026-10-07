import { router, Stack, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { REQUIRED_MODELS } from '../config';
import { onDevCommand, startDevCommandPolling } from '../services/devCommands';
import { deleteModel } from '../services/models/downloader';
import { colors } from '../theme';

export default function RootLayout() {
  useEffect(() => {
    if (!__DEV__) return;
    startDevCommandPolling();
    return onDevCommand((cmd) => {
      if (cmd.action === 'navigate') router.navigate(cmd.href as Href);
      if (cmd.action === 'deleteModels') {
        REQUIRED_MODELS.forEach(deleteModel);
        router.replace('/setup');
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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="journal" options={{ title: 'Journal' }} />
        <Stack.Screen name="setup" options={{ title: 'Setup', headerBackVisible: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}
