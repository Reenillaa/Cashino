import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, PlayingCard, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { parseCard } from '@/engine/cards/cards.ts';
import { BACCARAT_PAYS, type BaccaratBetKind } from '@/engine/games/baccarat.ts';
import { useGameSession, PlayError } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { ChipToken, chipFor } from '../shared/ChipRack';
import { BetInput } from '../shared/BetInput';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { Felt } from '../shared/Felt';
import { LinearGradient } from 'expo-linear-gradient';

interface BView { player: string[]; banker: string[]; playerTotal: number; bankerTotal: number; winner: 'player' | 'banker' | 'tie'; order: ('player' | 'banker')[] }

export default function BaccaratScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('baccarat');
  const [chip, setChip] = useBet('baccarat', s.room);
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
    <BacSpot key={k} big={k === 'player' || k === 'banker'} label={label} pays={pays} amount={bets[k]} highlight={!!coup && coup.winner === k && !busy} onPress={() => place(k)} />
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
        <View style={{ flex: 1, paddingHorizontal: 10, paddingBottom: 8 }}>
        <Felt shape="table" colors={['#6E1A3C', '#2A0718']} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 34, paddingTop: 6 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {hand('player')}
            <View style={styles.vs}><T weight="display" style={{ color: 'rgba(255,229,138,0.7)', fontSize: 13 }}>VS</T></View>
            {hand('banker')}
          </View>
          <T weight="displaySemi" align="center" style={styles.brand}>PUNTO BANCO · {t('play.bacRule')}</T>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {spot('playerPair', t('play.playerPair'), '11:1')}
            {spot('tie', t('play.tie'), `${BACCARAT_PAYS.tie}:1`)}
            {spot('bankerPair', t('play.bankerPair'), '11:1')}
          </View>
          <TutorialTarget id="bac:place">
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {spot('player', t('play.player'), '1:1')}
            {spot('banker', t('play.banker'), '0.95:1')}
          </View>
          </TutorialTarget>
        </View>
        </Felt>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <T variant="footnote" color="text2" style={{ flex: 1 }}>{t('play.totalBet')}: <T variant="footnote" weight="semibold" tabular color={total && total < s.room.min ? 'warn' : 'text'}>{formatCoins(total)}</T></T>
            <Button title={t('common.clear')} kind="ghost" size="sm" onPress={() => setBets({})} disabled={!total || busy} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={chip} onChange={setChip} balance={s.balance} min={s.room.min} max={s.room.max} label={t('play.chipValue')} /></View>
            <Button spot="bac:deal" title={t('play.deal')} onPress={deal} loading={busy} disabled={!total || total > s.balance || total < s.room.min} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

function BacHand({ label, cards, total, winner }: { label: string; cards: string[]; total: number | null; winner: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
      <T weight="displaySemi" style={{ color: winner ? '#FFE58A' : 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: 1.5 }}>{label.toUpperCase()}</T>
      <View style={{ flexDirection: 'row', minHeight: 70 }}>
        {cards.length === 0
          ? [0, 1].map((i) => <View key={i} style={[styles.slot, { marginLeft: i ? 6 : 0 }]} />)
          : cards.map((code, i) => (
            <View key={i} style={{ marginLeft: i ? 4 : 0, marginTop: i === 2 ? 10 : 0, transform: i === 2 ? [{ rotate: '90deg' }, { translateX: 6 }] : undefined }}>
              <PlayingCard card={parseCard(code)} size="sm" highlight={winner ? '#FFE58A' : undefined} />
            </View>
          ))}
      </View>
      <View style={[styles.total, { borderColor: winner ? '#FFE58A' : 'rgba(255,255,255,0.3)' }]}>
        <LinearGradient colors={winner ? ['#FFD06B', '#D9741C'] : ['#FFFFFF', '#E9E4F5']} style={StyleSheet.absoluteFill} />
        <T weight="display" tabular style={{ color: winner ? '#fff' : '#1A1530', fontSize: 24, lineHeight: 30 }}>{total ?? '·'}</T>
      </View>
    </View>
  );
}

function BacSpot({ label, pays, amount, highlight, big, onPress }: { label: string; pays: string; amount?: number; highlight: boolean; big?: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.96} accessibilityLabel={`${label} ${pays}${amount ? `, ${amount}` : ''}`}
      style={[styles.spot, { flex: 1, height: big ? 74 : 52, borderRadius: big ? 37 : 18, backgroundColor: highlight ? 'rgba(255,229,138,0.22)' : 'rgba(0,0,0,0.28)', borderColor: highlight ? '#FFE58A' : 'rgba(255,229,138,0.4)', borderWidth: big ? 2 : 1.5 }]}>
      <T weight={big ? 'display' : 'displaySemi'} style={{ color: '#fff', fontSize: big ? 18 : 13 }}>{label}</T>
      <T variant="caption" style={{ fontSize: 10, color: 'rgba(255,229,138,0.8)' }}>{pays}</T>
      {amount ? (
        <View style={[styles.placed, big ? { right: 18, top: -12 } : null]}>
          <ChipToken value={chipFor(amount)} size={big ? 30 : 22} />
          <T weight="displaySemi" style={{ color: '#fff', fontSize: 10, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 4, borderRadius: 6, overflow: 'hidden' }}>{amount}</T>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  total: { minWidth: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, overflow: 'hidden', borderWidth: 2 },
  spot: { alignItems: 'center', justifyContent: 'center' },
  placed: { position: 'absolute', right: -6, top: -18, alignItems: 'center', flexDirection: 'row', gap: 3 },
  slot: { width: 46, height: 64, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,229,138,0.35)', borderStyle: 'dashed' },
  vs: { alignSelf: 'center', marginTop: 10, width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,229,138,0.4)', alignItems: 'center', justifyContent: 'center' },
  brand: { color: 'rgba(255,229,138,0.5)', fontSize: 9.5, letterSpacing: 1.2, marginTop: 16 },
});
