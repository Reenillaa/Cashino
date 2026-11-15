import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import type { GameId } from '@/engine/games/types.ts';
import { Button, Chip, Segmented, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { motion } from '@/design/tokens';
import { useT } from '@/i18n';
import { SIM_OPTIONS, simulate, type SimResult } from './montecarlo';
import { PathsChart } from './charts';
import { haptic } from '@/services/haptics';

const EASE = Easing.bezier(...motion.easeEnter);
const ROUNDS = ['100', '1000', '10000'] as const;

/** "What if I play a lot?": real engine rounds for several players, plotted against the theory. */
export function MonteCarlo({ game }: { game: GameId }) {
  const { t, lang } = useT();
  const { c } = useTheme();
  const options = SIM_OPTIONS[game] ?? [];
  const [opt, setOpt] = useState('0');
  const [rounds, setRounds] = useState<(typeof ROUNDS)[number]>('1000');
  const [res, setRes] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState(1);
  if (!options.length) return null;
  const o = options[Number(opt)] ?? options[0];
  const n = Number(rounds);
  const players = n >= 10000 ? 3 : 5;
  const run = () => {
    setBusy(true);
    haptic.light();
    // Let the "Simulating…" state paint before the (synchronous) engine loop.
    setTimeout(() => {
      setRes(simulate(o, n, players, 10, seed * 104729));
      setSeed((s) => s + 1);
      setBusy(false);
    }, 40);
  };
  const real = res ? (res.returned / Math.max(1, res.staked)) * 100 : 0;
  const pct = (v: number) => v.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 });
  return (
    <View style={{ gap: 14 }}>
      {options.length > 1 && (
        <View>
          <T variant="footnote" color="text3" style={{ marginBottom: 6 }}>{t('academy.strategy')}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map((x, i) => (
              <Chip key={i} label={x.label(lang)} selected={opt === String(i)} onPress={() => { setOpt(String(i)); setRes(null); }} />
            ))}
          </View>
        </View>
      )}
      <View>
        <T variant="footnote" color="text3" style={{ marginBottom: 6 }}>{t('academy.rounds')}</T>
        <Segmented value={rounds} onChange={(v) => { setRounds(v); setRes(null); }} options={ROUNDS.map((r) => ({ value: r, label: Number(r).toLocaleString('es-ES') }))} />
      </View>
      <Button title={busy ? t('academy.running') : `🎲 ${t('academy.simulate')}`} onPress={run} loading={busy} />
      {res && (
        <Animated.View key={`${seed}`} entering={FadeInDown.duration(motion.slow).easing(EASE)} style={{ gap: 14 }}>
          <View style={[styles.card, { backgroundColor: c.surface1 }]}>
            <T variant="footnote" color="text3" style={{ marginBottom: 6 }}>{t('academy.net')}</T>
            <PathsChart paths={res.paths} theory={-(1 - o.rtp) * 10 * res.rounds} zeroLabel={t('academy.zero')} theoryLabel={t('academy.theory')} />
            <T variant="footnote" color="text3" style={{ marginTop: 6 }}>{t('academy.players', { n: res.paths.length })}</T>
          </View>
          <View style={[styles.stats, { backgroundColor: c.surface1 }]}>
            <Stat label={t('academy.real')} value={`${pct(real)} %`} strong />
            <Stat label={t('academy.theoryRtp')} value={`${pct(o.rtp * 100)} %`} />
            <Stat label={t('academy.won')} value={`${pct((res.wins / res.rounds) * 100)} %`} />
            <Stat label={t('academy.ahead')} value={`${res.ahead}/${res.paths.length}`} />
          </View>
          <T variant="body" color="text2">
            {t('academy.mcConclusion', { rounds: formatCoins(res.rounds), real: pct(real), theory: pct(o.rtp * 100), ahead: res.ahead, players: res.paths.length })}
          </T>
        </Animated.View>
      )}
    </View>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ width: '50%', paddingVertical: 8 }}>
      <T variant="footnote" color="text3">{label}</T>
      <T variant="headline" weight={strong ? 'semibold' : 'medium'} tabular color={strong ? 'win' : 'text'} style={{ fontSize: 22, lineHeight: 28 }}>{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 14 },
  stats: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', flexWrap: 'wrap' },
});
