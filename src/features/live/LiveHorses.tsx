import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Avatar, Button, Chip, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { BET_SHAPE, BET_TYPES, oddsFor, type BetType, type HorseBet, type RaceResult } from '@/engine/games/horses.ts';
import { LIVE_CONFIG } from '@/engine/meta/live.ts';
import { RaceCardView } from '@/games/horses/RaceCardView';
import { RaceView } from '@/games/horses/RaceView';
import { Saddle } from '@/games/horses/Art';
import { BetInput } from '@/games/shared/BetInput';
import { usePlayErrors } from '@/games/shared/hooks';
import { useSession } from '@/state/session';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { BetsFeed, LiveFrame } from './LiveParts';
import { useLive, type LiveBetRow } from './useLive';

const fmtOdds = (x: number) => `×${x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

export default function LiveHorses() {
  const { t } = useT();
  const { width: winW, height } = useWindowDimensions();
  const width = Math.min(winW, 640);
  const live = useLive('horses');
  const balance = useSession((s) => s.balance) ?? 0;
  const cfg = LIVE_CONFIG.horses;
  const [type, setType] = useState<BetType>('win');
  const [picks, setPicks] = useState<number[]>([]);
  const [amount, setAmount] = useState(50);
  const [busy, setBusy] = useState(false);
  const onError = usePlayErrors();
  const card = live.round?.card ?? null;
  const race = live.round?.result && 'race' in live.round.result ? (live.round.result.race as RaceResult) : null;
  const need = BET_SHAPE[type].picks;
  const open = live.phase === 'betting';
  const current: HorseBet | null = picks.length === need ? { type, horses: picks, amount } : null;

  const pick = (n: number) => {
    if (!open) return;
    haptic.select();
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < need ? [...p, n] : [...p.slice(0, need - 1), n]));
  };
  const place = async () => {
    if (!current || busy) return;
    try {
      setBusy(true);
      await live.placeBet(current);
      sfx('chip');
      haptic.success();
      setPicks([]);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const describe = (b: LiveBetRow) => {
    const x = b.bet as HorseBet;
    return `${t(`play.betTypes.${x.type}`)} ${x.horses.join('-')}`;
  };
  const name = (n: number) => card?.horses[n - 1]?.name ?? '';
  const winners = live.bets.filter((b) => (b.payout ?? 0) > 0).sort((a, b) => (b.payout ?? 0) - (a.payout ?? 0));
  const raceH = Math.min(height * 0.42, 360);

  return (
    <LiveFrame
      game="horses"
      title={t('live.horses')}
      phase={live.phase}
      closesAt={live.closesAt}
      endsAt={live.endsAt}
      now={live.now}
      footer={
        open && card ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {BET_TYPES.map((k) => <Chip key={k} label={t(`play.betTypes.${k}`)} selected={type === k} onPress={() => { setType(k); setPicks((p) => p.slice(0, BET_SHAPE[k].picks)); }} />)}
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30 }}>
              <T variant="footnote" color="text2" numberOfLines={2} style={{ flex: 1 }}>
                {current ? `${t(`play.betHelp.${type}`)} · ${picks.map((n) => `${n} ${name(n)}`).join(BET_SHAPE[type].ordered && need > 1 ? ' → ' : ' + ')}` : t('play.pickHorses', { count: need - picks.length })}
              </T>
              {current ? <T weight="display" tabular style={{ color: '#FFD06B', fontSize: 20 }}>{fmtOdds(oddsFor(card, type, picks))}</T> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1.2 }}><BetInput value={amount} onChange={setAmount} balance={balance} min={cfg.min} max={cfg.max} /></View>
              <Button title={t('live.place')} onPress={place} loading={busy} disabled={!current || amount > balance} style={{ flex: 1 }} />
            </View>
          </>
        ) : undefined
      }
    >
      {card ? (
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          {open || live.phase === 'waiting' || !race ? (
            <View style={{ flex: 1 }}>
              {live.phase === 'waiting' ? <T weight="displaySemi" align="center" style={{ color: '#FFD06B', marginBottom: 6 }}>{t('live.toStalls')}</T> : null}
              <RaceCardView card={card} betType={type} picks={picks} onPick={pick} />
            </View>
          ) : (
            <View>
              <RaceView key={live.round?.slot} card={card} race={race} width={width - 24} height={raceH} duration={cfg.show} startedAt={live.startsAt} onEnd={() => sfx('win', 0.5)} />
              {live.phase === 'results' ? (
                <Animated.View entering={FadeIn} style={styles.results}>
                  <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
                    {race.finish.slice(0, 3).map((n, k) => (
                      <View key={n} style={{ alignItems: 'center' }}>
                        <Saddle n={n} silks={card.horses[n - 1].silks} size={k === 0 ? 40 : 32} />
                        <T variant="caption" style={{ color: '#fff' }}>{k + 1}º {name(n)}</T>
                      </View>
                    ))}
                  </View>
                  <T variant="footnote" color="text2" style={{ marginTop: 8 }}>{winners.length ? t('live.winners') : t('live.noWinners')}</T>
                  {winners.slice(0, 5).map((b) => (
                    <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Avatar id={b.avatar} size={22} />
                      <T variant="footnote" style={{ color: '#fff', flex: 1 }} numberOfLines={1}>{b.user_id === live.myId ? t('common.you') : b.username} · {describe(b)}</T>
                      <T weight="displaySemi" tabular style={{ color: '#5BE3B0' }}>+{formatCoins((b.payout ?? 0) - b.amount)}</T>
                    </View>
                  ))}
                </Animated.View>
              ) : null}
            </View>
          )}
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><T color="text2">{live.error ? `${t('common.error')} (${live.error})` : '…'}</T></View>
      )}
      <T variant="footnote" color="text2" style={{ marginLeft: 12, marginVertical: 6 }}>{t('live.bets')} ({live.bets.length})</T>
      <View style={{ marginBottom: 8 }}><BetsFeed bets={live.bets} myId={live.myId} describe={describe} /></View>
    </LiveFrame>
  );
}

const styles = StyleSheet.create({
  results: { marginTop: 10, padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' },
});
