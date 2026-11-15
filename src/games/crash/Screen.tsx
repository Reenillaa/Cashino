import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, G, Circle } from 'react-native-svg';
import { Button, Chip, T, formatCoins, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';
import { multiplierAt, timeFor } from '@/engine/games/crash.ts';
import { payoutFor } from '@/engine/games/types.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell, ControlRow } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { MoreOptions } from '../shared/MoreOptions';

const tint = META.crash.tint;

function Rocket({ angle }: { angle: number }) {
  return (
    <G rotation={angle} origin="0,0">
      <Path d="M-14 -5 L8 -5 Q18 0 8 5 L-14 5 Z" fill="#E9EDF2" />
      <Path d="M-14 -5 L-20 -11 L-10 -5 Z M-14 5 L-20 11 L-10 5 Z" fill={tint} />
      <Circle cx="2" cy="0" r="2.4" fill={tint} />
    </G>
  );
}

type Phase = 'idle' | 'flying' | 'crashed' | 'cashed';

export default function CrashScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceEffects } = useTheme();
  const s = useGameSession('crash');
  const [bet, setBet] = useBet('crash', s.room);
  const [auto, setAuto] = useState<number | null>(null);
  const [autoText, setAutoText] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [mult, setMult] = useState(1);
  const [crashAt, setCrashAt] = useState<number | null>(null);
  const [cashedAt, setCashedAt] = useState<number | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('crash', (d) => d);
  const t0 = useRef(0);
  const raf = useRef<number | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const betRef = useRef(bet);
  const [roundBet, setRoundBet] = useState(bet);
  const lastTick = useRef(1);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (poll.current) clearInterval(poll.current);
    raf.current = null;
    poll.current = null;
  };
  useEffect(() => () => stop(), []);

  const finish = (r: { payout: number; view: Record<string, unknown> }) => {
    stop();
    const v = r.view as { crash: number; cashout: number | null; won: boolean };
    setCrashAt(v.crash);
    if (v.won && v.cashout) {
      setPhase('cashed');
      setCashedAt(v.cashout);
      setMult((m) => Math.max(m, v.cashout!));
      sfx('cashout');
      show({ bet: betRef.current, payout: r.payout, multiplier: v.cashout });
    } else {
      setPhase('crashed');
      setMult(v.crash);
      sfx('crash');
      haptic.heavy();
      show({ bet: betRef.current, payout: 0, label: `${t('play.crashed')} ${formatMult(v.crash)}` }, { silent: true });
    }
    tutorialEvent('crash', 'crash:end');
  };

  const start = async () => {
    try {
      betRef.current = bet;
      setRoundBet(bet);
      const r = await s.op('start', { bet, autoCashout: auto });
      t0.current = Date.now();
      lastTick.current = 1;
      setPhase('flying');
      setCrashAt(null);
      setCashedAt(null);
      setMult(1);
      sfx('rocket', 0.6);
      tutorialEvent('crash', 'crash:start');
      const loop = () => {
        const m = multiplierAt(Date.now() - t0.current);
        setMult(m);
        if (Math.floor(m) > Math.floor(lastTick.current)) {
          sfx('tick', 0.5);
          haptic.select();
        }
        lastTick.current = m;
        raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
      // Ask the authority (local engine or server) whether the rocket has crashed yet.
      poll.current = setInterval(async () => {
        try {
          const st = await s.op('settle');
          if (st.done) finish(st);
        } catch {
          // busy or transient: try again next tick
        }
      }, s.mode === 'online' ? 400 : 90);
      void r;
    } catch (e) {
      onError(e);
    }
  };
  const cashout = async () => {
    // The authority poll may be in flight: retry briefly instead of dropping the tap.
    for (let i = 0; i < 20; i++) {
      try {
        const r = await s.op('cashout');
        if (r.done) finish(r);
        return;
      } catch (e) {
        if ((e as Error).message === 'busy') {
          await new Promise((res) => setTimeout(res, 25));
          continue;
        }
        if ((e as Error).message === 'no_round') return; // already settled by the poll
        onError(e);
        return;
      }
    }
  };

  // Curve geometry: x = time, y = log(multiplier), auto-scaling viewport.
  const elapsed = timeFor(mult);
  const maxT = Math.max(8000, elapsed * 1.15);
  const maxLog = Math.max(Math.log(2), Math.log(mult) * 1.2);
  const pad = 18;
  const W = Math.max(1, box.w - pad * 2), H = Math.max(1, box.h - pad * 2);
  const pt = (ms: number) => {
    const m = multiplierAt(ms);
    return [pad + (ms / maxT) * W, pad + H - (Math.log(m) / maxLog) * H] as const;
  };
  const N = 40;
  const pts = Array.from({ length: N + 1 }, (_, i) => pt((elapsed * i) / N));
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [tx, ty] = pts[pts.length - 1];
  const [px, py] = pts[Math.max(0, pts.length - 3)];
  const angle = (Math.atan2(ty - py, tx - px) * 180) / Math.PI;
  const color = phase === 'crashed' ? c.loss : phase === 'cashed' ? c.win : c.text;
  const flying = phase === 'flying';
  return (
    <GameShell
      game="crash"
      mode={s.mode}
      balance={s.balance}
      locked={flying}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: c.surface1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {box.w > 0 && phase !== 'idle' && (
            <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="crashFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={phase === 'crashed' ? c.loss : tint} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={phase === 'crashed' ? c.loss : tint} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={`${d} L${tx},${pad + H} L${pad},${pad + H} Z`} fill="url(#crashFill)" />
              <Path d={d} stroke={phase === 'crashed' ? c.loss : tint} strokeWidth={3} fill="none" strokeLinecap="round" />
              {phase !== 'crashed' ? (
                <G x={tx} y={ty}>
                  {!reduceEffects && flying && <Circle cx={-22} cy={0} r={5 + ((mult * 37) % 3)} fill={alpha('#FFB45C', 0.5)} />}
                  <Rocket angle={angle} />
                </G>
              ) : (
                <G x={tx} y={ty}>
                  {[0, 60, 120, 180, 240, 300].map((a) => (
                    <Path key={a} d="M0 0 L14 0" stroke={c.loss} strokeWidth={3} strokeLinecap="round" rotation={a} origin="0,0" />
                  ))}
                </G>
              )}
            </Svg>
          )}
          <View style={styles.center} pointerEvents="none">
            <T variant="hero" tabular style={{ fontSize: 68, lineHeight: 74, color }}>{formatMult(mult)}</T>
            <T variant="footnote" color="text3">
              {phase === 'crashed' ? `${t('play.crashed')} ${formatMult(crashAt ?? mult)}` : phase === 'cashed' ? `${t('play.cashedAt')} ${formatMult(cashedAt ?? mult)}` : phase === 'flying' ? t('play.flying') : t('play.nextRound')}
            </T>
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          {!flying && (
            <>
              <MoreOptions game="crash" summary={`${t('play.autoCashout')}: ${auto ? formatMult(auto) : t('common.off').toLowerCase()}`}>
              <ControlRow>
                <Chip label={t('common.off')} selected={auto === null} onPress={() => { setAuto(null); setAutoText(''); }} />
                {[1.5, 2, 3, 5, 10].map((x) => <Chip key={x} label={`${x}×`} selected={auto === x} tint={tint} onPress={() => { setAuto(x); setAutoText(String(x)); }} />)}
                <View style={[styles.autoField, { backgroundColor: c.surface2 }]}>
                  <TextInput
                    value={autoText}
                    placeholder="x.xx"
                    placeholderTextColor={c.text3}
                    onChangeText={(v) => setAutoText(v.replace(',', '.').replace(/[^0-9.]/g, ''))}
                    onBlur={() => {
                      const n = Number(autoText);
                      setAuto(n >= 1.01 ? Math.floor(n * 100) / 100 : null);
                    }}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t('play.autoCashout')}
                    style={{ color: c.text, fontFamily: 'GeistMono_500Medium', fontSize: 14, padding: 0, minWidth: 48 }}
                  />
                </View>
              </ControlRow>
              </MoreOptions>
            </>
          )}
          {flying ? (
            <Button spot="crash:end" title={t('common.cashout')} subtitle={`${formatCoins(payoutFor(roundBet, Math.floor(mult * 100) / 100))} ${t('common.coins')}`} onPress={cashout} />
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} tint={tint} /></View>
              <Button spot="crash:start" title={t('play.placeBet')} onPress={start} disabled={(bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ flex: 1 }} />
            </View>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  autoField: { height: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: 'center' },
});
