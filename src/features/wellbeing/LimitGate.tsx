import React, { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useRouter } from 'expo-router';
import { Button, T } from '@/design/components';
import { useT } from '@/i18n';
import { useTimeLimit, useWellbeing } from '@/state/wellbeing';
import { useNow } from '@/features/time/useNow';

const TICK = 10_000;

/** Counts the time you spend at a table (only while this screen is shown and the app is open). */
export function usePlayClock() {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    const id = setInterval(() => {
      if (AppState.currentState === 'active') useWellbeing.getState().addTime(TICK);
    }, TICK);
    return () => clearInterval(id);
  }, [focused]);
}

/** When your own daily time limit is reached, the table closes until tomorrow (you chose it, we keep it). */
export function LimitGate() {
  const { t } = useT();
  const router = useRouter();
  usePlayClock();
  const now = useNow(30_000);
  const { limit, reached } = useTimeLimit(now);
  if (!reached) return null;
  return (
    <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, styles.wrap]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7,4,15,0.94)' }]} />
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.card}>
        <LinearGradient colors={['#2A1A66', '#120A33']} style={StyleSheet.absoluteFill} />
        <T style={{ fontSize: 46 }}>🌙</T>
        <T weight="display" align="center" style={{ color: '#fff', fontSize: 20 }}>{t('limits.reachedTitle')}</T>
        <T variant="body" align="center" style={{ color: 'rgba(255,255,255,0.8)' }}>{t('limits.reachedBody', { min: limit })}</T>
        <Button title={t('limits.leave')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ alignSelf: 'stretch', marginTop: 6 }} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 26, padding: 22, gap: 10, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(169,150,255,0.4)' },
});
