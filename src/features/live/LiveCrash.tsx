import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Avatar, Chip, PressableScale, T, formatCoins, formatMult } from '@/design/components';
import { useT } from '@/i18n';
import { LIVE_CONFIG, LIVE_CRASH_CAP, liveCrashMult, liveCrashTime, type CrashBet } from '@/engine/meta/live.ts';
import { BetInput } from '@/games/shared/BetInput';
import { useSession } from '@/state/session';
import { usePlayErrors } from '@/games/shared/hooks';
import { callFn } from '@/services/supabase';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { LiveFrame } from './LiveParts';
import { useLive, type LiveBetRow, type LivePhase } from './useLive';

const AUTOS = [null, 1.5, 2, 3, 5, 10] as const;
const STARS = Array.from({ length: 40 }, (_, i) => [((i * 73) % 100) / 100, ((i * 41 + 17) % 100) / 100, 0.6 + ((i * 7) % 3) * 0.55] as const);
const histColor = (m: number) => (m < 2 ? '#FF5C7A' : m < 10 ? '#A996FF' : '#FFD06B');

type Stage = 'betting' | 'boarding' | 'flying' | 'crashed';

/**
 * Live rocket: one rocket for everybody. Bets are taken for 12 s, then it takes off and the multiplier
 * climbs in sync on every phone (server clock). Cash out before it explodes — the server decides with its
 * own clock and the crash point it keeps secret until the explosion.
 */
