import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, PlayingCard, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';
import { parseCard } from '@/engine/cards/cards.ts';
import { BACCARAT_PAYS, type BaccaratBetKind } from '@/engine/games/baccarat.ts';
import { useGameSession, PlayError } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { ChipRack, ChipToken } from '../shared/ChipRack';
import { useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const tint = META.baccarat.tint;
interface BView { player: string[]; banker: string[]; playerTotal: number; bankerTotal: number; winner: 'player' | 'banker' | 'tie'; order: ('player' | 'banker')[] }

export default function BaccaratScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('baccarat');
  const [chip, setChip] = useState(10);
  const [bets, setBets] = useState<Partial<Record<BaccaratBetKind, number>>>({});
  const [coup, setCoup] = useState<BView | null>(null);
  const [shown, setShown] = useState({ p: 0, b: 0 });
  const [busy, setBusy] = useState(false);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('baccarat', (d) => d);
  const total = Object.values(bets).reduce((a, b) => a + (b ?? 0), 0);
  const place = (k: BaccaratBetKind) => {
    if (busy) return;
    if (total + chip > s.balance) return onError(new PlayError('insufficient'));
    setCoup(null);
    setBets((b) => ({ ...b, [k]: (b[k] ?? 0) + chip }));
    sfx('chip');
    haptic.select();
    tutorialEvent('baccarat', 'bac:place');
  };
  const deal = async () => {
    try {
      setBusy(true);
      setShown({ p: 0, b: 0 });
      const r = await s.op('play', { bets });
      const v = r.view as unknown as BView;
      setCoup(v);
      let p = 0, b = 0;
      for (const side of v.order) {
        if (side === 'player') p++;
        else b++;
        setShown({ p, b });
        sfx('card');
        if (!reduceMotion) await wait(420);
      }
      const placed = total;
      setBets({});
      const label = v.winner === 'tie' ? t('play.tie') : `${v.winner === 'player' ? t('play.player') : t('play.banker')} ${Math.max(v.playerTotal, v.bankerTotal)}–${Math.min(v.playerTotal, v.bankerTotal)}`;
      show({ bet: placed, payout: r.payout, label });
      tutorialEvent('baccarat', 'bac:deal');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const Hand = ({ side }: { side: 'player' | 'banker' }) => {
    const cards = coup ? (side === 'player' ? coup.player : coup.banker) : [];
    const n = side === 'player' ? shown.p : shown.b;
    const totalV = coup && n === cards.length ? (side === 'player' ? coup.playerTotal : coup.bankerTotal) : null;
    const winner = coup && totalV !== null && shown.p === coup.player.length && shown.b === coup.banker.length && coup.winner === side;
    return (
      <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
        <T variant="caption" color={winner ? 'win' : 'text3'}>{side === 'player' ? t('play.player') : t('play.banker')}</T>
        <View style={{ flexDirection: 'row', minHeight: 84 }}>
          {cards.slice(0, n).map((code, i) => (
            <View key={i} style={{ marginLeft: i ? 4 : 0, marginTop: i === 2 ? 10 : 0 }}>
              <PlayingCard card={parseCard(code)} size="sm" />
            </View>
          ))}
        </View>
        <View style={[styles.total, { backgroundColor: winner ? alpha(c.win, 0.2) : c.surface2 }]}>
          <T variant="headline" tabular color={winner ? 'win' : 'text'}>{totalV ?? '–'}</T>
        </View>
      </View>
    );
  };
  const Spot = ({ k, label, pays, flex = 1 }: { k: BaccaratBetKind; label: string; pays: string; flex?: number }) => (
    <PressableScale onPress={() => place(k)} feedback="none" scaleTo={0.96} accessibilityLabel={`${label} ${pays}${bets[k] ? `, ${bets[k]}` : ''}`} style={[styles.spot, { flex, backgroundColor: c.surface2, borderColor: coup && coup.winner === k && !busy ? tint : c.hairline }]}>
      <T variant="callout" weight="semibold">{label}</T>
      <T variant="caption" color="text3" style={{ fontSize: 10 }}>{pays}</T>
      {bets[k] ? <View style={styles.placed}><ChipToken value={[1000, 500, 100, 25, 10, 5, 1].find((x) => x <= (bets[k] ?? 0)) ?? 1} size={22} /></View> : null}
    </PressableScale>
  );
  return (
    <GameShell
      game="baccarat"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Hand side="player" />
            <Hand side="banker" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 22 }}>
            <Spot k="playerPair" label={t('play.playerPair')} pays="11:1" />
            <Spot k="tie" label={t('play.tie')} pays={`${BACCARAT_PAYS.tie}:1`} />
            <Spot k="bankerPair" label={t('play.bankerPair')} pays="11:1" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Spot k="player" label={t('play.player')} pays="1:1" />
            <Spot k="banker" label={t('play.banker')} pays="0.95:1" />
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <ChipRack value={chip} onChange={setChip} balance={s.balance} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
            <T variant="footnote" color="text3" style={{ flex: 1 }}>{t('play.totalBet')}: <T variant="footnote" weight="semibold" tabular>{formatCoins(total)}</T></T>
            <Button title={t('common.clear')} kind="ghost" size="sm" onPress={() => setBets({})} disabled={!total || busy} />
          </View>
          <Button title={t('play.deal')} onPress={deal} loading={busy} disabled={!total || total > s.balance} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  total: { minWidth: 48, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  spot: { height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  placed: { position: 'absolute', right: 6, top: 6 },
});
