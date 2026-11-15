import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { Button, Chip, PlayingCard, Segmented, Slider, Surface, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { secureRng } from '@/services/random';
import { shuffledDeck, type Card } from '@/engine/cards/cards.ts';
import * as BJ from '@/engine/games/blackjack.ts';
import { monteCarloEquity, countOuts } from '@/engine/poker/equity.ts';
import { evaluate, CATEGORY_KEYS } from '@/engine/poker/evaluator.ts';
import { surviveChance, minesMultiplier, startMines, revealTile } from '@/engine/games/mines.ts';
import { crashPoint } from '@/engine/games/crash.ts';
import { dropBall, binProbability } from '@/engine/games/plinko.ts';
import { guessProbability, legalGuesses, drawCard, type HiloGuess } from '@/engine/games/hilo.ts';
import { rollDice } from '@/engine/games/dice.ts';
import { spinRoulette, RED_NUMBERS } from '@/engine/games/roulette.ts';

/** Small bar/line chart used by simulators. */
function Bars({ values, highlight, compare }: { values: number[]; highlight?: string; compare?: number[] }) {
  const { c } = useTheme();
  const max = Math.max(...values, ...(compare ?? []), 1e-9);
  const w = 300, h = 120, bw = w / values.length;
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {values.map((v, i) => (
        <Path key={i} d={`M${i * bw + bw / 2},${h} L${i * bw + bw / 2},${h - Math.max(1, (v / max) * h)}`} stroke={highlight ?? c.text2} strokeWidth={Math.max(1, bw - 3)} />
      ))}
      {compare && <Polyline points={compare.map((v, i) => `${i * bw + bw / 2},${h - (v / max) * h}`).join(' ')} fill="none" stroke={c.warn} strokeWidth={2} />}
    </Svg>
  );
}
function LineChart({ series, zero }: { series: number[]; zero?: number }) {
  const { c } = useTheme();
  const w = 300, h = 120;
  const min = Math.min(...series, zero ?? Infinity), max = Math.max(...series, zero ?? -Infinity);
  const y = (v: number) => h - ((v - min) / Math.max(1e-9, max - min)) * h;
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {zero !== undefined && <Line x1={0} x2={w} y1={y(zero)} y2={y(zero)} stroke={c.hairlineStrong} strokeDasharray="4 4" />}
      <Polyline points={series.map((v, i) => `${(i / Math.max(1, series.length - 1)) * w},${y(v)}`).join(' ')} fill="none" stroke={c.text} strokeWidth={2} />
    </Svg>
  );
}
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)} %`;
function Row({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <T variant="footnote" color="text2">{label}</T>
      <T variant="footnote" weight="semibold" tabular style={tint ? { color: tint } : undefined}>{value}</T>
    </View>
  );
}

function BlackjackTrainer() {
  const { t, lang } = useT();
  const { c } = useTheme();
  const deal = () => {
    // Skip natural blackjacks: there is no decision to train.
    for (;;) {
      const d = shuffledDeck(secureRng, 1);
      if (!BJ.isBlackjack([d[0], d[1]])) return { hand: [d[0], d[1]], up: d[2] };
    }
  };
  const [s, setS] = useState(deal);
  const [answer, setAnswer] = useState<BJ.BJAction | null>(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const canSplit = BJ.cardValue(s.hand[0]) === BJ.cardValue(s.hand[1]);
  const best = BJ.basicStrategy(s.hand, s.up, true, canSplit);
  const pick = (a: BJ.BJAction) => {
    setAnswer(a);
    setScore((x) => ({ ok: x.ok + (a === best ? 1 : 0), n: x.n + 1 }));
  };
  const label = (a: BJ.BJAction) => t(`play.${a === 'double' ? 'doubleDown' : a}`);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <T variant="caption" color="text3">{t('play.dealer')}</T>
        <PlayingCard key={`u${score.n}`} card={s.up} size="md" />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>{s.hand.map((h, i) => <PlayingCard key={`${score.n}-${i}`} card={h} size="md" delay={i * 100} />)}</View>
        <T variant="footnote" color="text2">{BJ.handValue(s.hand).soft ? 'Soft' : 'Hard'} {BJ.handValue(s.hand).total}</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {(['hit', 'stand', 'double', ...(canSplit ? ['split'] : [])] as BJ.BJAction[]).map((a) => (
          <Chip key={a} label={label(a)} onPress={answer ? undefined : () => pick(a)} selected={answer === a || (answer !== null && a === best)} tint={answer && a === best ? c.win : c.loss} />
        ))}
      </View>
      {answer && (
        <Surface level={2}>
          <T variant="callout" weight="semibold" color={answer === best ? 'win' : 'loss'}>{answer === best ? t('academy.correct') : t('academy.incorrect')}</T>
          <T variant="footnote" color="text2">{lang === 'en' ? 'Basic strategy' : 'Estrategia básica'}: {label(best)}</T>
        </Surface>
      )}
      <Row label={t('academy.score', { n: score.ok, total: score.n })} value={score.n ? pct(score.ok / score.n, 0) : '—'} />
      <Button title={t('common.next')} onPress={() => { setS(deal()); setAnswer(null); }} />
    </View>
  );
}

function PokerEquity() {
  const { t } = useT();
  const { c } = useTheme();
  const [opp, setOpp] = useState(1);
  const [street, setStreet] = useState<'pre' | 'flop' | 'turn'>('flop');
  const [deal, setDeal] = useState(() => shuffledDeck(secureRng));
  const hole = deal.slice(0, 2);
  const board = deal.slice(2, street === 'pre' ? 2 : street === 'flop' ? 5 : 6);
  const res = useMemo(() => ({ eq: monteCarloEquity(secureRng, hole, board, opp, 1500), outs: board.length >= 3 && board.length < 5 ? countOuts(hole, board).outs : null, made: board.length >= 3 ? evaluate([...hole, ...board]).category : null }), [deal, opp, street]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>{hole.map((x, i) => <PlayingCard key={i} card={x} size="md" />)}</View>
      <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 64 }}>{board.map((x, i) => <PlayingCard key={i} card={x} size="sm" />)}</View>
      <Segmented value={street} onChange={setStreet} options={[{ value: 'pre', label: 'Preflop' }, { value: 'flop', label: 'Flop' }, { value: 'turn', label: 'Turn' }]} />
      <View style={{ flexDirection: 'row', gap: 8 }}>{[1, 2, 3, 5].map((n) => <Chip key={n} label={`vs ${n}`} selected={opp === n} onPress={() => setOpp(n)} />)}</View>
      <Surface level={2}>
        <Row label={t('poker.equity')} value={pct(res.eq)} tint={res.eq >= 0.5 ? c.win : undefined} />
        {res.made !== null && <Row label={t('poker.handRank')} value={t(`poker.hands.${CATEGORY_KEYS[res.made]}`)} />}
        {res.outs !== null && <Row label={t('poker.outs')} value={`${res.outs}`} />}
      </Surface>
      <Button title={t('play.deal')} onPress={() => setDeal(shuffledDeck(secureRng))} />
    </View>
  );
}

function MinesSim() {
  const { t } = useT();
  const { c } = useTheme();
  const [m, setM] = useState(3);
  const [k, setK] = useState(5);
  const [sim, setSim] = useState<number | null>(null);
  const run = () => {
    let ok = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      let s = startMines(secureRng, 1, m);
      let alive = true;
      for (let j = 0; j < k && alive; j++) {
        s = revealTile(s, j); // mines are uniformly placed, so any fixed order is equivalent
        alive = s.status !== 'lost';
      }
      if (alive) ok++;
    }
    setSim(ok / N);
  };
  return (
    <View style={{ gap: 12 }}>
      <T variant="footnote" color="text3">{t('play.mines')}: {m}</T>
      <Slider value={m} min={1} max={24} onChange={(v) => { setM(v); setK((x) => Math.min(x, 25 - v)); setSim(null); }} accessibilityLabel={t('play.mines')} />
      <T variant="footnote" color="text3">{t('play.gems')}: {k}</T>
      <Slider value={k} min={1} max={25 - m} onChange={(v) => { setK(v); setSim(null); }} accessibilityLabel={t('play.gems')} />
      <Surface level={2}>
        <Row label={t('academy.expected')} value={pct(surviveChance(m, k), 2)} />
        <Row label={t('common.multiplier')} value={`${minesMultiplier(m, k).toFixed(2)}×`} />
        <Row label="EV" value={(surviveChance(m, k) * minesMultiplier(m, k)).toFixed(4)} />
        {sim !== null && <Row label={`${t('academy.observed')} (5.000)`} value={pct(sim, 2)} tint={c.info} />}
      </Surface>
      <Button title={t('academy.simulate')} onPress={run} />
    </View>
  );
}

function RouletteSim() {
  const { t, lang } = useT();
  const [system, setSystem] = useState<'flat' | 'martingale'>('flat');
  const [out, setOut] = useState<{ series: number[]; busted: number; final: number } | null>(null);
  const run = () => {
    let bal = 1000, stake = 10, busted = 0;
    const series = [bal];
    for (let i = 0; i < 1000; i++) {
      if (stake > bal) {
        busted++;
        bal = 1000;
        stake = 10;
      }
      const n = spinRoulette(secureRng);
      const win = RED_NUMBERS.has(n);
      bal += win ? stake : -stake;
      stake = system === 'martingale' ? (win ? 10 : stake * 2) : 10;
      if (i % 10 === 0) series.push(bal);
    }
    setOut({ series, busted, final: bal });
  };
  return (
    <View style={{ gap: 12 }}>
      <Segmented value={system} onChange={setSystem} options={[{ value: 'flat', label: lang === 'en' ? 'Flat 10' : 'Plana 10' }, { value: 'martingale', label: 'Martingala' }]} />
      {out && (
        <Surface level={2}>
          <LineChart series={out.series} zero={1000} />
          <Row label={lang === 'en' ? 'Bankruptcies (reset to 1,000)' : 'Quiebras (reinicio a 1.000)'} value={`${out.busted}`} />
          <Row label={t('academy.result')} value={`${out.final - 1000 >= 0 ? '+' : ''}${out.final - 1000}`} />
          <Row label={t('academy.expected')} value={`${(-(10 * 1000) / 37).toFixed(0)} (flat)`} />
        </Surface>
      )}
      <Button title={`${t('academy.simulate')} · 1.000`} onPress={run} />
    </View>
  );
}

function CrashSim() {
  const { t } = useT();
  const { c } = useTheme();
  const [target, setTarget] = useState(2);
  const [out, setOut] = useState<{ rate: number; series: number[] } | null>(null);
  const run = () => {
    let wins = 0, bal = 0;
    const series = [0];
    for (let i = 0; i < 2000; i++) {
      const cp = crashPoint(secureRng);
      if (cp >= target) {
        wins++;
        bal += target - 1;
      } else bal -= 1;
      if (i % 20 === 0) series.push(bal);
    }
    setOut({ rate: wins / 2000, series });
  };
  return (
    <View style={{ gap: 12 }}>
      <T variant="footnote" color="text3">{t('play.target')}: {target.toFixed(1)}×</T>
      <Slider value={target} min={1.1} max={20} step={0.1} onChange={(v) => { setTarget(v); setOut(null); }} accessibilityLabel={t('play.target')} />
      <Surface level={2}>
        <Row label={t('academy.expected')} value={pct(0.99 / target, 2)} />
        {out && <Row label={`${t('academy.observed')} (2.000)`} value={pct(out.rate, 2)} tint={c.info} />}
        {out && <LineChart series={out.series} zero={0} />}
      </Surface>
      <Button title={t('academy.simulate')} onPress={run} />
    </View>
  );
}

function HiloTrainer() {
  const { t, lang } = useT();
  const { c } = useTheme();
  const [card, setCard] = useState<Card>(() => drawCard(secureRng));
  const [guess, setGuess] = useState(50);
  const [shown, setShown] = useState(false);
  const g: HiloGuess = legalGuesses(card)[0];
  const p = guessProbability(card, g);
  return (
    <View style={{ gap: 12, alignItems: 'stretch' }}>
      <View style={{ alignItems: 'center' }}><PlayingCard key={`${card.rank}${card.suit}`} card={card} size="lg" /></View>
      <T variant="callout" align="center">{lang === 'en' ? 'Chance of' : 'Probabilidad de'} “{t(`play.${g}`)}”?</T>
      <T variant="display" align="center" tabular>{guess} %</T>
      <Slider value={guess} min={0} max={100} onChange={(v) => { setGuess(v); setShown(false); }} accessibilityLabel={t('play.probability')} />
      {shown && (
        <Surface level={2}>
          <Row label={t('academy.expected')} value={pct(p)} tint={Math.abs(p * 100 - guess) <= 5 ? c.win : c.loss} />
          <Row label={t('common.multiplier')} value={`${(0.99 / p).toFixed(2)}×`} />
        </Surface>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={t('common.verify')} kind="secondary" onPress={() => setShown(true)} style={{ flex: 1 }} />
        <Button title={t('common.next')} onPress={() => { setCard(drawCard(secureRng)); setShown(false); }} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function PlinkoSim() {
  const { t } = useT();
  const [rows, setRows] = useState(12);
  const [counts, setCounts] = useState<number[] | null>(null);
  const run = () => {
    const ct = new Array(rows + 1).fill(0);
    for (let i = 0; i < 10000; i++) ct[dropBall(secureRng, rows).bin]++;
    setCounts(ct);
  };
  const expected = Array.from({ length: rows + 1 }, (_, i) => binProbability(rows, i) * 10000);
  return (
    <View style={{ gap: 12 }}>
      <T variant="footnote" color="text3">{t('play.rows')}: {rows}</T>
      <Slider value={rows} min={8} max={16} onChange={(v) => { setRows(v); setCounts(null); }} accessibilityLabel={t('play.rows')} />
      <Surface level={2}>
        <Bars values={counts ?? expected} compare={counts ? expected : undefined} />
        <T variant="footnote" color="text3">{counts ? `${t('academy.observed')} (10.000) · ${t('academy.expected')} ─` : t('academy.expected')}</T>
      </Surface>
      <Button title={t('academy.simulate')} onPress={run} />
    </View>
  );
}

function DiceSim() {
  const { t, lang } = useT();
  const [chance, setChance] = useState(50);
  const [out, setOut] = useState<{ series: number[]; longestLoss: number; wins: number } | null>(null);
  const run = () => {
    let bal = 0, streak = 0, longest = 0, wins = 0;
    const series = [0];
    const mult = 0.99 / (chance / 100);
    for (let i = 0; i < 1000; i++) {
      const won = rollDice(secureRng) < chance;
      if (won) {
        wins++;
        streak = 0;
        bal += mult - 1;
      } else {
        bal -= 1;
        streak++;
        longest = Math.max(longest, streak);
      }
      if (i % 10 === 0) series.push(bal);
    }
    setOut({ series, longestLoss: longest, wins });
  };
  return (
    <View style={{ gap: 12 }}>
      <T variant="footnote" color="text3">{t('play.winChance')}: {chance} %</T>
      <Slider value={chance} min={2} max={95} onChange={(v) => { setChance(v); setOut(null); }} accessibilityLabel={t('play.winChance')} />
      {out && (
        <Surface level={2}>
          <LineChart series={out.series} zero={0} />
          <Row label={t('common.wins')} value={`${out.wins} / 1.000`} />
          <Row label={lang === 'en' ? 'Longest losing streak' : 'Racha perdedora más larga'} value={`${out.longestLoss}`} />
        </Surface>
      )}
      <Button title={`${t('academy.simulate')} · 1.000`} onPress={run} />
    </View>
  );
}

export const SIM_COMPONENTS: Record<string, React.ComponentType> = {
  'bj-trainer': BlackjackTrainer,
  'poker-equity': PokerEquity,
  'mines-sim': MinesSim,
  'roulette-sim': RouletteSim,
  'crash-sim': CrashSim,
  'hilo-trainer': HiloTrainer,
  'plinko-sim': PlinkoSim,
  'dice-sim': DiceSim,
};
