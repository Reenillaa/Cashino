import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, FadeIn, interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { distanceFit, goingFit, oddsFor, type BetType, type Horse, type RaceCard } from '@/engine/games/horses.ts';
import { GOING_ICON, HorseSprite, Saddle, Silks } from './Art';
import { haptic } from '@/services/haptics';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';

const fmtOdds = (x: number) => x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formColor = (p: number) => (p === 1 ? '#FFD06B' : p <= 3 ? '#5BE3B0' : 'rgba(255,255,255,0.22)');

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <T variant="caption" color="text2" numberOfLines={1} style={{ width: 58, fontSize: 11 }}>{label}</T>
      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(4, ((value - 40) / 60) * 100)}%`, backgroundColor: color }]} /></View>
      <T weight="displaySemi" tabular style={{ width: 22, fontSize: 11, color: '#fff', textAlign: 'right' }}>{value}</T>
    </View>
  );
}

const ITEM = 88;

/**
 * The race card as a wheel of horses, like the chip wheel: swipe (or tap) and the horse in the middle is the
 * one you are looking at, with everything a punter studies below it. Tap the middle horse — or the big
 * button — to back it (the order of picks is the order for exactas and trifectas).
 */
export function RaceCardView({ card, betType, picks, onPick }: { card: RaceCard; betType: BetType; picks: number[]; onPick: (n: number) => void }) {
  const { t } = useT();
  const { c } = useTheme();
  const [focus, setFocus] = useState(0);
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const ref = useRef<Animated.ScrollView>(null);
  const oddsType: BetType = betType === 'place' ? 'place' : 'win';
  const h = card.horses[focus];
  const order = picks.indexOf(h.n);
  const gFit = goingFit(h, card.going) === 1;
  const dFit = distanceFit(h, card.distance) === 1;
  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => x.set(e.contentOffset.x) });
  const changed = (i: number) => {
    const k = Math.max(0, Math.min(card.horses.length - 1, i));
    if (k === focus) return;
    haptic.select();
    setFocus(k);
  };
  useAnimatedReaction(
    () => Math.round(x.value / ITEM),
    (now, prev) => {
      if (prev !== null && now !== prev) runOnJS(changed)(now);
    },
    [focus, card],
  );
  const pad = Math.max(0, (w - ITEM) / 2);
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T weight="display" numberOfLines={1} style={{ color: '#fff', fontSize: 15 }}>{card.race}</T>
          <T variant="caption" color="text2">{card.distance} m · {GOING_ICON[card.going]} {t(`play.going.${card.going}`)} · {card.horses.length} {t('play.runners')}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {picks.map((n, i) => (
            <View key={n} style={{ alignItems: 'center' }}>
              <Saddle n={n} silks={card.horses[n - 1].silks} size={24} selected={i + 1} />
            </View>
          ))}
        </View>
      </View>
      {/* the wheel of horses */}
      <View style={[styles.well, { backgroundColor: c.surface1 }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Animated.ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={ITEM} decelerationRate="fast" scrollEventThrottle={16} onScroll={onScroll} contentContainerStyle={{ alignItems: 'center' }}>
            <View style={{ width: pad }} />
            {card.horses.map((hh, i) => (
              <WheelHorse key={hh.n} h={hh} i={i} x={x} odds={oddsFor(card, oddsType, [hh.n])} order={picks.indexOf(hh.n)}
                onPress={() => (i === focus ? onPick(hh.n) : ref.current?.scrollTo({ x: i * ITEM, animated: true }))} />
            ))}
            <View style={{ width: pad }} />
          </Animated.ScrollView>
        ) : null}
        <View pointerEvents="none" style={styles.notch} />
      </View>
      {/* the horse in the middle, in detail */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 4, gap: 6 }} showsVerticalScrollIndicator={false}>
        <Animated.View key={h.n} entering={FadeIn.duration(180)} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Silks colors={h.silks} size={26} />
            <View style={{ flex: 1 }}>
              <T weight="display" numberOfLines={1} style={{ color: '#fff', fontSize: 16 }}>{h.n}. {h.name}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                {h.form.map((p, i) => (
                  <View key={i} style={[styles.formDot, { backgroundColor: formColor(p) }]}>
                    <T style={{ fontSize: 9, color: p <= 3 ? '#231A3A' : '#fff', fontWeight: '800' }}>{p}</T>
                  </View>
                ))}
                <T variant="caption" color="text3"> {t('play.lastRaces')}</T>
              </View>
            </View>
            <TutorialTarget id="horses:pick">
              <PressableScale onPress={() => onPick(h.n)} feedback="select" scaleTo={0.95} accessibilityLabel={order >= 0 ? `${t('play.unpick')} ${h.name}` : t('play.backHorse', { name: h.name })} style={[styles.pickBtn, order >= 0 && styles.pickOn]}>
                <T weight="display" tabular style={{ color: order >= 0 ? '#FFD06B' : '#231A3A', fontSize: 17 }}>{fmtOdds(oddsFor(card, oddsType, [h.n]))}</T>
                <T weight="displaySemi" style={{ color: order >= 0 ? '#FFD06B' : '#231A3A', fontSize: 10 }}>{order >= 0 ? `${order + 1}º · ${t('play.unpick')}` : t('play.pickShort')}</T>
              </PressableScale>
            </TutorialTarget>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Bar label={t('play.stat.speed')} value={h.speed} color="#FF4FA3" />
              <Bar label={t('play.stat.stamina')} value={h.stamina} color="#5BE3B0" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Bar label={t('play.stat.accel')} value={h.accel} color="#FFB938" />
              <Bar label={t('play.stat.jockey')} value={h.jockey.skill} color="#A996FF" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip text={`🏃 ${t(`play.style.${h.style}`)}`} />
            <Chip text={`${GOING_ICON[h.likesGoing]} ${t('play.likes')} ${t(`play.going.${h.likesGoing}`).toLowerCase()}`} good={gFit} />
            <Chip text={`📏 ${t('play.bestTrip')} ${h.bestDistance} m`} good={dFit} />
            <Chip text={`🧑 ${h.jockey.name} · ${h.age} ${t('play.years')}`} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** One horse on the wheel: standing portrait in its silks, number and price; curves away like the chips. */
function WheelHorse({ h, i, x, odds, order, onPress }: { h: Horse; i: number; x: SharedValue<number>; odds: number; order: number; onPress: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = (x.value - i * ITEM) / ITEM;
    const s = interpolate(Math.abs(d), [0, 1, 2], [1.08, 0.8, 0.64], Extrapolation.CLAMP);
    return {
      opacity: interpolate(Math.abs(d), [0, 1.5, 2.5], [1, 0.55, 0.25], Extrapolation.CLAMP),
      transform: [{ translateY: Math.min(2.5, Math.abs(d)) ** 2 * 5 }, { rotate: `${-d * 9}deg` }, { scale: s }],
    };
  });
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.94} accessibilityLabel={`${h.n}. ${h.name} · ${fmtOdds(odds)}`} style={{ width: ITEM, alignItems: 'center' }}>
      <Animated.View style={[styles.card, { borderColor: order >= 0 ? '#FFD06B' : 'rgba(255,255,255,0.12)' }, style]}>
        <View style={[styles.cardTop, { backgroundColor: h.silks[0] }]}><View style={[styles.cardStripe, { backgroundColor: h.silks[1] }]} /></View>
        <HorseSprite n={h.n} silks={h.silks} frame={4} size={70} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={styles.num}><T weight="display" style={{ color: '#231A3A', fontSize: 11 }}>{h.n}</T></View>
          <T weight="display" tabular style={{ color: '#FFD06B', fontSize: 14 }}>{fmtOdds(odds)}</T>
        </View>
        {order >= 0 ? <View style={styles.badge}><T weight="display" style={{ color: '#231A3A', fontSize: 11 }}>{order + 1}º</T></View> : null}
      </Animated.View>
    </PressableScale>
  );
}

function Chip({ text, good }: { text: string; good?: boolean }) {
  return (
    <View style={[styles.chip, good ? { backgroundColor: 'rgba(91,227,176,0.2)', borderColor: '#5BE3B0' } : null]}>
      <T variant="caption" style={{ color: good ? '#5BE3B0' : 'rgba(255,255,255,0.8)' }}>{text}{good ? ' ✓' : ''}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6, paddingHorizontal: 2 },
  oddsHead: { paddingBottom: 2 },
  well: { height: 108, borderRadius: 24, overflow: 'hidden', justifyContent: 'center' },
  notch: { position: 'absolute', top: 0, alignSelf: 'center', width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFD06B' },
  card: { width: ITEM - 6, height: 96, borderRadius: 20, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, backgroundColor: '#1C1430', borderWidth: 2, overflow: 'hidden' },
  cardTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 26, opacity: 0.85 },
  cardStripe: { position: 'absolute', left: 0, right: 0, top: 10, height: 6 },
  num: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, paddingHorizontal: 5, height: 18, borderRadius: 9, justifyContent: 'center', backgroundColor: '#FFD06B' },
  pickBtn: { minWidth: 74, paddingHorizontal: 10, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD06B', borderWidth: 2, borderColor: 'transparent' },
  pickOn: { backgroundColor: 'rgba(255,208,107,0.12)', borderColor: '#FFD06B' },
  formDot: { width: 16, height: 16, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  barTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4 },
  chip: { paddingHorizontal: 8, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'transparent' },
});
