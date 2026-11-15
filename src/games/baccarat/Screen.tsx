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
import { ChipRack, ChipToken, chipFor } from '../shared/ChipRack';
import { useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const tint = META.baccarat.tint;
interface BView { player: string[]; banker: string[]; playerTotal: number; bankerTotal: number; winner: 'player' | 'banker' | 'tie'; order: ('player' | 'banker')[] }

export default function BaccaratScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('baccarat');
  const [chipPick, setChip] = useState<number | null>(null);
  const chip = chipPick !== null && s.room.chips.includes(chipPick) ? chipPick : s.room.chips[1];
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
    if (total + chip > s.room.max) return onError(new PlayError(`room_max:${s.room.max}`));
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
  const hand = (side: 'player' | 'banker') => {
    const cards = coup ? (side === 'player' ? coup.player : coup.banker) : [];
    const n = side === 'player' ? shown.p : shown.b;
    const total = coup && n === cards.length ? (side === 'player' ? coup.playerTotal : coup.bankerTotal) : null;
    const winner = !!coup && total !== null && shown.p === coup.player.length && shown.b === coup.banker.length && coup.winner === side;
    return <BacHand key={side} label={side === 'player' ? t('play.player') : t('play.banker')} cards={cards.slice(0, n)} total={total} winner={winner} />;
  };
  const spot = (k: BaccaratBetKind, label: string, pays: string) => (
    <BacSpot key={k} label={label} pays={pays} amount={bets[k]} highlight={!!coup && coup.winner === k && !busy} onPress={() => place(k)} />
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
            {hand('player')}
            {hand('banker')}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 22 }}>
            {spot('playerPair', t('play.playerPair'), '11:1')}
            {spot('tie', t('play.tie'), `${BACCARAT_PAYS.tie}:1`)}
            {spot('bankerPair', t('play.bankerPair'), '11:1')}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {spot('player', t('play.player'), '1:1')}
            {spot('banker', t('play.banker'), '0.95:1')}
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <ChipRack value={chip} onChange={setChip} balance={s.balance} values={s.room.chips} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
            <T variant="footnote" color="text3" style={{ flex: 1 }}>{t('play.totalBet')}: <T variant="footnote" weight="semibold" tabular color={total && total < s.room.min ? 'warn' : 'text'}>{formatCoins(total)}</T> / {formatCoins(s.room.min)}–{formatCoins(s.room.max)}</T>
            <Button title={t('common.clear')} kind="ghost" size="sm" onPress={() => setBets({})} disabled={!total || busy} />
          </View>
          <Button title={t('play.deal')} onPress={deal} loading={busy} disabled={!total || total > s.balance || total < s.room.min} />
        </View>
      }
    />
  );
}

function BacHand({ label, cards, total, winner }: { label: string; cards: string[]; total: number | null; winner: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
      <T variant="caption" color={winner ? 'win' : 'text3'}>{label}</T>
      <View style={{ flexDirection: 'row', minHeight: 84 }}>
        {cards.map((code, i) => (
          <View key={i} style={{ marginLeft: i ? 4 : 0, marginTop: i === 2 ? 10 : 0 }}>
            <PlayingCard card={parseCard(code)} size="sm" />
          </View>
        ))}
      </View>
      <View style={[styles.total, { backgroundColor: winner ? alpha(c.win, 0.2) : c.surface2 }]}>
        <T variant="headline" tabular color={winner ? 'win' : 'text'}>{total ?? '–'}</T>
      </View>
    </View>
  );
}

function BacSpot({ label, pays, amount, highlight, onPress }: { label: string; pays: string; amount?: number; highlight: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.96} accessibilityLabel={`${label} ${pays}${amount ? `, ${amount}` : ''}`} style={[styles.spot, { flex: 1, backgroundColor: c.surface2, borderColor: highlight ? tint : c.hairline }]}>
      <T variant="callout" weight="semibold">{label}</T>
      <T variant="caption" color="text3" style={{ fontSize: 10 }}>{pays}</T>
      {amount ? <View style={styles.placed}><ChipToken value={chipFor(amount)} size={22} /></View> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  total: { minWidth: 48, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  spot: { height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  placed: { position: 'absolute', right: 6, top: 6 },
});
