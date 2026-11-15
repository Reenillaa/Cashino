import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path, Text as SvgText } from 'react-native-svg';
import { Button, T, formatCoins, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { streakMultiplier, type Side } from '@/engine/games/coinflip.ts';
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
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';

const tint = META.coinflip.tint;

/** Detailed coin: reeded edge, raised rim, ring of beads, engraved emblem and the side's name. */
function CoinFace({ side, size, label }: { side: Side; size: number; label: string }) {
  const heads = side === 'heads';
  const id = `cf${side}`;
  const ticks = Array.from({ length: 72 }, (_, i) => (i * 360) / 72);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={heads ? '#FFF1B8' : '#F4F6FA'} />
          <Stop offset="0.45" stopColor={heads ? '#F2C14E' : '#C9CED8'} />
          <Stop offset="1" stopColor={heads ? '#A86A08' : '#7E858F'} />
        </LinearGradient>
        <LinearGradient id={`${id}f`} x1="1" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={heads ? '#FFE07A' : '#E6E9EF'} />
          <Stop offset="1" stopColor={heads ? '#C98B12' : '#9AA1AC'} />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="49" fill={heads ? '#8A5300' : '#5E646E'} />
      <Circle cx="50" cy="50" r="47.5" fill={`url(#${id}g)`} />
      {ticks.map((a) => (
        <Path key={a} d="M50 2.5 L50 6.5" stroke={heads ? 'rgba(110,60,0,0.55)' : 'rgba(40,44,52,0.45)'} strokeWidth={1.2} transform={`rotate(${a} 50 50)`} />
      ))}
      <Circle cx="50" cy="50" r="41" fill={`url(#${id}f)`} stroke={heads ? '#FFF1B8' : '#FFFFFF'} strokeWidth={1.6} />
      {Array.from({ length: 28 }, (_, i) => (i * 360) / 28).map((a) => (
        <Circle key={a} cx="50" cy="13.5" r="1.1" fill={heads ? 'rgba(110,60,0,0.5)' : 'rgba(40,44,52,0.4)'} transform={`rotate(${a} 50 50)`} />
      ))}
      {heads ? (
        <G>
          <Path d="M36 34 L39 26 L44 31 L50 23 L56 31 L61 26 L64 34 Z" fill="#FFF1B8" stroke="#8A5300" strokeWidth={1.4} strokeLinejoin="round" />
          <Circle cx="50" cy="50" r="15" fill="none" stroke="#8A5300" strokeWidth={2.4} />
          <Circle cx="44.5" cy="47" r="1.9" fill="#8A5300" />
          <Circle cx="55.5" cy="47" r="1.9" fill="#8A5300" />
          <Path d="M43 54 Q50 60 57 54" stroke="#8A5300" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Path d="M50 30 V66 M36 46 H64" stroke="#3E444E" strokeWidth={6} strokeLinecap="round" />
          <Path d="M30 62 Q24 48 32 34" stroke="#3E444E" strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M70 62 Q76 48 68 34" stroke="#3E444E" strokeWidth={2} fill="none" strokeLinecap="round" />
          {[0, 1, 2].map((i) => (
            <G key={i}>
              <Path d={`M${29 - i} ${54 - i * 8} q-4 -2 -5 -6`} stroke="#3E444E" strokeWidth={1.6} fill="none" />
              <Path d={`M${71 + i} ${54 - i * 8} q4 -2 5 -6`} stroke="#3E444E" strokeWidth={1.6} fill="none" />
            </G>
          ))}
        </G>
      )}
      <Path id={`${id}arc`} d="M24 70 A30 30 0 0 0 76 70" fill="none" />
      <SvgText fontSize="7.5" fontWeight="800" letterSpacing="1.5" fill={heads ? '#8A5300' : '#3E444E'} textAnchor="middle" x="50" y="80">{label.toUpperCase()}</SvgText>
    </Svg>
  );
}