export default function LiveCrash() {
  const { t } = useT();
  const live = useLive('crash', { askEvery: 600, betsEvery: 1500 });
  const balance = useSession((s) => s.balance) ?? 0;
  const cfg = LIVE_CONFIG.crash;
  const [chip, setChip] = useState(20);
  const [auto, setAuto] = useState<number | null>(2);
  const [busy, setBusy] = useState(false);
  const [cashed, setCashed] = useState<{ slot: number; mult: number; paid: number } | null>(null);
  const onError = usePlayErrors();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [ms, setMs] = useState(0); // flight time on the server clock

  const slot = live.round?.slot ?? -1;
  const crash = live.round?.result && 'crash' in live.round.result ? live.round.result.crash : null;
  const now = live.now;
  const { clock, startsAt } = live;
  const stage: Stage = now < live.closesAt ? 'betting' : now < live.startsAt ? 'boarding' : crash === null ? 'flying' : 'crashed';

  // smooth multiplier from the shared server clock while flying (~30 fps)
  useEffect(() => {
    if (stage !== 'flying') return;
    let raf = 0;
    let last = 0;
    let lastWhole = 1;
    const loop = (ts: number) => {
      if (ts - last >= 32) {
        last = ts;
        const m = clock() - startsAt;
        setMs(m);
        const whole = Math.floor(liveCrashMult(m));
        if (whole > lastWhole) {
          lastWhole = whole;
          sfx('tick', 0.5);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    sfx('rocket', 0.6);
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stage, startsAt, clock]);

  // explosion feedback once per round
  const boomed = useRef(-1);
  useEffect(() => {
    if (stage !== 'crashed' || boomed.current === slot) return;
    boomed.current = slot;
    const t1 = setTimeout(() => {
      setMs(liveCrashTime(crash ?? 1));
      if ((crash ?? 0) >= LIVE_CRASH_CAP) sfx('cashout');
      else {
        sfx('crash');
        haptic.heavy();
      }
    }, 0);
    return () => clearTimeout(t1);
  }, [stage, slot, crash]);

  const mine = live.bets.filter((b) => b.user_id === live.myId);
  const aboard = mine.filter((b) => b.payout === null && !(cashed && cashed.slot === slot));
  const stake = aboard.reduce((a, b) => a + b.amount, 0);
  const mult = stage === 'crashed' ? (crash ?? 1) : stage === 'flying' ? liveCrashMult(ms) : 1;

  const board = async () => {
    if (busy) return;
    try {
      setBusy(true);
      await live.placeBet({ amount: chip, auto } as CrashBet);
      sfx('chip');
      haptic.select();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const cashout = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const r = await callFn<{ paid: number; multiplier: number; balance: number }>('live', { action: 'cashout', game: 'crash', slot });
      useSession.getState().setBalance(Number(r.balance));
      setCashed({ slot, mult: r.multiplier, paid: r.paid });
      sfx('cashout');
      haptic.success();
      void live.refresh();
    } catch (e) {
      if ((e as Error).message === 'crashed') {
        sfx('crash');
        haptic.heavy();
      } else onError(e);
    } finally {
      setBusy(false);
    }
  };

  const myResult = cashed && cashed.slot === slot ? cashed : null;
  const label = stage === 'crashed' ? (crash! >= LIVE_CRASH_CAP ? t('live.landed') : `${t('play.crashed')} ${formatMult(crash!)}`) : stage === 'flying' ? t('play.flying') : stage === 'boarding' ? t('live.takeoff') : t('live.boardNow');
  const framePhase: LivePhase = stage === 'betting' ? 'betting' : stage === 'boarding' ? 'waiting' : stage === 'flying' ? 'show' : 'results';
  const sorted = useMemo(() => [...live.bets].sort((a, b) => (b.payout ?? -1) - (a.payout ?? -1)), [live.bets]);

  return (
    <LiveFrame
      title={t('live.crash')}
      phase={framePhase}
      closesAt={live.closesAt}
      endsAt={live.endsAt}
      now={now}
      footer={
        stage === 'flying' && stake > 0 ? (
          <PressableScale onPress={() => void cashout()} disabled={busy} feedback="none" scaleTo={0.97} accessibilityLabel={t('common.cashout')} style={styles.cashBtn}>
            <T weight="display" style={{ color: '#231A3A', fontSize: 20 }}>{t('common.cashout')}</T>
            <T weight="displaySemi" tabular style={{ color: '#231A3A', fontSize: 14 }}>{formatCoins(Math.floor(stake * mult))} {t('common.coins')}</T>
          </PressableScale>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T variant="caption" color="text2">{t('play.autoCashout')}</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {AUTOS.map((a) => <Chip key={String(a)} label={a ? `${a}×` : t('common.off')} selected={auto === a} onPress={() => setAuto(a)} />)}
              </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ flex: 1.15 }}><BetInput value={chip} onChange={setChip} balance={balance} min={cfg.min} max={cfg.max} disabled={stage !== 'betting'} /></View>
              <PressableScale onPress={() => void board()} disabled={stage !== 'betting' || busy || chip > balance} feedback="none" scaleTo={0.96} accessibilityLabel={t('live.board')} style={[styles.boardBtn, { opacity: stage === 'betting' ? 1 : 0.45 }]}>
                <T weight="display" style={{ color: '#fff', fontSize: 16 }}>🚀 {t('live.board')}</T>
                {mine.length ? <T variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>{t('live.aboard')}: {formatCoins(mine.reduce((a, b) => a + b.amount, 0))}</T> : null}
              </PressableScale>
            </View>
          </>
        )
      }
    >
      <View style={styles.history}>
        {live.history.slice(0, 12).map((r) => {
          const c = r.result && 'crash' in r.result ? r.result.crash : null;
          return c === null ? null : (
            <View key={r.slot} style={[styles.hist, { borderColor: histColor(c) }]}>
              <T weight="displaySemi" tabular style={{ color: histColor(c), fontSize: 11 }}>{formatMult(c)}</T>
            </View>
          );
        })}
      </View>
      <View style={styles.sky} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {box.w > 0 ? <Flight w={box.w} h={box.h} ms={stage === 'flying' || stage === 'crashed' ? ms : 0} stage={stage} mult={mult} /> : null}
        <View style={styles.center} pointerEvents="none">
          <T variant="hero" tabular style={{ fontSize: 60, lineHeight: 66, color: stage === 'crashed' ? (crash! >= LIVE_CRASH_CAP ? '#FFD06B' : '#FF5C7A') : '#fff' }}>
            {stage === 'betting' || stage === 'boarding' ? `${Math.max(0, Math.ceil(((stage === 'betting' ? live.closesAt : live.startsAt) - now) / 1000))}s` : formatMult(mult)}
          </T>
          <T weight="displaySemi" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</T>
          {myResult ? (
            <Animated.View entering={ZoomIn.springify()} style={styles.win}>
              <T weight="display" style={{ color: '#062A24' }}>+{formatCoins(myResult.paid)} · {formatMult(myResult.mult)}</T>
            </Animated.View>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 8 }}>
        <T variant="footnote" color="text2">{t('live.pilots')} ({live.bets.length})</T>
        <T variant="footnote" color="text3">{formatCoins(live.bets.reduce((a, b) => a + b.amount, 0))} {t('common.coins')}</T>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6, gap: 6 }}>
        {sorted.length ? sorted.slice(0, 30).map((b) => <Pilot key={b.id} b={b} me={b.user_id === live.myId} crashed={stage === 'crashed'} />) : <T variant="footnote" color="text3" align="center">{t('live.noBets')}</T>}
      </ScrollView>
    </LiveFrame>
  );
}

function Pilot({ b, me, crashed }: { b: LiveBetRow; me: boolean; crashed: boolean }) {
  const { t } = useT();
  const bet = b.bet as CrashBet;
  const won = !!b.payout;
  const lost = b.payout === 0 || (crashed && b.payout === null);
  return (
    <Animated.View entering={FadeInDown} style={[styles.pilot, me && { borderColor: '#FFD06B' }, won && { backgroundColor: 'rgba(91,227,176,0.16)' }]}>
      <Avatar id={b.avatar} size={24} />
      <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff', fontSize: 12, flex: 1 }}>{me ? t('common.you') : b.username}</T>
      {bet.auto ? <T variant="caption" color="text3">auto {formatMult(bet.auto)}</T> : null}
      <T tabular variant="caption" style={{ color: 'rgba(255,255,255,0.75)', width: 54, textAlign: 'right' }}>{formatCoins(b.amount)}</T>
      <T weight="display" tabular style={{ width: 92, textAlign: 'right', fontSize: 12, color: won ? '#5BE3B0' : lost ? '#FF5C7A' : 'rgba(255,255,255,0.5)' }}>
        {won ? `${formatMult(b.payout! / b.amount)} +${formatCoins(b.payout!)}` : lost ? '💥' : '…'}
      </T>
    </Animated.View>
  );
}

