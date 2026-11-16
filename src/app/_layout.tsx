import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Geist_300Light } from '@expo-google-fonts/geist/300Light';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded/600SemiBold';
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded/800ExtraBold';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { setLanguage } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/design/theme';
import { Toasts } from '@/design/components';
import { UnlockSheet } from '@/features/unlocks/UnlockSheet';
import { Splash } from '@/features/brand/Splash';
import { syncMusic } from '@/services/audio';
import { useAuthListener } from '@/features/auth/useAuthListener';
import { useAdminAndGifts } from '@/features/admin/useAdmin';
import { useBreakReminder } from '@/features/wellbeing/useBreakReminder';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_500Medium, Unbounded_600SemiBold, Unbounded_800ExtraBold });
  const language = useSettings((s) => s.language);
  const music = useSettings((s) => s.music);
  const musicVolume = useSettings((s) => s.musicVolume);
  const { c, isDark } = useTheme();
  useAuthListener();
  useAdminAndGifts();
  useBreakReminder();
  useEffect(() => setLanguage(language), [language]);
  useEffect(() => syncMusic(), [music, musicVolume]);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'default' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="game/[id]" options={{ gestureEnabled: true }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="rules/[id]" options={{ presentation: 'modal' }} />
        </Stack>
        <UnlockSheet />
        <Toasts />
        <Splash />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
