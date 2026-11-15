import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AnimatedNumber, Button, Segmented, Slider, T, formatCoins, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';
import { diceMultiplier, diceWinChance, type DiceMode } from '@/engine/games/dice.ts';
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
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { MoreOptions } from '../shared/MoreOptions';
import { TumbleDie } from '../shared/Die';
import { LinearGradient } from 'expo-linear-gradient';

const tint = META.dice.tint;

export default function DiceScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('dice');
  const [bet, setBet] = useBet('dice', s.room);
  const [mode, setMode] = useState<DiceMode>('under');
  const [target, setTarget] = useState(50);
  const [roll, setRoll] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [rolling, setRolling] = useState(false);
  const [tumble, setTumble] = useState(false);
  const [faces, setFaces] = useState<[number, number]>([5, 3]);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('dice', (d) => d);
  const marker = useSharedValue(50);
  const [trackW, setTrackW] = useState(0);
  const chance = diceWinChance(mode, target);
  const mult = diceMultiplier(mode, target);
  const valid = chance >= 0.01 && chance <= 0.98;

  const play = async () => {
    try {
      setRolling(true);
      setTumble(true);
      setWon(null);
      sfx('dice');
      const r = await s.op('play', { bet, mode, target });
      const v = r.view as { roll: number; won: boolean };
      // The dice tumble for a moment (the result is already decided), then land and reveal the number.
      await wait(reduceMotion ? 0 : 720);
      setFaces([Math.min(6, Math.floor(v.roll / 16.67) + 1), (Math.floor(v.roll * 100) % 6) + 1]);
      setTumble(false);
      marker.set(reduceMotion ? v.roll : withTiming(v.roll, { duration: 520, easing: Easing.out(Easing.cubic) }));
      setRoll(v.roll);
      await wait(reduceMotion ? 0 : 560);
      setWon(v.won);
      show({ bet, payout: r.payout, multiplier: v.won ? mult : undefined, label: v.roll.toFixed(2) });
      tutorialEvent('dice', 'dice:roll');
    } catch (e) {
      onError(e);
    } finally {
      setTumble(false);
      setRolling(false);
    }
  };

  const markerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (marker.value / 100) * trackW - 22 }] }));
  const winLeft = mode === 'under';
  return (
    <GameShell
      game="dice"
      mode={s.mode}
      balance={s.balance}
      locked={rolling}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage}>
          <View style={{ flexDirection: 'row', gap: 22, marginBottom: 6 }}>
            <TumbleDie face={faces[0]} rolling={tumble} glow={tint} />
            <TumbleDie face={faces[1]} rolling={tumble} glow={tint} delay={70} />
          </View>
          <AnimatedNumber value={roll ?? 50} format={(n) => n.toFixed(2)} duration={reduceMotion ? 0 : 520} variant="hero" style={{ fontSize: 58, lineHeight: 66, color: won === null ? c.text : won ? c.win : '#FF7A7A', textShadowColor: won ? 'rgba(59,227,154,0.6)' : 'transparent', textShadowRadius: 20 }} />
          <T variant="footnote" color="text3">{winLeft ? `${t('play.rollUnder')} ${target.toFixed(2)}` : `${t('play.rollOver')} ${target.toFixed(2)}`}</T>
          <View style={{ width: '100%', marginTop: 36 }} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
            <View style={[styles.track, { backgroundColor: 'rgba(255,90,110,0.35)' }]}>
              <LinearGradient colors={['#3BE39A', '#12C08A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, bottom: 0, left: winLeft ? 0 : `${target}%`, right: winLeft ? `${100 - target}%` : 0, borderRadius: 7 }} />
            </View>
            {roll !== null && (
              <Animated.View style={[styles.marker, { backgroundColor: c.text, borderColor: c.bg }, markerStyle]}>
                <T variant="footnote" weight="semibold" style={{ color: c.bg }} tabular>{roll.toFixed(0)}</T>
              </Animated.View>
            )}
            <View style={styles.scale}>
              {[0, 25, 50, 75, 100].map((n) => <T key={n} variant="footnote" color="text3" tabular>{n}</T>)}
            </View>
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <MoreOptions game="dice" disabled={rolling} summary={`${mode === 'under' ? t('play.rollUnder') : t('play.rollOver')} ${target.toFixed(2)} · ${formatMult(mult)} · ${(chance * 100).toFixed(0)} %`}>
          <Segmented
            size="sm"
            value={mode}
            onChange={(m) => {
              setMode(m);
              tutorialEvent('dice', 'dice:adjust');
            }}
            options={[{ value: 'under', label: t('play.rollUnder') }, { value: 'over', label: t('play.rollOver') }]}
            style={{ marginBottom: 6 }}
          />
          <TutorialTarget id="dice:adjust">
          <Slider
            value={target}
            min={2}
            max={98}
            step={0.5}
            tint={tint}
            accessibilityLabel={t('play.target')}
            trackColors={winLeft ? [alpha(tint, 0.9), c.surface3] : [c.surface3, alpha(tint, 0.9)]}
            onChange={setTarget}
            onEnd={() => tutorialEvent('dice', 'dice:adjust')}
          />
          </TutorialTarget>
          <StatRow>
            <Stat label={t('common.multiplier')} value={formatMult(mult)} tint={tint} />
            <Stat label={t('play.winChance')} value={`${(chance * 100).toFixed(2)} %`} />
            <Stat label={t('play.potential')} value={formatCoins(payoutFor(bet, mult) - bet)} />
          </StatRow>
          </MoreOptions>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={rolling} tint={tint} /></View>
            <Button spot="dice:roll" title={t('play.roll')} onPress={play} loading={rolling} disabled={!valid || (bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  track: { height: 14, borderRadius: 7, overflow: 'hidden' },
  marker: { position: 'absolute', top: -34, width: 44, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});
