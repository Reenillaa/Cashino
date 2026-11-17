import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused } from 'expo-router';
import { GameCover, GameLogo, Marquee, PressableScale, Screen, T, formatCoins } from '@/design/components';
import { SCREEN_PAD, gameVivid } from '@/design/tokens';
import { CONTENT_MAX, useContentWidth, useDesktop } from '@/design/layout';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { CATALOG, SLOT_HALL } from '@/games/catalog';
import type { GameId } from '@/engine/games/types.ts';
import { isUnlocked, type UnlockId } from '@/engine/meta/unlocks.ts';
import { useNextUnlockPrice, useOwnedUnlocks, useUnlocks } from '@/state/unlocks';

const HALL = SLOT_HALL;

const LOGO = 58;
/** One window of the attract display: the four machine logos roll past in a loop. */
function AttractReel({ offset, running }: { offset: number; running: boolean }) {
  const y = useSharedValue(0);
  const order = HALL.map((_, i) => HALL[(i + offset) % HALL.length].id);
  useEffect(() => {
    if (!running) {
      y.set(0);
      return;
    }
    y.set(0);
    y.set(withDelay(offset * 180, withRepeat(withTiming(-LOGO * HALL.length, { duration: 2600 + offset * 300, easing: Easing.linear }), -1, false)));
  }, [running, offset, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={styles.attract}>
      <Animated.View style={st}>
        {[...order, ...order].map((id, k) => (
          <View key={k} style={{ height: LOGO, alignItems: 'center', justifyContent: 'center' }}><GameLogo game={id} size={LOGO - 8} /></View>
        ))}
      </Animated.View>
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** A row of little bulbs on top of each cabinet that blink one after another. */
function Bulb({ i, running, color }: { i: number; running: boolean; color: string }) {
  const o = useSharedValue(0.35);
  useEffect(() => {
    if (!running) {
      o.set(0.8);
      return;
    }
    o.set(withDelay(i * 120, withRepeat(withSequence(withTiming(1, { duration: 240 }), withTiming(0.3, { duration: 600 })), -1, false)));
  }, [running, i, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.bulb, { backgroundColor: color, shadowColor: color }, st]} />;
}

function Cabinet({ id, reels, max, free, width, index, running }: { id: GameId; reels: string; max: number; free: boolean; width: number; index: number; running: boolean }) {
  const { t } = useT();
  const owned = useOwnedUnlocks();
  const price = useNextUnlockPrice();
  const openUnlock = useUnlocks((st) => st.open);
  const locked = !isUnlocked(owned, `game:${id}` as UnlockId);
  const vivid = gameVivid[id];
  const meta = CATALOG.find((g) => g.id === id);
  const screenH = Math.round(width * 0.82);
  const press = () => (locked ? openUnlock(`game:${id}` as UnlockId) : router.push(`/game/${id}`));
  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 70).springify().damping(16)} style={{ width }}>
      <PressableScale onPress={press} scaleTo={0.97} accessibilityLabel={`${t(`games.names.${id}`)}${locked ? ` · ${t('home.hallUnlock')}` : ''}`}>
        <View style={[styles.cabinet, { borderColor: '#FFD06B' }]}>
          <LinearGradient colors={[vivid[0], vivid[1], '#0A0618']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
          {/* topper: blinking bulbs and the machine name */}
          <View style={styles.bulbs}>{Array.from({ length: 9 }, (_, i) => <Bulb key={i} i={i} running={running} color={i % 2 ? '#FFE58A' : '#FF4FA3'} />)}</View>
          <T weight="display" numberOfLines={1} align="center" style={[styles.name, { fontSize: Math.min(16, Math.floor((width - 30) / (t(`games.names.${id}`).length * 1.02))), letterSpacing: width < 240 ? 0.4 : 1.5 }]}>{t(`games.names.${id}`).toUpperCase()}</T>
          {/* the screen */}
          <View style={[styles.screen, { height: screenH }]}>
            <GameCover id={id} width={width - 24} height={screenH} />
            <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.5 }} style={StyleSheet.absoluteFill} />
            {locked ? (
              <View style={styles.lock}>
                <T style={{ fontSize: 30 }}>🔒</T>
              </View>
            ) : null}
          </View>
          <View style={styles.tags}>
            <View style={styles.tag}><T variant="caption" weight="semibold" style={{ color: '#fff' }}>{t('home.hallReels', { r: reels })}</T></View>
            <View style={styles.tag}><T variant="caption" weight="semibold" style={{ color: '#FFE58A' }}>{t('home.hallMax', { n: formatCoins(max) })}</T></View>
            {free ? <View style={styles.tag}><T variant="caption" weight="semibold" style={{ color: '#5BE3B0' }}>{t('home.hallFree')}</T></View> : null}
          </View>
          <T variant="caption" color="text2" numberOfLines={3} align="center" style={{ minHeight: 32, paddingHorizontal: 8 }}>{t(`games.blurbs.${id}`)}</T>
          <View style={[styles.cta, { backgroundColor: locked ? 'rgba(255,255,255,0.12)' : '#FFD06B' }]}>
            <T weight="display" style={{ color: locked ? '#fff' : '#231A3A', fontSize: 15 }}>
              {locked ? `🔒 ${t('home.hallUnlock')} · ${formatCoins(price)}` : `▶ ${t('home.hallPlay')}`}
            </T>
          </View>
          {meta ? <T variant="caption" color="text3" align="center" style={{ marginTop: 6 }}>{t('home.hallRtp', { v: meta.rtp })}</T> : null}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * The slot hall: a big attract machine on top whose reels roll through every slot, then one cabinet per
 * machine with its own art, features, return and lock state.
 */
export default function SlotHall() {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const focused = useIsFocused();
  const desktop = useDesktop();
  const width = useContentWidth();
  const running = focused && !reduceMotion;
  const cols = desktop ? 4 : 2;
  const avail = (desktop ? Math.min(width, CONTENT_MAX) : Math.min(width, 640)) - SCREEN_PAD * 2;
  const cabW = Math.floor((avail - 14 * (cols - 1)) / cols);
  return (
    <Screen title={t('home.hallTitle')} back wide tabBar={false}>
      <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 8 }}>
        <Marquee colors={['#3A0D3E', '#12051C']}>
          <View style={{ alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16, gap: 12 }}>
            <T weight="display" align="center" style={[styles.hero, !desktop && { fontSize: 18 }]}>{desktop ? '🎰 ' : ''}{t('home.hallTitle').toUpperCase()}{desktop ? ' 🎰' : ''}</T>
            <View style={styles.attractRow}>
              {[0, 1, 2, 3].map((k) => <AttractReel key={k} offset={k} running={running} />)}
            </View>
            <T variant="footnote" align="center" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: 520 }}>{t('home.hallSub')}</T>
          </View>
        </Marquee>
      </View>
      <View style={[styles.grid, { paddingHorizontal: SCREEN_PAD }]}>
        {HALL.map((m, i) => <Cabinet key={m.id} {...m} width={cabW} index={i} running={running} />)}
      </View>
      <T variant="footnote" color="text3" align="center" style={{ marginTop: 24, paddingHorizontal: 40 }}>{t('common.noMoneyDisclaimer')}</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { color: '#FFE58A', fontSize: 22, letterSpacing: 2, textShadowColor: 'rgba(255,79,163,0.8)', textShadowRadius: 14 },
  attractRow: { flexDirection: 'row', gap: 8, padding: 8, borderRadius: 18, backgroundColor: '#05030C', borderWidth: 3, borderColor: '#FFD06B' },
  attract: { width: LOGO + 6, height: LOGO * 1.6, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 22 },
  cabinet: { borderRadius: 24, borderWidth: 3, padding: 12, paddingTop: 8, overflow: 'hidden', alignItems: 'stretch', gap: 8 },
  bulbs: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  bulb: { width: 7, height: 7, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 5 },
  name: { color: '#FFFFFF', fontSize: 16, letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  screen: { borderRadius: 14, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,229,138,0.8)', backgroundColor: '#000' },
  lock: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(10,6,24,0.55)', alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center' },
  tag: { paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  cta: { height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
