import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { Avatar, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { onlineConfigured, supabase } from '@/services/supabase';
import { useSession } from '@/state/session';

interface Highlight { id: number; username: string; avatar: string; kind: 'bigwin' | 'streak'; game: string; value: number; amount: number; created_at: string }

/** Big wins and good streaks of the last days, from every public player (admins never appear). */
export function useHighlights() {
  const userId = useSession((s) => s.userId);
  const [items, setItems] = useState<Highlight[]>([]);
  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data } = await supabase.rpc('recent_highlights', { p_limit: 30 });
    if (data) setItems(data as Highlight[]);
  }, [userId]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [load]);
  return items;
}

const ago = (iso: string, t: ReturnType<typeof useT>['t']) => {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return m < 60 ? t('hl.min', { n: m }) : m < 1440 ? t('hl.hour', { n: Math.round(m / 60) }) : t('hl.day', { n: Math.round(m / 1440) });
};

/**
 * A ticker across the ranking screen: "Ana won ×120 at Roulette", "Leo is on a 10-win streak at Dice"…
 * The row is drawn twice and slides left forever, so it never shows a gap.
 */
export function HighlightsTicker() {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const focused = useIsFocused();
  const items = useHighlights();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!w || reduceMotion || !focused) return;
    x.set(0);
    // ~38 px per second, whatever the length
    x.set(withRepeat(withTiming(1, { duration: (w / 38) * 1000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(x);
  }, [w, reduceMotion, focused, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -x.value * w }] }));
  if (!onlineConfigured || !items.length) return null;
  const row = (copy: number) => (
    <View style={styles.row} onLayout={copy === 0 ? (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width) : undefined}>
      {items.map((h) => (
        <View key={`${copy}-${h.id}`} style={styles.item}>
          <Avatar id={h.avatar} size={22} />
          <T weight="display" style={styles.name}>{h.username}</T>
          <T style={styles.text}>
            {h.kind === 'bigwin'
              ? t('hl.bigwin', { mult: Number(h.value).toLocaleString('es-ES'), game: t(`games.names.${h.game}`, { defaultValue: h.game }) })
              : t('hl.streak', { n: h.value, game: t(`games.names.${h.game}`, { defaultValue: h.game }) })}
          </T>
          <View style={[styles.pill, h.kind === 'streak' && styles.pillStreak]}>
            <T weight="display" tabular style={{ color: '#231A3A', fontSize: 11 }}>{h.kind === 'streak' ? `🔥 ${h.value}` : `+${formatCoins(h.amount)}`}</T>
          </View>
          <T style={styles.ago}>{ago(h.created_at, t)}</T>
          <T style={styles.sep}>✦</T>
        </View>
      ))}
    </View>
  );
  return (
    <View style={styles.strip} accessibilityRole="text" accessibilityLabel={t('hl.title')}>
      <LinearGradient colors={['#1A0B2E', '#2A0F3A', '#1A0B2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.lineTop} />
      <View style={styles.lineBottom} />
      <View style={styles.track}>
        <Animated.View style={[{ flexDirection: 'row' }, st]}>
          {row(0)}
          {row(1)}
        </Animated.View>
      </View>
      {/* the label sits on top, with the strip fading under it */}
      <View style={styles.label}>
        <LinearGradient colors={['#FF4FA3', '#FF8A1C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <T weight="display" style={{ color: '#fff', fontSize: 11, letterSpacing: 0.8 }}>🔥 {t('hl.title').toUpperCase()}</T>
      </View>
      <LinearGradient pointerEvents="none" colors={['rgba(26,11,46,1)', 'rgba(26,11,46,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.fadeL} />
      <LinearGradient pointerEvents="none" colors={['rgba(26,11,46,0)', 'rgba(26,11,46,1)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.fadeR} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { height: 44, overflow: 'hidden', justifyContent: 'center', marginTop: 12 },
  lineTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, backgroundColor: 'rgba(255,208,107,0.6)' },
  lineBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5, backgroundColor: 'rgba(255,208,107,0.6)' },
  track: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  name: { color: '#FFD06B', fontSize: 13 },
  text: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  pill: { paddingHorizontal: 7, height: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: '#5BE3B0' },
  pillStreak: { backgroundColor: '#FFB938' },
  ago: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  sep: { color: 'rgba(255,208,107,0.6)', fontSize: 12, marginLeft: 6 },
  label: { position: 'absolute', left: 0, top: 0, bottom: 0, paddingHorizontal: 12, justifyContent: 'center', overflow: 'hidden', borderTopRightRadius: 16, borderBottomRightRadius: 16, zIndex: 2 },
  fadeL: { position: 'absolute', left: 96, top: 0, bottom: 0, width: 24 },
  fadeR: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 28 },
});
