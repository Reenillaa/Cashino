import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CasinoChip, T } from '@/design/components';
import { useSession } from '@/state/session';
import { useWallet } from '@/state/wallet';
import { useReveal } from '@/features/play/reveal';

const ISLAND = { top: 11, w: 126, h: 37 };
// wings sized to stay clear of the clock (left) and the signal/battery icons (right) iOS draws on top
const LEFT = 44;
const RIGHT = 30;

const compact = (v: number) =>
  v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e4 ? `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}k` : v.toLocaleString('es-ES');

/** Installed web app on an iPhone with a Dynamic Island (standalone, tall top inset)? `?island=1` forces it (tests). */
function useIslandDevice(top: number) {
  const [mode] = useState<'off' | 'forced' | 'auto'>(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return 'off';
    if (/[?&]island=1/.test(window.location.search)) return 'forced';
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    return standalone && /iPhone/.test(navigator.userAgent) ? 'auto' : 'off';
  });
  return mode === 'forced' || (mode === 'auto' && top >= 51);
}

/**
 * Your chips next to the Dynamic Island, like a compact Live Activity: the black island is stretched with a
 * chip on the left and your balance on the right. A web app cannot draw inside the real island, so this sits
 * exactly around it (installed app only). It never shows a payout before the game reveals it.
 */
export function IslandBalance() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const show = useIslandDevice(insets.top);
  const signedIn = useSession((s) => !!s.userId);
  const server = useSession((s) => s.balance);
  const guest = useWallet((s) => s.balance);
  const hidden = useReveal((s) => s.pending.reduce((a, p) => a + p.payout, 0));
  const balance = Math.max(0, (signedIn ? server ?? 0 : guest) - hidden);
  const pulse = useSharedValue(1);
  const [last, setLast] = useState(balance);
  useEffect(() => {
    if (balance === last) return;
    const id = setTimeout(() => setLast(balance), 0);
    pulse.set(withSequence(withSpring(1.08, { damping: 8 }), withTiming(1, { duration: 220 })));
    return () => clearTimeout(id);
  }, [balance, last, pulse]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleX: pulse.value }] }));
  if (!show) return null;
  const w = ISLAND.w + LEFT + RIGHT;
  return (
    <Animated.View pointerEvents="none" style={[styles.pill, { left: (width - ISLAND.w) / 2 - LEFT, width: w }, st]} accessibilityLabel={`${balance}`}>
      <View style={styles.left}>
        <T weight="display" tabular style={{ color: balance < last ? '#FF5C7A' : '#3BE39A', fontSize: 12 }}>{compact(balance)}</T>
      </View>
      <View style={{ width: ISLAND.w }} />
      <View style={styles.right}><CasinoChip size={20} color="#12C08A" label="" /></View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', top: ISLAND.top, height: ISLAND.h, borderRadius: ISLAND.h / 2, backgroundColor: '#000000', flexDirection: 'row', alignItems: 'center', zIndex: 9999 },
  left: { width: LEFT, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 6, paddingRight: 2 },
  right: { width: RIGHT, alignItems: 'flex-start', justifyContent: 'center' },
});
