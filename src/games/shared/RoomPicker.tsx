import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, Extrapolation, FadeInDown, interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler,
  useAnimatedStyle, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { GameId } from '@/engine/games/types.ts';
import { canEnterRoom, ROOMS, type Room } from '@/engine/meta/rooms.ts';
import { Button, GameGlyph, Icon, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { motion, radius } from '@/design/tokens';
import { useT } from '@/i18n';
import { META } from '../catalog';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

const EASE = Easing.bezier(...motion.ease);
const EASE_ENTER = Easing.bezier(...motion.easeEnter);
const GAP = 14;

/** Glow strength per tier: the "anodized" accent deepens as the stakes rise. */
const TIER_GLOW: Record<Room['id'], number> = { practice: 0.08, r1: 0.18, r2: 0.3, r3: 0.45 };

function RoomCard({
  game, room, index, x, step, width, tint, balance, onPress, leaving, selected, describe,
}: {
  game: GameId; room: Room; index: number; x: SharedValue<number>; step: number; width: number; tint: string; balance: number;
  onPress: () => void; leaving: SharedValue<number>; selected: boolean; describe?: (r: Room) => string | null;
}) {
  const { t } = useT();
  const { c, isDark } = useTheme();
  const open = canEnterRoom(room, balance);
  const style = useAnimatedStyle(() => {
    const r = [(index - 1) * step, index * step, (index + 1) * step];
    const s = interpolate(x.value, r, [0.9, 1, 0.9], Extrapolation.CLAMP);
    const o = interpolate(x.value, r, [0.55, 1, 0.55], Extrapolation.CLAMP);
    const y = interpolate(x.value, r, [16, 0, 16], Extrapolation.CLAMP);
    // While entering the chosen room, the others fade back and the chosen one settles forward.
    const lift = selected ? 1 + 0.03 * leaving.value : 1;
    const fade = selected ? 1 : 1 - leaving.value;
    return { opacity: o * fade, transform: [{ translateY: y }, { scale: s * lift }] };
  });
  const glow = TIER_GLOW[room.id];
  const extra = describe?.(room);
  return (
    <Animated.View style={[{ width, marginRight: GAP }, style]}>
      <PressableScale
        onPress={onPress}
        feedback="none"
        accessibilityRole="button"
        accessibilityLabel={`${t(`rooms.${room.id}`)}, ${formatCoins(room.min)}–${formatCoins(room.max)} Ti${open ? '' : `, ${t('rooms.locked', { amount: formatCoins(room.min) })}`}`}
        style={[styles.card, { backgroundColor: c.surface1, borderColor: open ? c.hairlineStrong : c.hairline }]}
      >
        <LinearGradient colors={[alpha(tint, glow + 0.06), alpha(tint, 0.02)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={[isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} end={{ x: 0, y: 0.35 }} style={StyleSheet.absoluteFill} />
        <View style={styles.cardTop}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{ width: 9, height: 9, borderRadius: 2, transform: [{ rotate: '45deg' }], backgroundColor: k < ['practice', 'r1', 'r2', 'r3'].indexOf(room.id) ? tint : c.surface3 }}
              />
            ))}
          </View>
          <T variant="caption" color="text3">{t(`rooms.tier.${room.id}`)}</T>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
          <View style={[styles.glyph, { backgroundColor: alpha(tint, 0.14), borderColor: alpha(tint, 0.35) }]}>
            <GameGlyph game={game} size={30} color={tint} />
          </View>
        </View>
        <T variant="headline" style={{ marginBottom: 2 }}>{t(`rooms.${room.id}`)}</T>
        <T variant="caption" color="text3" style={{ marginTop: 10 }}>{t('rooms.limits')}</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <T variant="display" tabular adjustsFontSizeToFit numberOfLines={1} style={{ flexShrink: 1 }}>
            {formatCoins(room.min)}–{formatCoins(room.max)}
          </T>
          <T variant="callout" color="text3">Ti</T>
        </View>
        <View style={[styles.meta, { borderTopColor: c.hairline }]}>
          {extra ? <T variant="footnote" color="text2">{extra}</T> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={open ? (room.practice ? 'sparkles' : 'star') : 'lock'} size={14} color={open ? c.text3 : c.warn} />
            <T variant="footnote" color={open ? 'text3' : 'warn'}>
              {open ? (room.practice ? t('rooms.free') : t('rooms.counts')) : t('rooms.locked', { amount: formatCoins(room.min) })}
            </T>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * Offsuit-style room carousel in Titanium: cards follow the scroll (scale/opacity/offset only),
 * snap, tick with a light haptic, and the chosen room settles forward before the table appears.
 */
export function RoomPicker({
  game, balance, initial, onPick, describe,
}: {
  game: GameId; balance: number; initial: Room['id']; onPick: (room: Room) => void; describe?: (r: Room) => string | null;
}) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const tint = META[game].tint;
  const cardW = Math.min(Math.round(Math.min(width, 520) * 0.72), 320);
  const step = cardW + GAP;
  const pad = (Math.min(width, 520) - cardW) / 2;
  const startIndex = Math.max(0, ROOMS.findIndex((r) => r.id === initial));
  const [index, setIndex] = useState(startIndex);
  const [chosen, setChosen] = useState<number | null>(null);
  const x = useSharedValue(startIndex * step);
  const leaving = useSharedValue(0);
  const scroller = React.useRef<Animated.ScrollView>(null);
  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => x.set(e.contentOffset.x) });
  const tick = (i: number) => {
    setIndex(i);
    haptic.select();
    sfx('tick', 0.35);
  };
  useAnimatedReaction(
    () => Math.round(x.value / step),
    (now, prev) => {
      if (prev !== null && now !== prev && now >= 0 && now < ROOMS.length) runOnJS(tick)(now);
    },
    [step],
  );
  useEffect(() => {
    const id = setTimeout(() => scroller.current?.scrollTo({ x: startIndex * step, animated: false }), 0);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const room = ROOMS[index];
  const open = canEnterRoom(room, balance);
  // A soft anodized glow behind the cards; it deepens with the tier of the focused room.
  const glowLevels = useMemo(() => ROOMS.map((r) => 0.35 + TIER_GLOW[r.id] * 1.4), []);
  const ground = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, ROOMS.map((_, i) => i * step), glowLevels, Extrapolation.CLAMP),
  }));
  const enter = (i: number) => {
    const r = ROOMS[i];
    if (!canEnterRoom(r, balance)) {
      haptic.warning();
      return;
    }
    haptic.medium();
    sfx('chip', 0.7);
    setChosen(i);
    leaving.set(withTiming(1, { duration: reduceMotion ? 0 : motion.slide, easing: EASE }));
    setTimeout(() => onPick(r), reduceMotion ? 0 : motion.slide);
  };
  const tap = (i: number) => {
    if (i === index) enter(i);
    else scroller.current?.scrollTo({ x: i * step, animated: !reduceMotion });
  };
  const entering = (k: number) => (reduceMotion ? undefined : FadeInDown.duration(520).delay(60 * k).easing(EASE_ENTER));
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[styles.ground, ground]}>
        <LinearGradient colors={['rgba(0,0,0,0)', alpha(tint, 0.32), 'rgba(0,0,0,0)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View entering={entering(0)} style={{ paddingHorizontal: 24, marginBottom: 18 }}>
        <T variant="caption" color="text3">{t(`games.names.${game}`)}</T>
        <T variant="title">{t('rooms.title')}</T>
        <T variant="footnote" color="text3" style={{ marginTop: 4 }}>{t('rooms.subtitle')}</T>
      </Animated.View>
      <Animated.View entering={entering(1)}>
        <Animated.ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          disableIntervalMomentum
          scrollEventThrottle={16}
          onScroll={onScroll}
          contentContainerStyle={{ paddingHorizontal: pad, paddingVertical: 8 }}
          accessibilityRole="adjustable"
        >
          {ROOMS.map((r, i) => (
            <RoomCard key={r.id} game={game} room={r} index={i} x={x} step={step} width={cardW} tint={tint} balance={balance} onPress={() => tap(i)} leaving={leaving} selected={chosen === i} describe={describe} />
          ))}
        </Animated.ScrollView>
      </Animated.View>
      <Animated.View entering={entering(2)} style={styles.dots}>
        {ROOMS.map((r, i) => (
          <Dot key={r.id} i={i} x={x} step={step} color={c.text} dim={c.surface3} />
        ))}
      </Animated.View>
      <Animated.View entering={entering(3)} style={{ paddingHorizontal: 20, marginTop: 18 }}>
        <Button
          title={open ? t('rooms.enter', { name: t(`rooms.${room.id}`) }) : t('rooms.locked', { amount: formatCoins(room.min) })}
          subtitle={`${formatCoins(room.min)}–${formatCoins(room.max)} Ti`}
          disabled={!open || chosen !== null}
          onPress={() => enter(index)}
        />
      </Animated.View>
    </View>
  );
}

function Dot({ i, x, step, color, dim }: { i: number; x: SharedValue<number>; step: number; color: string; dim: string }) {
  const style = useAnimatedStyle(() => {
    const r = [(i - 1) * step, i * step, (i + 1) * step];
    return {
      opacity: interpolate(x.value, r, [0.35, 1, 0.35], Extrapolation.CLAMP),
      transform: [{ scaleX: interpolate(x.value, r, [1, 2.6, 1], Extrapolation.CLAMP) }],
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style, { shadowColor: dim }]} />;
}

const styles = StyleSheet.create({
  ground: { position: 'absolute', left: 0, right: 0, top: '22%', height: 420 },
  card: { height: 340, borderRadius: radius.xl, padding: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  glyph: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
