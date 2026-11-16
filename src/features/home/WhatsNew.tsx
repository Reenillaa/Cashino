import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GameCover, PressableScale, T } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { LIVE_CONFIG, LIVE_GAMES, slotAt, type LiveGame } from '@/engine/meta/live.ts';
import { useNow } from '@/features/time/useNow';
import { mmss } from '@/features/live/useLive';
import { useOwnedUnlocks, useUnlocks } from '@/state/unlocks';
import { isUnlocked, type UnlockId } from '@/engine/meta/unlocks.ts';

const NEWS: { key: string; emoji: string; colors: [string, string]; href: Href }[] = [
  { key: 'cascade', emoji: '🍭', colors: ['#FF4FA3', '#7B1FA2'], href: '/game/cascade' },
  { key: 'rocket', emoji: '🚀', colors: ['#7B5CFF', '#1A0F3A'], href: '/live/crash' },
  { key: 'horses3d', emoji: '🏇', colors: ['#12C08A', '#0B4E3E'], href: '/game/horses' },
  { key: 'leagues', emoji: '🏆', colors: ['#FFB938', '#B3127A'], href: '/leagues' },
  { key: 'pass', emoji: '🎟️', colors: ['#A996FF', '#FF4FA3'], href: '/pass' },
  { key: 'sports', emoji: '🥊', colors: ['#0B6E52', '#062A24'], href: '/sports' },
];

/** "What's new" carousel at the top of Home. */
export function WhatsNew() {
  const { t } = useT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const w = Math.min(320, width * 0.74);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={w + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingHorizontal: SCREEN_PAD }}>
      {NEWS.map((n, i) => (
        <Animated.View key={n.key} entering={FadeInRight.delay(i * 60)}>
          <PressableScale onPress={() => router.push(n.href)} feedback="select" scaleTo={0.97} accessibilityLabel={t(`news.${n.key}.title`)} style={[styles.card, { width: w }]}>
            <LinearGradient colors={n.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <T style={styles.big}>{n.emoji}</T>
            <View style={styles.badge}><T weight="display" style={{ color: '#231A3A', fontSize: 10, letterSpacing: 1 }}>{t('news.badge')}</T></View>
            <View style={{ marginTop: 'auto' }}>
              <T weight="display" style={{ color: '#fff', fontSize: 20 }}>{t(`news.${n.key}.title`)}</T>
              <T variant="footnote" numberOfLines={2} style={{ color: 'rgba(255,255,255,0.88)' }}>{t(`news.${n.key}.body`)}</T>
            </View>
          </PressableScale>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const LIVE_META: Record<LiveGame, { emoji: string; colors: [string, string] }> = {
  horses: { emoji: '🏇', colors: ['#12C08A', '#0B6E6E'] },
  roulette: { emoji: '🎡', colors: ['#FF4FA3', '#B3127A'] },
  crash: { emoji: '🚀', colors: ['#7B5CFF', '#4B2BD6'] },
};

/** The three live tables with their own round clocks (time is shared, so no server call is needed). */
export function LiveRow() {
  const { t } = useT();
  const router = useRouter();
  const now = useNow(1000);
  const owned = useOwnedUnlocks();
  const openUnlock = useUnlocks((st) => st.open);
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PAD }}>
      {LIVE_GAMES.map((g) => {
        const s = slotAt(g, now);
        const open = now < s.closesAt;
        const label = open ? `${t('live.open')} ${mmss(s.closesAt - now)}` : now < s.startsAt + LIVE_CONFIG[g].show ? t('live.running') : `${t('live.next')} ${mmss(s.endsAt - now)}`;
        return (
          <PressableScale key={g} onPress={() => (isUnlocked(owned, `live:${g}` as UnlockId) ? router.push(`/live/${g}`) : openUnlock(`live:${g}` as UnlockId))} feedback="select" scaleTo={0.96} accessibilityLabel={`${t(`live.${g}`)} · ${label}`} style={styles.live}>
            <LinearGradient colors={LIVE_META[g].colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={StyleSheet.absoluteFill}><GameCover id={g} width={120} height={132} /></View>
            <LinearGradient colors={['rgba(0,0,0,0.15)', `${LIVE_META[g].colors[1]}EE`]} locations={[0.25, 0.85]} style={StyleSheet.absoluteFill} />
            <View style={styles.dotRow}><View style={styles.dot} /><T weight="display" style={{ color: '#fff', fontSize: 9, letterSpacing: 1 }}>LIVE</T></View>
            {isUnlocked(owned, `live:${g}` as UnlockId) ? <T style={{ fontSize: 30, marginTop: 4 }}>{LIVE_META[g].emoji}</T> : <T style={{ fontSize: 26, marginTop: 6 }}>🔒</T>}
            <T weight="display" numberOfLines={1} style={{ color: '#fff', fontSize: 13 }}>{t(`live.short.${g}`)}</T>
            <View style={[styles.clock, { backgroundColor: open ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.3)' }]}>
              <T weight="displaySemi" tabular numberOfLines={1} style={{ color: open ? '#231A3A' : '#fff', fontSize: 10 }}>{label}</T>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 168, borderRadius: 26, padding: 16, overflow: 'hidden' },
  big: { position: 'absolute', right: 10, top: 6, fontSize: 70, lineHeight: 84 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: '#FFD06B' },
  live: { flex: 1, height: 132, borderRadius: 22, padding: 10, overflow: 'hidden', alignItems: 'center' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 6, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B5C' },
  clock: { marginTop: 'auto', paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center' },
});