/** The flight chart: a curve that rescales as it climbs, stars streaming past and the rocket at the tip. */
const Flight = React.memo(function Flight({ w, h, ms, stage, mult }: { w: number; h: number; ms: number; stage: Stage; mult: number }) {
  const pad = 30;
  const secs = Math.max(8, (ms / 1000) * 1.12);
  const top = Math.max(2, mult * 1.18);
  const X = (s: number) => pad + ((w - pad * 1.6) * s) / secs;
  const Y = (m: number) => h - pad - ((h - pad * 2) * (m - 1)) / (top - 1);
  const pts: string[] = [];
  const steps = 48;
  for (let k = 0; k <= steps; k++) {
    const s = ((ms / 1000) * k) / steps;
    pts.push(`${X(s).toFixed(1)},${Y(Math.min(mult, liveCrashMult(s * 1000))).toFixed(1)}`);
  }
  const tipX = X(ms / 1000);
  const tipY = Y(mult);
  const prev = Math.max(0, ms - 250);
  const ang = (Math.atan2(Y(liveCrashMult(ms)) - Y(liveCrashMult(prev)), X(ms / 1000) - X(prev / 1000)) * 180) / Math.PI;
  const drift = (ms / 1000) * (30 + Math.log(Math.max(1, mult)) * 50);
  const crashed = stage === 'crashed';
  const flying = stage === 'flying';
  const color = crashed ? '#FF5C7A' : '#A996FF';
  const gridY = [1, ...[1.5, 2, 3, 5, 10, 20, 50].filter((m) => m < top)].slice(-4);
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.4} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {STARS.map(([sx, sy, r], i) => (
        <Circle key={i} cx={(((sx * w - drift * r) % w) + w) % w} cy={(sy * h + drift * r * 0.4) % h} r={r} fill="#fff" opacity={0.2 + r * 0.22} />
      ))}
      {gridY.map((m) => (
        <G key={m}>
          <Path d={`M${pad} ${Y(m)} H${w - 8}`} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          <SvgText x={4} y={Y(m) + 4} fontSize={10} fill="rgba(255,255,255,0.45)">{`${m}×`}</SvgText>
        </G>
      ))}
      {ms > 0 ? (
        <>
          <Path d={`M${pts.join(' L')} L${tipX},${h - pad} L${pad},${h - pad} Z`} fill="url(#lcFill)" />
          <Path d={`M${pts.join(' L')}`} stroke={color} strokeWidth={10} strokeOpacity={0.25} fill="none" strokeLinecap="round" />
          <Path d={`M${pts.join(' L')}`} stroke={crashed ? '#FF5C7A' : '#fff'} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        </>
      ) : null}
      <G x={ms > 0 ? tipX : pad + 14} y={ms > 0 ? tipY : h - pad - 8}>
        {crashed && mult < LIVE_CRASH_CAP ? (
          <>
            <Circle r={30} fill="#FF5C7A" opacity={0.25} />
            <Circle r={17} fill="#FFB938" opacity={0.9} />
            <Circle r={8} fill="#FFF3C4" />
          </>
        ) : (
          <G rotation={ms > 0 ? ang : -35} origin="0,0" scale={1.7}>
            {flying ? <Path d={`M-15 -3.5 L${-24 - ((ms / 60) % 3) * 3} 0 L-15 3.5 Z`} fill="#FFB020" /> : null}
            <Path d="M-14 -5 L8 -5 Q18 0 8 5 L-14 5 Z" fill="#F4F2FA" />
            <Path d="M-14 -5 L-20 -11 L-10 -5 Z M-14 5 L-20 11 L-10 5 Z" fill="#FF4F7B" />
            <Circle cx="2" cy="0" r="2.6" fill="#3D7BFF" stroke="#231A3A" strokeWidth={0.8} />
          </G>
        )}
      </G>
    </Svg>
  );
});

const styles = StyleSheet.create({
  history: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', minHeight: 22, paddingHorizontal: 10 },
  hist: { paddingHorizontal: 6, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sky: { flex: 1.7, minHeight: 200, marginHorizontal: 12, marginTop: 8, borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(8,10,30,0.75)', borderWidth: 1, borderColor: 'rgba(169,150,255,0.18)' },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  win: { marginTop: 10, paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: '#5BE3B0' },
  pilot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderColor: 'transparent' },
  cashBtn: { height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD06B' },
  boardBtn: { flex: 1, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B4BFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
