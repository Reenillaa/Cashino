import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, Extrapolation, FadeInDown, interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler,
  useAnimatedStyle, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { GameId } from '@/engine/games/types.ts';
import { canEnterRoom, ROOMS, type Room } from '@/engine/meta/rooms.ts';
import { Button, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { motion, onPastel, radius, roomArt } from '@/design/tokens';
import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

const EASE = Easing.bezier(...motion.ease);
const EASE_ENTER = Easing.bezier(...motion.easeEnter);
const GAP = 14;

function RoomCard({
  room, index, x, step, width, balance, onPress, leaving, selected, describe,
}: {
  room: Room; index: number; x: SharedValue<number>; step: number; width: number; balance: number;
  onPress: () => void; leaving: SharedValue<number>; selected: boolean; describe?: (r: Room) => string | null;
}) {
  const { t } = useT();
  const open = canEnterRoom(room, balance);
  const art = roomArt[room.id];
  const style = useAnimatedStyle(() => {
    const r = [(index - 1) * step, index * step, (index + 1) * step];
    const s = interpolate(x.value, r, [0.9, 1, 0.9], Extrapolation.CLAMP);
    const o = interpolate(x.value, r, [0.5, 1, 0.5], Extrapolation.CLAMP);
    const y = interpolate(x.value, r, [18, 0, 18], Extrapolation.CLAMP);
    const rot = interpolate(x.value, r, [3, 0, -3], Extrapolation.CLAMP);
    // While entering the chosen room, the others fade back and the chosen one settles forward.
    const lift = selected ? 1 + 0.04 * leaving.value : 1;
    const fade = selected ? 1 : 1 - leaving.value;
    return { opacity: o * fade, transform: [{ translateY: y }, { rotate: `${rot}deg` }, { scale: s * lift }] };
  });
  const extra = describe?.(room);
  const coins = t('common.coins');
  return (
    <Animated.View style={[{ width, marginRight: GAP }, style]}>
      <PressableScale
        onPress={onPress}
        feedback="none"
        scaleTo={0.975}
        accessibilityRole="button"
        accessibilityLabel={`${t(`rooms.${room.id}`)}, ${formatCoins(room.min)}–${formatCoins(room.max)} ${coins}${open ? '' : `, ${t('rooms.locked', { amount: formatCoins(room.min) })}`}`}
        style={styles.card}
      >
        <LinearGradient colors={art.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.cardTop, !open && { opacity: 0.55 }]}>
          <Text style={{ fontSize: 52, lineHeight: 60 }} accessible={false}>{open ? art.emoji : '🔒'}</Text>
          <View style={[styles.pill, { backgroundColor: onPastel.chip }]}>
            <T variant="footnote" weight="semibold" style={{ color: onPastel.text }}>{t(`rooms.tier.${room.id}`)}</T>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <View style={!open && { opacity: 0.55 }}>
          <T variant="title" weight="semibold" style={{ color: onPastel.text, fontSize: 30 }}>{t(`rooms.${room.id}`)}</T>
          <T variant="footnote" style={{ color: onPastel.text2, marginTop: 10 }}>{t('rooms.limits')}</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <T variant="display" tabular adjustsFontSizeToFit numberOfLines={1} style={{ color: onPastel.text, flexShrink: 1 }}>
              {formatCoins(room.min)}–{formatCoins(room.max)}
            </T>
            <T variant="callout" style={{ color: onPastel.text2 }}>{coins}</T>
          </View>
        </View>
        <View style={{ marginTop: 12, gap: 2 }}>
          {extra ? <T variant="footnote" weight="medium" style={{ color: onPastel.text }}>{extra}</T> : null}
          <T variant="footnote" weight={open ? 'regular' : 'semibold'} style={{ color: open ? onPastel.text2 : onPastel.text }}>
            {open ? (room.practice ? t('rooms.free') : t('rooms.counts')) : t('rooms.locked', { amount: formatCoins(room.min) })}
          </T>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * Offsuit-style room carousel: pastel "place" cards follow the scroll (scale/opacity/offset/tilt only),
 * snap, tick with a light haptic, and the chosen room settles forward before the table appears.
 */
export function RoomPicker({
  balance, initial, onPick, describe,
}: {
  game: GameId; balance: number; initial: Room['id']; onPick: (room: Room) => void; describe?: (r: Room) => string | null;
}) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
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
      <Animated.View entering={entering(0)} style={{ paddingHorizontal: 24, marginBottom: 18 }}>
        <T variant="title">{t('rooms.title')}</T>
        <T variant="body" color="text2" style={{ marginTop: 6 }}>{t('rooms.subtitle')}</T>
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
            <RoomCard key={r.id} room={r} index={i} x={x} step={step} width={cardW} balance={balance} onPress={() => tap(i)} leaving={leaving} selected={chosen === i} describe={describe} />
          ))}
        </Animated.ScrollView>
      </Animated.View>
      <Animated.View entering={entering(2)} style={styles.dots}>
        {ROOMS.map((r, i) => (
          <Dot key={r.id} i={i} x={x} step={step} color={c.text} />
        ))}
      </Animated.View>
      <Animated.View entering={entering(3)} style={{ paddingHorizontal: 20, marginTop: 18 }}>
        <Button
          title={open ? t('rooms.enter', { name: t(`rooms.${room.id}`) }) : t('rooms.locked', { amount: formatCoins(room.min) })}
          subtitle={`${formatCoins(room.min)}–${formatCoins(room.max)} ${t('common.coins')}`}
          disabled={!open || chosen !== null}
          onPress={() => enter(index)}
        />
      </Animated.View>
    </View>
  );
}

function Dot({ i, x, step, color }: { i: number; x: SharedValue<number>; step: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const r = [(i - 1) * step, i * step, (i + 1) * step];
    return {
      opacity: interpolate(x.value, r, [0.35, 1, 0.35], Extrapolation.CLAMP),
      transform: [{ scaleX: interpolate(x.value, r, [1, 2.6, 1], Extrapolation.CLAMP) }],
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  card: { height: 360, borderRadius: radius.xl, padding: 22, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
