import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AnimatedNumber, Button, Chip, T, formatCoins, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { limboWinChance, LIMBO_MAX_TARGET, LIMBO_MIN_TARGET } from '@/engine/games/limbo.ts';
import { payoutFor } from '@/engine/games/types.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell, ControlRow } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Stat, StatRow } from '../shared/Stat';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { MoreOptions } from '../shared/MoreOptions';

const tint = META.limbo.tint;

export default function LimboScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('limbo');
  const [bet, setBet] = useBet('limbo', s.room);
  const [target, setTarget] = useState(2);
  const [text, setText] = useState('2.00');
  const [shown, setShown] = useState(1);
  const [won, setWon] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('limbo', (d) => d);
  const chance = limboWinChance(target);
  const applyTarget = (v: number) => {
    const x = Math.min(LIMBO_MAX_TARGET, Math.max(LIMBO_MIN_TARGET, Math.floor(v * 100) / 100));
    setTarget(x);
    setText(x.toFixed(2));
    tutorialEvent('limbo', 'limbo:adjust');
  };
  const play = async () => {
    try {
      setBusy(true);
      setWon(null);
      setShown(1);
      const r = await s.op('play', { bet, target });
      const v = r.view as { result: number; won: boolean };
      sfx('tick');
      setShown(v.result);
      await wait(reduceMotion ? 0 : 650);
      setWon(v.won);
      show({ bet, payout: r.payout, multiplier: v.won ? target : undefined, label: `${v.result.toFixed(2)}×` });
      tutorialEvent('limbo', 'limbo:play');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <GameShell
      game="limbo"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage}>
          <AnimatedNumber
            value={shown}
            duration={reduceMotion ? 0 : 600}
            format={(n) => `${n >= 1000 ? Math.floor(n).toLocaleString('es-ES') : n.toFixed(2)}×`}
            variant="hero"
            style={{ fontSize: 84, lineHeight: 92, color: won === null ? c.text : won ? c.win : c.loss }}
          />
          <T variant="footnote" color="text3">{t('play.target')} {formatMult(target)}</T>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <MoreOptions game="limbo" disabled={busy} summary={`${t('play.target')} ${formatMult(target)} · ${(chance * 100).toFixed(chance < 0.01 ? 2 : 1)} %`}>
          <TutorialTarget id="limbo:adjust">
          <ControlRow>
            {[1.5, 2, 3, 5, 10, 100].map((x) => <Chip key={x} label={`${x}×`} selected={target === x} tint={tint} onPress={() => applyTarget(x)} />)}
          </ControlRow>
          </TutorialTarget>
          <View style={[styles.targetField, { backgroundColor: c.surface2 }]}>
            <T variant="caption" color="text3" style={{ fontSize: 10 }}>{t('play.target')}</T>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.replace(',', '.').replace(/[^0-9.]/g, ''))}
              onBlur={() => applyTarget(Number(text) || 2)}
              keyboardType="decimal-pad"
              accessibilityLabel={t('play.target')}
              style={{ color: c.text, fontFamily: 'GeistMono_500Medium', fontSize: 18, padding: 0 }}
            />
          </View>
          <StatRow>
            <Stat label={t('play.winChance')} value={`${(chance * 100).toFixed(chance < 0.01 ? 4 : 2)} %`} />
            <Stat label={t('play.potential')} value={formatCoins(payoutFor(bet, target) - bet)} tint={tint} />
          </StatRow>
          </MoreOptions>
          <BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} tint={tint} />
          <Button spot="limbo:play" title={t('play.placeBet')} onPress={play} loading={busy} disabled={(bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ marginTop: 10 }} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  targetField: { height: 52, borderRadius: 16, paddingHorizontal: 14, justifyContent: 'center', marginBottom: 10 },
});
