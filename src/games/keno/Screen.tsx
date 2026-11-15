import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Button, PressableScale, Segmented, T, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';
import { KENO_TABLES, KENO_NUMBERS, KENO_MAX_PICKS, kenoHitProbability, type KenoRisk } from '@/engine/games/keno.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { MoreOptions } from '../shared/MoreOptions';

const tint = META.keno.tint;

export default function KenoScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const s = useGameSession('keno');
  const [bet, setBet] = useBet('keno', s.room);
  const [picks, setPicks] = useState<number[]>([]);
  const [risk, setRisk] = useState<KenoRisk>('medium');
  const [drawn, setDrawn] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('keno', (d) => d);
  const cell = Math.min(46, (Math.min(width, 440) - 40 - 7 * 6) / 8);
  const table = picks.length ? KENO_TABLES[risk][picks.length] : [];

  const toggle = (n: number) => {
    if (busy) return;
    setDrawn([]);
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length >= KENO_MAX_PICKS ? p : [...p, n]));
    haptic.select();
    sfx('tap', 0.5);
    tutorialEvent('keno', 'keno:pick');
  };
  const auto = () => {
    const pool = Array.from({ length: KENO_NUMBERS }, (_, i) => i + 1);
    const out: number[] = [];
    const n = picks.length || 6;
    while (out.length < n) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    setDrawn([]);
    setPicks(out);
    tutorialEvent('keno', 'keno:pick');
  };
  const draw = async () => {
    try {
      setBusy(true);
      setDrawn([]);
      const r = await s.op('play', { bet, picks, risk });
      const v = r.view as { drawn: number[]; hits: number[] };
      for (let i = 0; i < v.drawn.length; i++) {
        setDrawn(v.drawn.slice(0, i + 1));
        sfx(picks.includes(v.drawn[i]) ? 'gem' : 'pop', 0.6);
        if (!reduceMotion) await wait(140);
      }
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? r.payout / bet : undefined, label: `${v.hits.length} / ${picks.length} ${t('play.hits').toLowerCase()}` });
      tutorialEvent('keno', 'keno:draw');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const hits = drawn.filter((d) => picks.includes(d)).length;
  return (
    <GameShell
      game="keno"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage}>
          <TutorialTarget id="keno:pick">
          <View style={[styles.grid, { width: cell * 8 + 42 }]}>
            {Array.from({ length: KENO_NUMBERS }, (_, i) => i + 1).map((n) => {
              const picked = picks.includes(n);
              const out = drawn.includes(n);
              const hit = picked && out;
              return (
                <PressableScale
                  key={n}
                  onPress={() => toggle(n)}
                  feedback="none"
                  scaleTo={0.9}
                  accessibilityLabel={`${n}${picked ? ' ✓' : ''}${out ? ' ●' : ''}`}
                  accessibilityState={{ selected: picked }}
                  style={[
                    styles.cell,
                    {
                      width: cell,
                      height: cell,
                      backgroundColor: hit ? tint : picked ? alpha(tint, 0.22) : out ? c.surface3 : c.surface2,
                      borderColor: picked ? tint : c.hairline,
                    },
                  ]}
                >
                  {out && !hit ? <Animated.View entering={reduceMotion ? undefined : ZoomIn} style={[styles.dot, { backgroundColor: c.text3 }]} /> : null}
                  <T variant="footnote" weight="semibold" tabular style={{ color: hit ? '#081014' : c.text }}>{n}</T>
                </PressableScale>
              );
            })}
          </View>
          </TutorialTarget>
          {picks.length > 0 && (
            <View style={styles.pay}>
              {table.map((m, h) => (
                <View key={h} style={[styles.payCell, { backgroundColor: drawn.length === 10 && h === hits ? alpha(tint, 0.3) : c.surface2 }]} accessibilityLabel={`${h}: ${formatMult(m)} · ${(kenoHitProbability(picks.length, h) * 100).toFixed(2)} %`}>
                  <T variant="caption" color="text3" style={{ fontSize: 9 }}>{h}</T>
                  <T style={{ fontFamily: 'Geist_600SemiBold', fontSize: 10, color: m > 0 ? c.text : c.text3 }} numberOfLines={1} adjustsFontSizeToFit>{m > 0 ? `${m}×` : '—'}</T>
                </View>
              ))}
            </View>
          )}
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <MoreOptions game="keno" disabled={busy} summary={`${t('play.risk')} ${(risk === 'low' ? t('play.low') : risk === 'medium' ? t('play.medium') : t('play.high')).toLowerCase()} · ${picks.length}/${KENO_MAX_PICKS}`}>
            <Segmented size="sm" value={risk} onChange={setRisk} disabled={busy} options={[{ value: 'low', label: t('play.low') }, { value: 'medium', label: t('play.medium') }, { value: 'high', label: t('play.high') }]} style={{ marginBottom: 10 }} />
          </MoreOptions>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <Button title={t('play.autoPick')} kind="secondary" size="sm" onPress={auto} disabled={busy} style={{ flex: 1 }} />
            <Button title={t('common.clear')} kind="secondary" size="sm" onPress={() => { setPicks([]); setDrawn([]); }} disabled={busy} style={{ flex: 1 }} />
            <View style={{ justifyContent: 'center', paddingHorizontal: 6 }}>
              <T variant="footnote" color="text3" tabular>{picks.length}/{KENO_MAX_PICKS}</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} tint={tint} /></View>
            <Button spot="keno:draw" title={t('play.draw')} onPress={draw} loading={busy} disabled={picks.length === 0 || (bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dot: { position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: 3 },
  pay: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, flexWrap: 'wrap', justifyContent: 'center' },
  payCell: { minWidth: 34, paddingHorizontal: 4, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
});
