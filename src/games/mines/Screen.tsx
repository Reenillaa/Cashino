import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { Button, Chip, PressableScale, formatCoins, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';
import { minesMultiplier, nextSafeChance, MINES_TILES } from '@/engine/games/mines.ts';
import { payoutFor } from '@/engine/games/types.ts';
import { randomInt } from '@/engine/rng/rng.ts';
import { secureRng } from '@/services/random';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell, ControlRow } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Stat, StatRow } from '../shared/Stat';
import { useBet, useGameHistory, usePlayErrors, useResult } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { MoreOptions } from '../shared/MoreOptions';

const tint = META.mines.tint;

function Gem({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3 20 9.5 12 21 4 9.5z" fill={tint} />
      <Path d="M4 9.5h16L12 3z" fill="#B8F0CC" opacity={0.9} />
      <Path d="M12 3 9 9.5 12 21z" fill="#ffffff" opacity={0.25} />
    </Svg>
  );
}
function Mine({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="13" r="6.5" fill={color} />
      <Path d="M12 3.5v3M4.5 13h-2M21.5 13h-2M6.2 7.2 4.8 5.8M17.8 7.2l1.4-1.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="9.8" cy="10.8" r="1.6" fill="#fff" opacity={0.5} />
    </Svg>
  );
}

interface View_ { revealed: number[]; minePositions: number[] | null; status: string; multiplier: number; mines: number; bet: number; hitMine?: number }

export default function MinesScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const s = useGameSession('mines');
  const [bet, setBet] = useBet('mines', s.room);
  const [mines, setMines] = useState(3);
  const [view, setView] = useState<View_ | null>((s.active?.view as unknown as View_) ?? null);
  const [busyTile, setBusyTile] = useState<number | null>(null);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('mines');
  const shake = useSharedValue(0);
  const active = view?.status === 'active';
  const k = view?.revealed.length ?? 0;
  const m = active ? view!.mines : mines;
  const [stageH, setStageH] = useState(0);
  const size = Math.max(36, Math.min(68, (Math.min(width, 440) - 40 - 4 * 8) / 5, stageH ? (stageH - 16 - 4 * 8) / 5 : 68));

  const start = async () => {
    try {
      const r = await s.op('start', { bet, mines });
      setView(r.view as unknown as View_);
      sfx('chip');
      tutorialEvent('mines', 'mines:start');
    } catch (e) {
      onError(e);
    }
  };
  const reveal = async (tile: number) => {
    if (!active || busyTile !== null || view!.revealed.includes(tile)) return;
    try {
      setBusyTile(tile);
      const r = await s.op('reveal', { tile });
      const v = r.view as unknown as View_;
      setView(v);
      tutorialEvent('mines', 'mines:reveal');
      if (v.status === 'lost') {
        sfx('mine');
        haptic.heavy();
        if (!reduceMotion) shake.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-5, { duration: 50 }), withTiming(0, { duration: 50 })));
        show({ bet: v.bet, payout: 0 }, { silent: true });
        tutorialEvent('mines', 'mines:end');
      } else {
        sfx('gem', 0.8);
        haptic.light();
        if (r.done) {
          show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
          tutorialEvent('mines', 'mines:end');
        }
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusyTile(null);
    }
  };
  const cashout = async () => {
    try {
      const r = await s.op('cashout');
      const v = r.view as unknown as View_;
      setView(v);
      sfx('cashout');
      show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
      tutorialEvent('mines', 'mines:end');
    } catch (e) {
      onError(e);
    }
  };
  const gridStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const pickRandom = () => {
    if (!active) return;
    const free = Array.from({ length: MINES_TILES }, (_, i) => i).filter((i) => !view!.revealed.includes(i));
    void reveal(free[randomInt(secureRng, free.length)]);
  };
  return (
    <GameShell
      game="mines"
      mode={s.mode}
      balance={s.balance}
      locked={active}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setStageH(e.nativeEvent.layout.height)}>
          <TutorialTarget id="mines:reveal">
          <Animated.View style={[styles.grid, { width: size * 5 + 32 }, gridStyle]} accessibilityLabel={t('play.pick')}>
            {Array.from({ length: MINES_TILES }, (_, i) => {
              const revealed = view?.revealed.includes(i);
              const ended = view && view.status !== 'active';
              const isMine = !!view?.minePositions?.includes(i);
              const show = revealed || (ended && view!.minePositions);
              return (
                <PressableScale
                  key={i}
                  onPress={() => reveal(i)}
                  disabled={!active || revealed}
                  feedback="none"
                  scaleTo={0.92}
                  accessibilityLabel={`${i + 1}: ${show ? (isMine ? t('play.mines') : t('play.gems')) : '?'}`}
                  style={[
                    styles.tile,
                    {
                      width: size,
                      height: size,
                      backgroundColor: show ? (isMine ? alpha(c.loss, view!.hitMine === i ? 0.35 : 0.12) : alpha(tint, revealed ? 0.22 : 0.08)) : c.surface2,
                      borderColor: show ? 'transparent' : c.hairlineStrong,
                      opacity: ended && !revealed && view!.hitMine !== i ? 0.55 : 1,
                    },
                  ]}
                >
                  {show ? (
                    <Animated.View entering={reduceMotion ? undefined : ZoomIn.springify().damping(12)}>
                      {isMine ? <Mine size={size * 0.55} color={c.loss} /> : <Gem size={size * 0.55} />}
                    </Animated.View>
                  ) : busyTile === i ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.text3 }} />
                  ) : null}
                </PressableScale>
              );
            })}
          </Animated.View>
          </TutorialTarget>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          {active ? (
            <StatRow>
              <Stat label={t('play.multiplierNow')} value={formatMult(k ? view!.multiplier : 1)} tint={tint} />
              <Stat label={t('play.nextMultiplier')} value={formatMult(minesMultiplier(m, k + 1))} />
              <Stat label={t('play.safeChance')} value={`${(nextSafeChance(m, k) * 100).toFixed(1)} %`} />
            </StatRow>
          ) : (
            <>
              <MoreOptions game="mines" summary={`${mines} ${t('play.mines').toLowerCase()} · ${25 - mines} ${t('play.gems').toLowerCase()}`}>
                <ControlRow>
                  {[1, 3, 5, 10, 15, 20, 24].map((n) => <Chip key={n} label={`${n}`} selected={mines === n} tint={tint} onPress={() => setMines(n)} />)}
                </ControlRow>
              </MoreOptions>
            </>
          )}
          {active ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title={t('play.random')} kind="secondary" onPress={pickRandom} style={{ flex: 1 }} />
              <Button spot="mines:end"
                title={t('common.cashout')}
                subtitle={k ? `${formatCoins(payoutFor(view!.bet, view!.multiplier))} ${t('common.coins')}` : undefined}
                onPress={cashout}
                disabled={k === 0}
                style={{ flex: 1.6 }}
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} tint={tint} /></View>
              <Button spot="mines:start" title={t('play.placeBet')} onPress={start} disabled={(bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ flex: 1 }} />
            </View>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
