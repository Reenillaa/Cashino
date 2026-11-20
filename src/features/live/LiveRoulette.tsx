import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, PressableScale, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { betKey, type FireNumber, type PlacedBet } from '@/engine/games/roulette.ts';
import { LIVE_CONFIG } from '@/engine/meta/live.ts';
import { useDesktop } from '@/design/layout';
import { useProgress } from '@/state/progress';
import { useSession } from '@/state/session';
import { BetInput } from '@/games/shared/BetInput';
import { ResultBanner } from '@/games/shared/ResultBanner';
import { usePlayErrors, useResult } from '@/games/shared/hooks';
import { Countdown, LastNumbers, RouletteStage, SPIN, type SpinInfo } from '@/games/roulette/Stage';
import { BetOverlay, type BoardMode } from '@/games/roulette/Overlay';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { BetsFeed, LiveFrame } from './LiveParts';
import { useLive, type LiveBetRow } from './useLive';

const CHIPS = [10, 20, 50, 100, 200, 500, 1000, 2000];
type Bets = Record<string, PlacedBet>;
const numberOf = (r: unknown) => (r && typeof r === 'object' && 'number' in r ? (r as { number: number; fire?: FireNumber[] }) : null);

/** Live Flame Roulette: everybody on the same wheel, a spin every 30 seconds, the same design as the solo table. */
export default function LiveRoulette() {
  const { t } = useT();
  const desktop = useDesktop();
  const live = useLive('roulette');
  const balance = useSession((s) => s.balance) ?? 0;
  const cfg = LIVE_CONFIG.roulette;
  const [chip, setChip] = useState(20);
  const [draft, setDraft] = useState<Bets>({});
  const [stack, setStack] = useState<string[][]>([]);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<BoardMode | null>(null);
  const [box, setBox] = useState({ w: 360, h: 420 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const open = live.phase === 'betting';
  const vertical = !desktop && box.h > box.w * 1.05;
  const total = Object.values(draft).reduce((a, b) => a + b.amount, 0);

  // my bets already on the table this round
  const mine = live.bets.filter((b) => b.user_id === live.myId);
  const confirmed = useMemo(() => {
    const out: Bets = {};
    for (const row of live.bets) {
      if (row.user_id !== live.myId) continue;
      const pb = row.bet as PlacedBet;
      const k = betKey(pb.bet);
      out[k] = { bet: pb.bet, amount: (out[k]?.amount ?? 0) + pb.amount };
    }
    return out;
  }, [live.bets, live.myId]);
  const placed = mine.reduce((a, b) => a + b.amount, 0);

  // the spin, on this device's clock
  const r = numberOf(live.round?.result);
  const spin: SpinInfo | null = r && live.round ? { at: live.startsAt, number: r.number, fire: r.fire ?? [], key: `${live.round.slot}` } : null;
  const history = live.history.map((h) => numberOf(h.result)).map((x, i) => (x ? { n: x.number, fire: x.fire?.find((f) => f.n === x.number)?.m ?? null, key: `${live.history[i].slot}` } : null)).filter(Boolean) as { n: number; fire: number | null; key: string }[];
  const prev = history[0]?.n ?? null;

  // betting closes: fold the table; unsent bets stay on your side
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) {
      const id = setTimeout(() => {
        setBoard(null);
        if (Object.keys(draft).length) {
          useProgress.getState().pushToast({ kind: 'info', title: t('play.rl.notSent', { amount: formatCoins(total) }) });
          setDraft({});
          setStack([]);
        }
      }, 0);
      wasOpen.current = open;
      return () => clearTimeout(id);
    }
    wasOpen.current = open;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // my result at the reveal
  const minesRef = useRef<LiveBetRow[]>([]);
  useEffect(() => {
    minesRef.current = mine;
  });
  useEffect(() => {
    if (!spin) return;
    const wait = spin.at + SPIN.reveal - live.clock();
    if (wait < -2000) return;
    const id = setTimeout(() => {
      const my = minesRef.current;
      const bet = my.reduce((a, b) => a + b.amount, 0);
      if (bet) show({ bet, payout: my.reduce((a, b) => a + (b.payout ?? 0), 0), label: `${spin.number}` });
    }, Math.max(0, wait));
    return () => clearTimeout(id);
  }, [spin?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (list: PlacedBet[]) => {
    if (!open) return;
    if (list.some((x) => x.amount < cfg.min || x.amount > cfg.max)) return onError(new Error('invalid_amount'));
    const sum = list.reduce((a, b) => a + b.amount, 0);
    if (total + sum > balance) return onError(new Error('insufficient'));
    setDraft((d) => {
      const nd = { ...d };
      for (const x of list) {
        const k = betKey(x.bet);
        nd[k] = { bet: x.bet, amount: (nd[k]?.amount ?? 0) + x.amount };
      }
      return nd;
    });
    setStack((st) => [...st, list.map((x) => `${betKey(x.bet)}|${x.amount}`)]);
    sfx('chip');
    haptic.select();
  };
  const undo = () => {
    const top = stack[stack.length - 1];
    if (!top) return;
    setStack((st) => st.slice(0, -1));
    setDraft((d) => {
      const nd = { ...d };
      for (const it of top) {
        const [k, a] = it.split('|');
        const left = (nd[k]?.amount ?? 0) - Number(a);
        if (left <= 0) delete nd[k];
        else nd[k] = { ...nd[k], amount: left };
      }
      return nd;
    });
  };
  const send = async () => {
    if (busy || !total) return;
    try {
      setBusy(true);
      const list = Object.values(draft);
      // the server takes up to 40 bets at a time and each one must stay under the table maximum
      const chunks: PlacedBet[] = list.flatMap((b) => {
        const parts: PlacedBet[] = [];
        let left = b.amount;
        while (left > 0) {
          const a = Math.min(cfg.max, left);
          parts.push({ bet: b.bet, amount: a });
          left -= a;
        }
        return parts;
      });
      for (let i = 0; i < chunks.length; i += 40) await live.placeBets(chunks.slice(i, i + 40));
      setDraft({});
      setStack([]);
      sfx('cashout', 0.6);
      haptic.success();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const describe = (b: LiveBetRow) => {
    const x = (b.bet as PlacedBet).bet;
    if (x.kind === 'straight') return `${t('live.number')} ${x.numbers[0]}`;
    if (x.kind === 'dozen') return `${x.dozen}ª ${t('live.dozen')}`;
    if (x.kind === 'split' || x.kind === 'corner' || x.kind === 'trio') return x.numbers.join('/');
    if (x.kind === 'street' || x.kind === 'line') return `${t('live.r.' + x.kind, { defaultValue: x.kind })} ${x.row}`;
    if (x.kind === 'column') return `2:1 · ${x.column}`;
    return t(`live.r.${x.kind}`);
  };

  const opensAt = live.closesAt - cfg.betting;
  const clockEl = <Countdown opensAt={opensAt} closesAt={live.closesAt} clock={live.clock} label={t('play.rl.place')} closed={open ? null : t('play.rl.closed')} compact={!desktop} />;
  const tools = (
    <View style={styles.tools}>
      <View style={styles.total}>
        <T variant="caption" style={{ color: 'rgba(255,227,176,0.7)' }} numberOfLines={1}>{placed ? t('play.rl.yourBets', { amount: formatCoins(placed) }) : t('play.totalBet')}</T>
        <T weight="display" tabular style={{ color: '#fff', fontSize: 15 }}>{formatCoins(total)}</T>
      </View>
      <Tool text="×2" label={t('play.rl.double')} onPress={() => total && add(Object.values(draft))} disabled={!open || !total} />
      <Tool icon="arrowDown" rotate label={t('play.undo')} onPress={undo} disabled={!open || !stack.length} />
      <Tool icon="trash" label={t('common.clear')} onPress={() => { setDraft({}); setStack([]); }} disabled={!open || !total} />
      <PressableScale onPress={() => void send()} disabled={!open || !total || busy} feedback="select" scaleTo={0.95} accessibilityLabel={t('play.rl.confirm', { amount: formatCoins(total) })} style={[styles.confirm, (!open || !total) && { opacity: 0.4 }]}>
        <LinearGradient colors={['#5BE3B0', '#0B8A55']} style={StyleSheet.absoluteFill} />
        <T weight="display" style={{ color: '#04160E', fontSize: 13 }}>{busy ? '…' : `✓ ${formatCoins(total)}`}</T>
      </PressableScale>
    </View>
  );
  return (
    <LiveFrame game="roulette" title={t('live.roulette')} phase={live.phase} closesAt={live.closesAt} endsAt={live.endsAt} now={live.now} hideClock wide
      footer={
        <>
          {board ? null : tools}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flex: 1.1 }}><BetInput value={chip} onChange={setChip} balance={balance} min={cfg.min} max={cfg.max} options={CHIPS} label={t('play.chipValue')} disabled={!open} /></View>
            <View style={{ flex: 1, gap: 6 }}>
              <PressableScale onPress={() => open && setBoard('table')} disabled={!open} feedback="select" scaleTo={0.96} accessibilityLabel={t('play.rl.table')} style={[styles.tableBtn, !open && { opacity: 0.45 }]}>
                <LinearGradient colors={['#7A1024', '#3A0610']} style={StyleSheet.absoluteFill} />
                <T weight="display" style={{ color: '#FFE3B0', fontSize: 14 }}>🎯 {t('play.rl.table')}</T>
              </PressableScale>
              <PressableScale onPress={() => open && setBoard('zones')} disabled={!open} feedback="select" scaleTo={0.96} accessibilityLabel={t('play.rl.zones')} style={[styles.fire, !open && { opacity: 0.45 }]}>
                <LinearGradient colors={['#FFD06B', '#FF6A1F', '#B8100A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <T weight="display" style={{ color: '#2A0800', fontSize: 14 }}>🔥 {t('play.rl.zones')}</T>
              </PressableScale>
            </View>
          </View>
        </>
      }
    >
      <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <RouletteStage w={box.w} h={box.h} spin={spin} prev={prev} active compact={!desktop} now={live.clock} />
        <View pointerEvents="none" style={[styles.hud, { top: desktop ? 14 : 6 }]}>{board ? null : clockEl}</View>
        <View pointerEvents="none" style={[styles.last, { bottom: desktop ? 16 : 8 }]}><LastNumbers items={history} compact={!desktop} /></View>
        {board ? (
          <BetOverlay w={box.w} h={box.h} vertical={vertical} mode={board} onMode={setBoard} bets={draft} confirmed={confirmed} chip={chip} onAdd={add} last={prev} disabled={!open} onClose={() => setBoard(null)} footer={tools} center={desktop ? clockEl : <Countdown opensAt={opensAt} closesAt={live.closesAt} clock={live.clock} label="" closed={null} compact tiny />} />
        ) : null}
        <ResultBanner result={result} compact />
      </View>
      <View style={{ marginTop: 6, marginBottom: 4 }}><BetsFeed bets={live.bets} myId={live.myId} describe={describe} /></View>
    </LiveFrame>
  );
}

function Tool({ icon, text, label, onPress, disabled, rotate }: { icon?: 'arrowDown' | 'trash'; text?: string; label: string; onPress: () => void; disabled?: boolean; rotate?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} hitSlop={6} style={[styles.tool, disabled && { opacity: 0.35 }]}>
      {icon ? <View style={rotate ? { transform: [{ rotate: '90deg' }] } : undefined}><Icon name={icon} size={17} color="#FFE3B0" /></View> : <T weight="display" style={{ color: '#FFE3B0', fontSize: 13 }}>{text}</T>}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, borderRadius: 24, overflow: 'hidden', marginHorizontal: 8 },
  hud: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  last: { position: 'absolute', left: 0, right: 0 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  total: { flex: 1, paddingHorizontal: 12, height: 40, borderRadius: 20, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  tool: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,185,56,0.3)' },
  confirm: { height: 40, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: '#BFFFE6' },
  tableBtn: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,229,138,0.7)' },
  fire: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFE58A' },
});