export default function CoinflipScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('coinflip');
  const [bet, setBet] = useBet('coinflip', s.room);
  const restored = s.active?.view as { wins?: number; bet?: number; history?: { call: Side; result: Side }[] } | undefined;
  const [wins, setWins] = useState(restored?.wins ?? 0);
  // The active round lives in the session store (local or server), so it survives restarts.
  const active = !!s.active;
  const [face, setFace] = useState<Side>('heads');
  const [flipping, setFlipping] = useState(false);
  const [calls, setCalls] = useState<{ call: Side; result: Side }[]>(restored?.history ?? []);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('coinflip');
  const rot = useSharedValue(0);
  const lift = useSharedValue(0);
  const roundBet = restored?.bet ?? bet;

  const start = async () => {
    try {
      await s.op('start', { bet });
      setWins(0);
      setCalls([]);
      sfx('chip');
      tutorialEvent('coinflip', 'coin:start');
    } catch (e) {
      onError(e);
    }
  };
  const call = async (side: Side) => {
    try {
      setFlipping(true);
      const r = await s.op('call', { side });
      const v = r.view as { wins: number; status: string; history: { call: Side; result: Side }[] };
      const last = v.history[v.history.length - 1].result;
      sfx('coin');
      haptic.light();
      if (!reduceMotion) {
        // Whole turns only: the face is swapped while the coin is edge-on, so it never lands mirrored.
        rot.set(0);
        rot.set(withTiming(6 * 360, { duration: 1150, easing: Easing.out(Easing.cubic) }));
        setTimeout(() => setFace(last), 600);
        lift.set(
          withSequence(
            withTiming(-110, { duration: 520, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) }),
            withTiming(-16, { duration: 120, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }),
          ),
        );
        await wait(1290);
        haptic.medium();
      }
      setFace(last);
      setCalls(v.history);
      setWins(v.wins);
      tutorialEvent('coinflip', 'coin:call');
      if (r.done) {
        show({ bet: roundBet, payout: 0 });
      } else {
        sfx('reveal');
      }
    } catch (e) {
      onError(e);
    } finally {
      setFlipping(false);
    }
  };
  const cashout = async () => {
    try {
      const r = await s.op('cashout');
      show({ bet: roundBet, payout: r.payout, multiplier: streakMultiplier(wins) });
    } catch (e) {
      onError(e);
    }
  };
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: 1 - lift.value / 900 }, { perspective: 800 }, { rotateX: `${rot.value}deg` }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({ opacity: 0.55 + lift.value / 400, transform: [{ scaleX: 1 + lift.value / 300 }] }));
  return (
    <GameShell
      game="coinflip"
      mode={s.mode}
      balance={s.balance}
      locked={active}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage}>
          <View style={{ alignItems: 'center' }}>
            <Animated.View style={coinStyle} accessible accessibilityLabel={face === 'heads' ? t('play.heads') : t('play.tails')}>
              {/* thickness: a darker coin just under the face */}
              <View style={[styles.edge, { backgroundColor: face === 'heads' ? '#8A5300' : '#5E646E' }]} />
              <CoinFace side={face} size={190} label={face === 'heads' ? t('play.heads') : t('play.tails')} />
            </Animated.View>
            <Animated.View style={[styles.floor, shadowStyle]} />
          </View>
          <View style={styles.calls}>
            {calls.slice(-10).map((h, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: h.call === h.result ? tint : c.loss }]} accessibilityLabel={h.call === h.result ? '✓' : '✗'}>
                <T variant="caption" style={{ fontSize: 10, color: '#111' }}>{h.result === 'heads' ? '☺' : '✚'}</T>
              </View>
            ))}
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          {active && <StatRow>
            <Stat label={t('play.streak')} value={`${wins}`} />
            <Stat label={t('play.multiplierNow')} value={wins ? formatMult(streakMultiplier(wins)) : '—'} tint={tint} />
            <Stat label={t('play.nextMultiplier')} value={formatMult(streakMultiplier(wins + 1))} />
          </StatRow>}
          {!active ? (
            <>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} tint={tint} /></View>
                <Button spot="coin:start" title={t('play.placeBet')} onPress={start} disabled={(bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <>
              <TutorialTarget id="coin:call">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title={t('play.heads')} kind="secondary" onPress={() => call('heads')} disabled={flipping} style={{ flex: 1 }} />
                <Button title={t('play.tails')} kind="secondary" onPress={() => call('tails')} disabled={flipping} style={{ flex: 1 }} />
              </View>
              </TutorialTarget>
              <Button
                title={t('common.cashout')}
                subtitle={wins ? `${formatCoins(payoutFor(roundBet, streakMultiplier(wins)))} ${t('common.coins')}` : undefined}
                onPress={cashout}
                disabled={wins === 0 || flipping}
                style={{ marginTop: 10 }}
              />
            </>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 2, top: 6, width: 186, height: 186, borderRadius: 93 },
  floor: { width: 130, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)', marginTop: 14 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  calls: { flexDirection: 'row', gap: 6, marginTop: 28, minHeight: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
