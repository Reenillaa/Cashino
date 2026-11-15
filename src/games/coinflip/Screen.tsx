import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg';
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

function CoinFace({ side, size }: { side: Side; size: number }) {
  const heads = side === 'heads';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`cf${side}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={heads ? '#F2E2B8' : '#E3E6EA'} />
          <Stop offset="0.5" stopColor={heads ? '#D9BC7A' : '#AEB4BC'} />
          <Stop offset="1" stopColor={heads ? '#B8954E' : '#7E858F'} />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill={`url(#cf${side})`} />
      <Circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
      {heads ? (
        <G fill="none" stroke="rgba(20,20,24,0.7)" strokeWidth="4.5" strokeLinecap="round">
          <Circle cx="39" cy="43" r="2.2" fill="rgba(20,20,24,0.7)" />
          <Circle cx="61" cy="43" r="2.2" fill="rgba(20,20,24,0.7)" />
          <Path d="M36 57c4 7 9 10 14 10s10-3 14-10" />
        </G>
      ) : (
        <Path d="M50 30v40M30 50h40" stroke="rgba(20,20,24,0.7)" strokeWidth="9" strokeLinecap="round" />
      )}
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
        rot.set(withTiming(4 * 360, { duration: 900, easing: Easing.out(Easing.cubic) }));
        setTimeout(() => setFace(last), 450);
        lift.set(withSequence(withTiming(-60, { duration: 420, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 480, easing: Easing.in(Easing.quad) })));
        await wait(920);
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
    transform: [{ translateY: lift.value }, { perspective: 800 }, { rotateX: `${rot.value}deg` }],
  }));
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
          <Animated.View style={coinStyle} accessible accessibilityLabel={face === 'heads' ? t('play.heads') : t('play.tails')}>
            <CoinFace side={face} size={170} />
          </Animated.View>
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
              <BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} tint={tint} />
              <Button spot="coin:start" title={t('play.placeBet')} onPress={start} disabled={(bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ marginTop: 10 }} />
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
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  calls: { flexDirection: 'row', gap: 6, marginTop: 28, minHeight: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
