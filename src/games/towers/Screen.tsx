import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, PressableScale, T, formatCoins, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { TOWER_FLOORS, TOWER_SHAPE, towerMultiplier, type TowerLevel } from '@/engine/games/towers.ts';
import { payoutFor } from '@/engine/games/types.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { GameShell, ControlRow } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Stat, StatRow } from '../shared/Stat';
import { MoreOptions } from '../shared/MoreOptions';
import { useBet, useGameHistory, usePlayErrors, useResult } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

interface TView { level: TowerLevel; picks: number[]; status: 'active' | 'lost' | 'cashed'; bet: number; multiplier: number; bad: number[][] | null }
const LEVELS: TowerLevel[] = ['easy', 'medium', 'hard', 'expert'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function TowersScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('towers');
  const [bet, setBet] = useBet('towers', s.room);
  const [level, setLevel] = useState<TowerLevel>('medium');
  const [view, setView] = useState<TView | null>((s.active?.view as unknown as TView) ?? null);
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState({ w: 340, h: 420 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('towers', (d) => d);
  const active = view?.status === 'active';
  const lvl = view?.level ?? level;
  const tiles = TOWER_SHAPE[lvl].tiles;
  const floor = view?.picks.length ?? 0;
  const rowH = Math.max(30, Math.min(46, (box.h - 70) / TOWER_FLOORS - 6));
  const doorW = Math.min(76, (box.w - 90 - (tiles - 1) * 8) / tiles);

  const start = async () => {
    try {
      const r = await s.op('start', { bet, level });
      setView(r.view as unknown as TView);
      sfx('chip');
      tutorialEvent('towers', 'towers:start');
    } catch (e) {
      onError(e);
    }
  };
  const pick = async (door: number) => {
    if (!active || busy) return;
    try {
      setBusy(true);
      const r = await s.op('pick', { door });
      const v = r.view as unknown as TView;
      setView(v);
      tutorialEvent('towers', 'towers:pick');
      if (v.status === 'lost') {
        sfx('mine');
        haptic.heavy();
        show({ bet: v.bet, payout: 0, label: t('play.floor', { n: v.picks.length }) }, { silent: true });
      } else {
        sfx('gem', 0.8);
        haptic.light();
        if (r.done) show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const cashout = async () => {
    try {
      const r = await s.op('cashout');
      const v = r.view as unknown as TView;
      setView(v);
      sfx('cashout');
      show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
    } catch (e) {
      onError(e);
    }
  };
  const random = () => void pick(Math.floor(Math.random() * tiles));

  return (
    <GameShell
      game="towers"
      mode={s.mode}
      balance={s.balance}
      locked={active}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Dragon awake={view?.status === 'lost'} />
          <TutorialTarget id="towers:pick">
            <View style={styles.tower}>
              <LinearGradient colors={['#2A1A66', '#120A33']} style={StyleSheet.absoluteFill} />
              {Array.from({ length: TOWER_FLOORS }, (_, i) => TOWER_FLOORS - 1 - i).map((f) => {
                const current = active && f === floor;
                const done = f < floor;
                const reveal = view?.bad && view.status !== 'active';
                return (
                  <View key={f} style={[styles.row, { height: rowH, opacity: !view || current || done || reveal ? 1 : 0.5 }]}>
                    <T weight="displaySemi" tabular style={{ width: 52, fontSize: 11, color: current ? '#FFD06B' : done ? '#5BE3B0' : 'rgba(255,255,255,0.55)', textAlign: 'right' }}>
                      {formatMult(towerMultiplier(lvl, f + 1))}
                    </T>
                    {Array.from({ length: tiles }, (_, d) => {
                      const picked = view?.picks[f] === d;
                      const egg = !!view?.bad?.[f]?.includes(d) && (reveal || picked);
                      const safeShown = (done || (picked && view?.status !== 'lost')) && picked;
                      return (
                        <PressableScale key={d} onPress={() => pick(d)} disabled={!current || busy} feedback="none" scaleTo={0.92}
                          accessibilityLabel={`${t('play.floor', { n: f + 1 })} · ${d + 1}`}
                          style={[styles.door, { width: doorW, height: rowH, borderColor: current ? '#FFD06B' : 'rgba(255,255,255,0.12)', backgroundColor: picked && egg ? 'rgba(255,92,122,0.35)' : safeShown ? 'rgba(91,227,176,0.25)' : current ? 'rgba(255,208,107,0.16)' : 'rgba(255,255,255,0.06)' }]}>
                          {egg ? (
                            <Animated.View entering={reduceMotion ? undefined : ZoomIn.springify().damping(11)}><Text style={{ fontSize: rowH * 0.55 }}>🥚</Text></Animated.View>
                          ) : safeShown ? (
                            <Animated.View entering={reduceMotion ? undefined : ZoomIn.springify().damping(11)}><Text style={{ fontSize: rowH * 0.55 }}>💎</Text></Animated.View>
                          ) : current ? <View style={styles.knob} /> : null}
                        </PressableScale>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </TutorialTarget>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          {active ? (
            <>
              <StatRow>
                <Stat label={t('play.multiplierNow')} value={formatMult(floor ? view!.multiplier : 1)} tint={c.win} />
                <Stat label={t('play.nextMultiplier')} value={formatMult(towerMultiplier(lvl, floor + 1))} />
                <Stat label={t('play.safeChance')} value={`${Math.round(((tiles - TOWER_SHAPE[lvl].bad) / tiles) * 100)} %`} />
              </StatRow>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title={t('play.random')} kind="secondary" onPress={random} style={{ flex: 1 }} />
                <Button title={t('common.cashout')} subtitle={floor ? `${formatCoins(payoutFor(view!.bet, view!.multiplier))} ${t('common.coins')}` : undefined} onPress={cashout} disabled={floor === 0} style={{ flex: 1.6 }} />
              </View>
            </>
          ) : (
            <>
              <MoreOptions game="towers" summary={`${t('play.level')}: ${t(`play.level${cap(level)}`)}`}>
                <ControlRow>
                  {LEVELS.map((k) => <Chip key={k} label={t(`play.level${cap(k)}`)} selected={level === k} onPress={() => setLevel(k)} />)}
                </ControlRow>
              </MoreOptions>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} /></View>
                <Button spot="towers:start" title={t('play.placeBet')} onPress={start} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
              </View>
            </>
          )}
        </View>
      }
    />
  );
}

/** The dragon on top of the tower: breathes slowly, and roars when you hit an egg. */
function Dragon({ awake }: { awake: boolean }) {
  const b = useSharedValue(0);
  React.useEffect(() => {
    b.set(awake ? withSequence(withTiming(1, { duration: 120 }), withTiming(-1, { duration: 120 }), withTiming(1, { duration: 120 }), withTiming(0, { duration: 160 })) : withRepeat(withSequence(withTiming(0.4, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1));
  }, [awake, b]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + Math.abs(b.value) * 0.12 }, { rotate: `${awake ? b.value * 8 : 0}deg` }] }));
  return (
    <Animated.View style={[{ marginBottom: 2 }, style]}>
      <Text style={{ fontSize: 40 }} accessible={false}>{awake ? '🔥🐉🔥' : '🐉'}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  tower: { borderRadius: 22, padding: 10, gap: 6, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,208,107,0.5)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  door: { borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  knob: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD06B' },
});
