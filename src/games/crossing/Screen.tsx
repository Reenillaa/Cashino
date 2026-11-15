import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { Button, Segmented, T, formatCoins, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';
import { CROSSING_CONFIG, crossingMultiplier, type CrossingDifficulty } from '@/engine/games/crossing.ts';
import { payoutFor } from '@/engine/games/types.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Stat, StatRow } from '../shared/Stat';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const tint = META.crossing.tint;
const LANE_W = 84;

/** Original chick character (simple geometric shapes). */
function Chick({ size, flat }: { size: number; flat?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Ellipse cx="24" cy={flat ? 38 : 28} rx={flat ? 17 : 13} ry={flat ? 5 : 14} fill="#F3D27A" />
      {!flat && (
        <>
          <Circle cx="24" cy="16" r="9" fill="#F7DC8E" />
          <Circle cx="27.5" cy="14.5" r="1.6" fill="#1A1C20" />
          <Path d="M32 17l6 1.5-6 1.5z" fill="#E59A4B" />
          <Path d="M20 7c1-3 4-3 4 0" stroke="#E59A4B" strokeWidth="2" fill="none" strokeLinecap="round" />
          <Path d="M17 30c-3 1-4 4-2 5" stroke="#E2BC5C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Path d="M21 41v4M27 41v4" stroke="#E59A4B" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

function Car({ color }: { color: string }) {
  return (
    <Svg width={46} height={70} viewBox="0 0 46 70">
      <Rect x="3" y="2" width="40" height="66" rx="12" fill={color} />
      <Rect x="9" y="12" width="28" height="14" rx="5" fill="rgba(255,255,255,0.55)" />
      <Rect x="9" y="44" width="28" height="12" rx="5" fill="rgba(255,255,255,0.3)" />
      <Rect x="8" y="64" width="9" height="4" rx="2" fill="#FFE9A8" />
      <Rect x="29" y="64" width="9" height="4" rx="2" fill="#FFE9A8" />
    </Svg>
  );
}

interface CView { lane: number; status: string; difficulty: CrossingDifficulty; bet: number; multiplier: number; hitLane?: number | null }

export default function CrossingScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('crossing');
  const [bet, setBet] = useBet('crossing', s.room);
  const [difficulty, setDifficulty] = useState<CrossingDifficulty>('medium');
  const [view, setView] = useState<CView | null>((s.active?.view as unknown as CView) ?? null);
  const [moving, setMoving] = useState(false);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('crossing');
  const scroll = useRef<ScrollViewInstance>(null);
  const hop = useSharedValue(0);
  const carY = useSharedValue(-120);
  const active = view?.status === 'active';
  const diff = view?.difficulty ?? difficulty;
  const lanes = CROSSING_CONFIG[diff].lanes;
  const lane = view?.lane ?? 0;
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, (lane - 1) * LANE_W), animated: !reduceMotion });
  }, [lane, reduceMotion]);

  const start = async () => {
    try {
      const r = await s.op('start', { bet, difficulty });
      setView(r.view as unknown as CView);
      carY.set(-120);
      sfx('chip');
      tutorialEvent('crossing', 'crossing:start');
    } catch (e) {
      onError(e);
    }
  };
  const go = async () => {
    try {
      setMoving(true);
      const r = await s.op('advance');
      const v = r.view as unknown as CView;
      if (!reduceMotion) hop.set(withSequence(withTiming(-16, { duration: 120, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) })));
      sfx('step');
      haptic.light();
      setView(v);
      tutorialEvent('crossing', 'crossing:advance');
      if (v.status === 'lost') {
        carY.set(-120);
        carY.set(reduceMotion ? 140 : withTiming(420, { duration: 520, easing: Easing.in(Easing.quad) }));
        await wait(reduceMotion ? 0 : 260);
        sfx('hit');
        haptic.heavy();
        show({ bet: v.bet, payout: 0 }, { silent: true });
        tutorialEvent('crossing', 'crossing:end');
      } else if (r.done) {
        show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
        tutorialEvent('crossing', 'crossing:end');
      }
    } catch (e) {
      onError(e);
    } finally {
      setMoving(false);
    }
  };
  const cashout = async () => {
    try {
      const r = await s.op('cashout');
      const v = r.view as unknown as CView;
      setView(v);
      sfx('cashout');
      show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
      tutorialEvent('crossing', 'crossing:end');
    } catch (e) {
      onError(e);
    }
  };
  const chickStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));
  const carStyle = useAnimatedStyle(() => ({ transform: [{ translateY: carY.value }] }));
  const lost = view?.status === 'lost';
  return (
    <GameShell
      game="crossing"
      mode={s.mode}
      balance={s.balance}
      locked={active}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} scrollEnabled={!active} contentContainerStyle={{ paddingRight: 40 }}>
            <View style={[styles.road, { backgroundColor: c.surface1 }]}>
              {/* Sidewalk */}
              <View style={[styles.lane, { width: LANE_W, backgroundColor: c.surface2 }]}>
                {lane === 0 && (
                  <Animated.View style={chickStyle}>
                    <Chick size={52} />
                  </Animated.View>
                )}
              </View>
              {Array.from({ length: lanes }, (_, i) => i + 1).map((n) => {
                const passed = n < lane || (n === lane && !lost);
                const here = n === lane;
                return (
                  <View key={n} style={[styles.lane, { width: LANE_W, borderLeftColor: alpha(c.text3, 0.35) }]} accessibilityLabel={`${t('play.lane', { n })} · ${formatMult(crossingMultiplier(diff, n))}`}>
                    <View style={[styles.mult, { backgroundColor: passed ? alpha(tint, 0.25) : c.surface2, borderColor: n === lane + 1 && active ? tint : 'transparent' }]}>
                      <T style={{ fontFamily: 'Geist_600SemiBold', fontSize: 11, color: passed ? tint : c.text2 }} numberOfLines={1} adjustsFontSizeToFit>{formatMult(crossingMultiplier(diff, n))}</T>
                    </View>
                    {here && (
                      <Animated.View style={[styles.chickSpot, chickStyle]}>
                        <Chick size={52} flat={lost} />
                      </Animated.View>
                    )}
                    {here && lost && (
                      <Animated.View style={[styles.car, carStyle]}>
                        <Car color={c.loss} />
                      </Animated.View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          {active ? (
            <StatRow>
              <Stat label={t('play.multiplierNow')} value={lane ? formatMult(view!.multiplier) : '—'} tint={tint} />
              <Stat label={t('play.nextMultiplier')} value={formatMult(crossingMultiplier(diff, lane + 1))} />
              <Stat label={t('play.safeChance')} value={`${((1 - CROSSING_CONFIG[diff].hitChance) * 100).toFixed(0)} %`} />
            </StatRow>
          ) : (
            <>
              <Segmented
                size="sm"
                value={difficulty}
                onChange={setDifficulty}
                options={[{ value: 'easy', label: t('play.easy') }, { value: 'medium', label: t('play.medium') }, { value: 'hard', label: t('play.hard') }, { value: 'extreme', label: t('play.extreme') }]}
                style={{ marginBottom: 10 }}
              />
              <BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} tint={tint} />
            </>
          )}
          {active ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title={t('play.go')} kind="secondary" onPress={go} loading={moving} style={{ flex: 1 }} />
              <Button title={t('common.cashout')} subtitle={lane ? `${formatCoins(payoutFor(view!.bet, view!.multiplier))} Ti` : undefined} onPress={cashout} disabled={lane === 0 || moving} style={{ flex: 1.4 }} />
            </View>
          ) : (
            <Button title={t('play.placeBet')} onPress={start} disabled={(bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ marginTop: 12 }} />
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  road: { flexDirection: 'row', height: 260, borderRadius: 24, overflow: 'hidden', marginLeft: 16 },
  lane: { alignItems: 'center', justifyContent: 'center', borderLeftWidth: 2, borderStyle: 'dashed', overflow: 'hidden' },
  mult: { position: 'absolute', top: 14, paddingHorizontal: 8, height: 26, minWidth: 58, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  chickSpot: { marginTop: 20 },
  car: { position: 'absolute', top: 0 },
});
