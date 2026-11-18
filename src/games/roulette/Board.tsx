import React, { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { ClipPath, Defs, G, LinearGradient as SvgLinear, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { CasinoChip, PressableScale, T } from '@/design/components';
import { useT } from '@/i18n';
import { CALL_BETS, WHEEL_ORDER, betKey, callChips, coveredNumbers, pocketColor, type CallBet, type PlacedBet, type RouletteBet } from '@/engine/games/roulette.ts';

const GOLD = '#E8B84A';
const short = (v: number) => (v >= 1000 ? `${v % 1000 === 0 ? v / 1000 : (v / 1000).toFixed(1)}k` : `${v}`);
const tile = (n: number): [string, string] => (pocketColor(n) === 'red' ? ['#FF5A6E', '#A80F2C'] : pocketColor(n) === 'black' ? ['#3A3048', '#0C0812'] : ['#2BE09A', '#0B7A4A']);
const CHIP = '#FFB938';

/* ================================================================== table geometry */

/**
 * The layout is drawn in "grid units": `a` runs along the twelve rows of three (0…12) and `b` across them
 * (0…3, b = 0 holds 1, 4, 7…). Phones draw it standing up (a goes down), computers lying down (a goes right),
 * with the zero before a = 0, the 2:1 columns after a = 12 and the dozens and even-money bets outside b = 0.
 */
interface Geo { vertical: boolean; ox: number; oy: number; ua: number; ub: number; aMin: number; bMin: number; bMax: number; W: number; H: number }
const ZERO = 0.95, COLS = 0.95;
function makeGeo(W: number, H: number, vertical: boolean): Geo {
  const aMin = -ZERO, aMax = 12 + COLS;
  const band = vertical ? 0.62 : 0.78;
  const bMin = -2 * band, bMax = 3;
  if (vertical) {
    let ub = W / (bMax - bMin);
    let ua = H / (aMax - aMin);
    ua = Math.min(ua, ub * 0.62);
    ub = Math.min(ub, ua * 3.2);
    const w = ub * (bMax - bMin), h = ua * (aMax - aMin);
    return { vertical, ox: (W - w) / 2, oy: (H - h) / 2, ua, ub, aMin, bMin, bMax, W: w, H: h };
  }
  let ua = W / (aMax - aMin);
  let ub = H / (bMax - bMin);
  ub = Math.min(ub, ua * 1.25);
  ua = Math.min(ua, ub * 1.15);
  const w = ua * (aMax - aMin), h = ub * (bMax - bMin);
  return { vertical, ox: (W - w) / 2, oy: (H - h) / 2, ua, ub, aMin, bMin, bMax, W: w, H: h };
}
/** Box for a label inside an outside-bet cell: standing up on phones (turned a quarter), flat on computers. */
const turned = (vertical: boolean, r: { width: number; height: number }) =>
  vertical
    ? { position: 'absolute' as const, width: r.height - 6, height: r.width - 4, left: (r.width - (r.height - 6)) / 2, top: (r.height - (r.width - 4)) / 2, alignItems: 'center' as const, justifyContent: 'center' as const, transform: [{ rotate: '-90deg' }] }
    : { alignItems: 'center' as const, justifyContent: 'center' as const };

/** Grid point → pixels. */
function px(g: Geo, a: number, b: number) {
  return g.vertical ? { x: g.ox + (b - g.bMin) * g.ub, y: g.oy + (a - g.aMin) * g.ua } : { x: g.ox + (a - g.aMin) * g.ua, y: g.oy + (g.bMax - b) * g.ub };
}
/** Grid rectangle → pixel rectangle. */
function rect(g: Geo, a0: number, a1: number, b0: number, b1: number) {
  const p = px(g, a0, b0), q = px(g, a1, b1);
  return { left: Math.min(p.x, q.x), top: Math.min(p.y, q.y), width: Math.abs(q.x - p.x), height: Math.abs(q.y - p.y) };
}
const cellOf = (n: number) => ({ a: Math.floor((n - 1) / 3), b: (n - 1) % 3 });
const numAt = (a: number, b: number) => 3 * a + b + 1;

/** Where a tap on the numbers falls: a number, or the line / corner between numbers (split, corner, street…). */
function betAt(a: number, b: number): RouletteBet | null {
  if (a < 0 || a >= 12 || b < 0 || b >= 3) return null;
  const ia = Math.floor(a), ib = Math.floor(b);
  const fa = a - ia, fb = b - ib;
  const e = 0.24;
  const da = fa < e ? -1 : fa > 1 - e ? 1 : 0;
  const db = fb < e ? -1 : fb > 1 - e ? 1 : 0;
  const n = numAt(ia, ib);
  // towards the zero
  if (da === -1 && ia === 0) {
    if (db === -1 && ib > 0) return { kind: 'trio', numbers: [0, numAt(0, ib - 1), n] as [number, number, number] };
    if (db === 1 && ib < 2) return { kind: 'trio', numbers: [0, n, numAt(0, ib + 1)] as [number, number, number] };
    return { kind: 'split', numbers: [0, n] };
  }
  const na = ia + da;
  const okA = da !== 0 && na >= 0 && na < 12;
  // the outside edge (b = 0 side): streets and six-lines
  if (db === -1 && ib === 0) {
    if (okA) return { kind: 'line', row: Math.min(ia, na) + 1 };
    return { kind: 'street', row: ia + 1 };
  }
  const nb = ib + db;
  const okB = db !== 0 && nb >= 0 && nb < 3;
  if (okA && okB) return { kind: 'corner', numbers: [numAt(ia, ib), numAt(na, ib), numAt(ia, nb), numAt(na, nb)].sort((x, y) => x - y) as [number, number, number, number] };
  if (okA) return { kind: 'split', numbers: [n, numAt(na, ib)].sort((x, y) => x - y) as [number, number] };
  if (okB) return { kind: 'split', numbers: [n, numAt(ia, nb)].sort((x, y) => x - y) as [number, number] };
  return { kind: 'straight', numbers: [n] };
}

const EVEN: { bet: RouletteBet; label: string; colors?: [string, string] }[] = [
  { bet: { kind: 'low' }, label: '1-18' },
  { bet: { kind: 'even' }, label: 'even' },
  { bet: { kind: 'red' }, label: 'red', colors: ['#FF5A6E', '#A80F2C'] },
  { bet: { kind: 'black' }, label: 'black', colors: ['#3A3048', '#0C0812'] },
  { bet: { kind: 'odd' }, label: 'odd' },
  { bet: { kind: 'high' }, label: '19-36' },
];

/** Grid point where the chips of a bet sit. */
function anchor(g: Geo, bet: RouletteBet): { x: number; y: number } {
  const band = -g.bMin / 2;
  switch (bet.kind) {
    case 'straight': {
      const n = bet.numbers[0];
      if (n === 0) return px(g, -ZERO / 2, 1.5);
      const c = cellOf(n);
      return px(g, c.a + 0.5, c.b + 0.5);
    }
    case 'split': {
      const [x, y] = [...bet.numbers].sort((p, q) => p - q);
      if (x === 0) return px(g, 0, cellOf(y).b + 0.5);
      const cx = cellOf(x), cy = cellOf(y);
      return cx.a === cy.a ? px(g, cx.a + 0.5, cy.b) : px(g, cy.a, cx.b + 0.5);
    }
    case 'trio': return px(g, 0, bet.numbers.includes(1) ? 1 : 2);
    case 'street': return px(g, bet.row - 0.5, 0);
    case 'line': return px(g, bet.row, 0);
    case 'corner': {
      const c = cellOf(Math.min(...bet.numbers));
      return px(g, c.a + 1, c.b + 1);
    }
    case 'column': return px(g, 12 + COLS / 2, bet.column - 0.5);
    case 'dozen': return px(g, 4 * (bet.dozen - 1) + 2, -band / 2);
    default: {
      const i = EVEN.findIndex((e) => e.bet.kind === bet.kind);
      return px(g, 2 * i + 1, -band * 1.5);
    }
  }
}

export interface BoardProps {
  w: number;
  h: number;
  vertical: boolean;
  bets: Record<string, PlacedBet>;
  /** Bets already accepted (live tables): drawn with a gold ring. */
  confirmed?: Record<string, PlacedBet>;
  chip: number;
  onAdd: (list: PlacedBet[]) => void;
  last?: number | null;
  disabled?: boolean;
}

/** The full layout, unfolding number by number. Tap a number, a line between numbers, a corner, or an outside box. */
export function TableBoard({ w, h, vertical, bets, confirmed, chip, onAdd, last, disabled }: BoardProps) {
  const { t } = useT();
  const g = useMemo(() => makeGeo(w, h, vertical), [w, h, vertical]);
  const band = -g.bMin / 2;
  const fs = Math.max(11, Math.min(g.ua, g.ub) * (vertical ? 0.52 : 0.42));
  const add = (bet: RouletteBet) => !disabled && onAdd([{ bet, amount: chip }]);
  const gridRef = useRef<React.ComponentRef<typeof View>>(null);
  const tapNumbers = (e: GestureResponderEvent) => {
    // page coordinates work the same on phones and in browsers; the grid's own position is measured on tap
    const { pageX, pageY } = e.nativeEvent;
    gridRef.current?.measure((_x: number, _y: number, _w: number, _h: number, left: number, top: number) => {
      const r = rect(g, 0, 12, 0, 3);
      const x = r.left + pageX - left, y = r.top + pageY - top;
      const a = g.vertical ? (y - g.oy) / g.ua + g.aMin : (x - g.ox) / g.ua + g.aMin;
      const b = g.vertical ? (x - g.ox) / g.ub + g.bMin : g.bMax - (y - g.oy) / g.ub;
      if (!Number.isFinite(a) || !Number.isFinite(b)) return;
      const bet = betAt(Math.min(11.999, Math.max(0, a)), Math.min(2.999, Math.max(0, b)));
      if (bet) add(bet);
    });
  };
  const numbersRect = rect(g, 0, 12, 0, 3);
  const chipSize = Math.max(18, Math.min(g.ua, g.ub) * 0.74);
  const chips = [...Object.entries(confirmed ?? {}).map(([k, v]) => ({ k: `c${k}`, v, done: true })), ...Object.entries(bets).map(([k, v]) => ({ k, v, done: false }))];
  return (
    <View style={{ width: w, height: h }}>
      {/* the cloth */}
      <View style={[styles.cloth, rect(g, g.aMin - 0.12, 12 + COLS + 0.12, g.bMin - 0.12, 3.12)]}>
        <LinearGradient colors={['#5A0E1A', '#2A0610']} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(255,190,90,0.18)', 'rgba(255,190,90,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.7 }} style={StyleSheet.absoluteFill} />
      </View>
      {/* zero */}
      <PressableScale onPress={() => add({ kind: 'straight', numbers: [0] })} disabled={disabled} feedback="none" scaleTo={0.96} accessibilityLabel="0" style={[styles.cell, rect(g, -ZERO, 0, 0, 3), { borderTopLeftRadius: vertical ? 14 : 30, borderTopRightRadius: 14, borderBottomLeftRadius: vertical ? 4 : 30 }]}>
        <Animated.View entering={ZoomIn.duration(240)} style={[styles.numTile, { borderRadius: 12 }]}>
          <LinearGradient colors={tile(0)} style={StyleSheet.absoluteFill} />
          <T weight="display" style={{ color: '#fff', fontSize: fs * 1.1 }}>0</T>
        </Animated.View>
        {last === 0 ? <View pointerEvents="none" style={styles.lastRing} /> : null}
      </PressableScale>
      {/* 1…36: one pressable for the whole grid, so the lines and corners between numbers can be hit too */}
      <Pressable ref={gridRef} onPress={tapNumbers} disabled={disabled} accessibilityRole="button" accessibilityLabel={t('play.rl.tapGrid')} style={[styles.abs, numbersRect]}>
        {Array.from({ length: 36 }, (_, i) => {
          const n = i + 1;
          const c = cellOf(n);
          const r = rect(g, c.a, c.a + 1, c.b, c.b + 1);
          return (
            <View key={n} pointerEvents="none" style={[styles.cell, styles.abs, { left: r.left - numbersRect.left, top: r.top - numbersRect.top, width: r.width, height: r.height }]}>
              <Animated.View entering={ZoomIn.delay(40 + c.a * 22 + c.b * 8).duration(220)} style={[styles.numTile, { borderRadius: Math.min(r.width, r.height) * 0.28 }]}>
                <LinearGradient colors={tile(n)} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.55 }} style={StyleSheet.absoluteFill} />
                <T weight="display" tabular style={{ color: '#fff', fontSize: fs, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 2 }}>{n}</T>
              </Animated.View>
              {last === n ? <View pointerEvents="none" style={styles.lastRing} /> : null}
            </View>
          );
        })}
      </Pressable>
      {/* 2:1 columns */}
      {([1, 2, 3] as const).map((col) => (
        <PressableScale key={`c${col}`} onPress={() => add({ kind: 'column', column: col })} disabled={disabled} feedback="none" scaleTo={0.95} accessibilityLabel={`2:1 · ${col}`} style={[styles.cell, styles.out, rect(g, 12, 12 + COLS, col - 1, col)]}>
          <Animated.View entering={FadeIn.delay(320)}><T weight="display" style={{ color: GOLD, fontSize: fs * 0.82 }}>2:1</T></Animated.View>
        </PressableScale>
      ))}
      {/* dozens */}
      {([1, 2, 3] as const).map((d) => {
        const r = rect(g, 4 * (d - 1), 4 * d, -band, 0);
        return (
          <PressableScale key={`d${d}`} onPress={() => add({ kind: 'dozen', dozen: d })} disabled={disabled} feedback="none" scaleTo={0.97} accessibilityLabel={`${d} · 12`} style={[styles.cell, styles.out, r]}>
            <Animated.View entering={FadeIn.delay(360)} style={turned(vertical, r)}>
              <T weight="display" numberOfLines={1} style={{ color: '#FFF3D6', fontSize: fs * 0.82 }}>{`${d}ª 12`}</T>
            </Animated.View>
          </PressableScale>
        );
      })}
      {/* even-money bets */}
      {EVEN.map((e, i) => {
        const r = rect(g, 2 * i, 2 * i + 2, -2 * band, -band);
        const label = /\d/.test(e.label) ? e.label : t(`play.rl.${e.label}`);
        return (
          <PressableScale key={e.label} onPress={() => add(e.bet)} disabled={disabled} feedback="none" scaleTo={0.97} accessibilityLabel={label} style={[styles.cell, styles.out, r]}>
            <Animated.View entering={FadeIn.delay(400)} style={turned(vertical, r)}>
              {e.colors ? (
                <View style={[styles.diamond, { width: fs * 1.25, height: fs * 1.25 }]}>
                  <LinearGradient colors={e.colors} style={StyleSheet.absoluteFill} />
                </View>
              ) : (
                <T weight="display" numberOfLines={1} adjustsFontSizeToFit style={{ color: '#FFF3D6', fontSize: fs * 0.78 }}>{label}</T>
              )}
            </Animated.View>
          </PressableScale>
        );
      })}
      {/* the chips on the layout */}
      {chips.map(({ k, v, done }) => {
        const p = anchor(g, v.bet);
        return (
          <Animated.View key={k} entering={ZoomIn.springify().damping(12)} pointerEvents="none" style={[styles.abs, { left: p.x - chipSize / 2, top: p.y - chipSize / 2 }, done && styles.done]}>
            <CasinoChip size={chipSize} color={done ? '#12C08A' : CHIP} label={short(v.amount)} />
          </Animated.View>
        );
      })}
    </View>
  );
}

/* ================================================================== racetrack */

const SECTIONS: { id: CallBet; colors: [string, string] }[] = [
  { id: 'tiers', colors: ['#3A1FA8', '#1A0A5A'] },
  { id: 'orphelins', colors: ['#0B7A6A', '#063A34'] },
  { id: 'voisins', colors: ['#B8401A', '#5A1206'] },
  { id: 'zero', colors: ['#FFB938', '#C86A00'] },
];

/** Stadium-shaped track of the wheel's numbers (like the "racetrack" of a real table) with the sections inside. */
export function RaceTrack({ w, h, vertical, chip, onAdd, k, disabled, bets }: { w: number; h: number; vertical: boolean; chip: number; onAdd: (list: PlacedBet[], label: string) => void; k: number; disabled?: boolean; bets: Record<string, PlacedBet> }) {
  const { t } = useT();
  // everything is laid out lying down (long side L, short side Sd) and turned upright for phones
  const L = vertical ? h : w, Sd = vertical ? w : h;
  const r = Sd / 2 - 2;
  const straight = Math.max(10, L - 2 * r - 4);
  const thick = Math.min(r * 0.44, Math.max(26, ((2 * straight + 2 * Math.PI * r) / 37) * 1.05));
  const rm = r - thick / 2; // middle line of the track
  const cx0 = L / 2 - straight / 2, cx1 = L / 2 + straight / 2, cy = Sd / 2;
  const perM = 2 * straight + 2 * Math.PI * rm;
  const cell = perM / 37;
  const rot = (p: { x: number; y: number }) => (vertical ? { x: Sd - p.y, y: p.x } : p);
  /** Point on the middle line at wheel index i (0 = right-hand end, then clockwise: along the bottom first). */
  const at = (i: number) => {
    let d = ((((i / 37) % 1) + 1) % 1) * perM;
    const arc = Math.PI * rm;
    if (d < arc / 2) return { x: cx1 + rm * Math.cos(d / rm), y: cy + rm * Math.sin(d / rm) };
    if ((d -= arc / 2) < straight) return { x: cx1 - d, y: cy + rm };
    if ((d -= straight) < arc) return { x: cx0 + rm * Math.cos(Math.PI / 2 + d / rm), y: cy + rm * Math.sin(Math.PI / 2 + d / rm) };
    if ((d -= arc) < straight) return { x: cx0 + d, y: cy - rm };
    d -= straight;
    return { x: cx1 + rm * Math.cos(-Math.PI / 2 + d / rm), y: cy + rm * Math.sin(-Math.PI / 2 + d / rm) };
  };
  const poly = (pts: { x: number; y: number }[]) => pts.map((p, j) => { const q = rot(p); return `${j ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join(' ') + ' Z';
  const stadium = (rr: number) => {
    const a = rot({ x: cx0, y: cy - rr }), b = rot({ x: cx1, y: cy - rr }), c = rot({ x: cx1, y: cy + rr }), d = rot({ x: cx0, y: cy + rr });
    return `M${a.x} ${a.y} L${b.x} ${b.y} A${rr} ${rr} 0 0 1 ${c.x} ${c.y} L${d.x} ${d.y} A${rr} ${rr} 0 0 1 ${a.x} ${a.y} Z`;
  };
  const insetR = r - thick - 2;
  // section borders, as wheel indices: tiers 11…22 · orphelins 8…10 and 23…27 · voisins 28…36, 0…7 · jeu zéro 33…36, 0…3
  const aTop = at(22.5), aBot = at(10.5), bTop = at(27.5), bBot = at(7.5);
  const zc = { x: cx1 + insetR * 0.18, y: cy };
  const zr = { x: insetR * 0.72, y: insetR * 0.66 };
  const regions: Record<Exclude<CallBet, 'zero'>, string> = {
    tiers: poly([{ x: 0, y: 0 }, aTop, aBot, { x: 0, y: Sd }]),
    orphelins: poly([aTop, bTop, bBot, aBot]),
    voisins: poly([bTop, { x: L, y: 0 }, { x: L, y: Sd }, bBot]),
  };
  const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const aMid = mid(aTop, aBot), bMid = mid(bTop, bBot);
  const labels: Record<CallBet, { x: number; y: number }> = {
    tiers: rot({ x: (cx0 - insetR * 0.6 + aMid.x) / 2, y: cy }),
    orphelins: rot({ x: (aMid.x + bMid.x) / 2, y: cy }),
    voisins: rot({ x: (bMid.x + zc.x - zr.x) / 2, y: cy }),
    zero: rot(zc),
  };
  const press = (c: CallBet) => !disabled && onAdd(CALL_BETS[c].map((x) => ({ bet: x.bet, amount: chip * x.chips })), t(`play.rl.${c === 'zero' ? 'zeroGame' : c}`));
  const pressNumber = (n: number) => {
    if (disabled) return;
    const i = (WHEEL_ORDER as readonly number[]).indexOf(n);
    const list = Array.from({ length: 2 * k + 1 }, (_, j) => WHEEL_ORDER[(i - k + j + 37) % 37]).map((m) => ({ bet: { kind: 'straight', numbers: [m] } as RouletteBet, amount: chip }));
    onAdd(list, `${n} ±${k}`);
  };
  const W = vertical ? Sd : L, H = vertical ? L : Sd;
  const straightBets = new Set<number>();
  Object.values(bets).forEach((b) => b.bet.kind === 'straight' && straightBets.add(b.bet.numbers[0]));
  const zp = rot(zc);
  const fsz = Math.max(9.5, Math.min(15, Math.min(W, H) * 0.07));
  return (
    <Animated.View entering={FadeIn.duration(260)} style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgLinear id="rtk" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#5A0E1A" /><Stop offset="1" stopColor="#24050C" /></SvgLinear>
          <ClipPath id="rtf"><Path d={stadium(insetR)} /></ClipPath>
          {SECTIONS.map((x) => (
            <SvgLinear key={x.id} id={`rts${x.id}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={x.colors[0]} /><Stop offset="1" stopColor={x.colors[1]} /></SvgLinear>
          ))}
        </Defs>
        <Path d={stadium(r)} fill="url(#rtk)" stroke={GOLD} strokeWidth={2.4} />
        {/* the sections inside the track */}
        <G clipPath="url(#rtf)">
          <Path d={regions.tiers} fill="url(#rtstiers)" onPress={() => press('tiers')} />
          <Path d={regions.orphelins} fill="url(#rtsorphelins)" onPress={() => press('orphelins')} />
          <Path d={regions.voisins} fill="url(#rtsvoisins)" onPress={() => press('voisins')} />
          <Path d={`M${zp.x - (vertical ? zr.y : zr.x)} ${zp.y} a${vertical ? zr.y : zr.x} ${vertical ? zr.x : zr.y} 0 1 0 ${2 * (vertical ? zr.y : zr.x)} 0 a${vertical ? zr.y : zr.x} ${vertical ? zr.x : zr.y} 0 1 0 ${-2 * (vertical ? zr.y : zr.x)} 0`} fill="url(#rtszero)" stroke="#FFE58A" strokeWidth={1.6} onPress={() => press('zero')} />
          <Path d={poly([aTop, aBot])} stroke={GOLD} strokeWidth={1.4} />
          <Path d={poly([bTop, bBot])} stroke={GOLD} strokeWidth={1.4} />
        </G>
        <Path d={stadium(insetR)} fill="none" stroke={GOLD} strokeWidth={1.6} />
        {SECTIONS.map((x) => {
          const p = labels[x.id];
          return (
            <G key={x.id} onPress={() => press(x.id)}>
              <SvgText x={p.x} y={p.y - 1} fontSize={fsz} fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" textAnchor="middle" fill={x.id === 'zero' ? '#3A1400' : '#FFF3D6'}>{t(`play.rl.${x.id}Short`)}</SvgText>
              <SvgText x={p.x} y={p.y + fsz} fontSize={fsz * 0.72} fontWeight="700" fontFamily="Helvetica Neue, Arial, sans-serif" textAnchor="middle" fill={x.id === 'zero' ? '#5A2400' : 'rgba(255,243,214,0.8)'}>{`${callChips(x.id)} × ${short(chip)}`}</SvgText>
            </G>
          );
        })}
        {/* the numbers, in wheel order */}
        {WHEEL_ORDER.map((n, i) => {
          const p = rot(at(i));
          const c = tile(n);
          const sz = Math.min(cell * 0.9, thick * 0.84);
          const on = straightBets.has(n);
          return (
            <G key={n} onPress={() => pressNumber(n)}>
              <Rect x={p.x - sz / 2} y={p.y - sz / 2} width={sz} height={sz} rx={sz * 0.28} fill={c[1]} stroke={on ? '#FFE58A' : 'rgba(255,229,138,0.35)'} strokeWidth={on ? 2.6 : 1} />
              <Rect x={p.x - sz / 2 + 1.5} y={p.y - sz / 2 + 1.5} width={sz - 3} height={sz * 0.42} rx={sz * 0.22} fill="#FFFFFF" opacity={0.15} />
              <SvgText x={p.x} y={p.y + sz * 0.17} fontSize={sz * 0.46} fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" textAnchor="middle" fill="#FFFFFF">{n}</SvgText>
            </G>
          );
        })}
      </Svg>
    </Animated.View>
  );
}

/** Covered numbers of a bet (for labels). */
export const coverOf = (b: RouletteBet) => coveredNumbers(b);
export { betKey };

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  cloth: { position: 'absolute', borderRadius: 18, overflow: 'hidden', borderWidth: 2.5, borderColor: GOLD, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 18 },
  cell: { position: 'absolute', padding: 2, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(232,184,74,0.55)', alignItems: 'center', justifyContent: 'center' },
  out: { backgroundColor: 'rgba(0,0,0,0.12)' },
  numTile: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lastRing: { position: 'absolute', left: -1, top: -1, right: -1, bottom: -1, borderWidth: 3, borderColor: '#FFE58A', borderRadius: 8, shadowColor: '#FFE58A', shadowOpacity: 1, shadowRadius: 10 },
  diamond: { transform: [{ rotate: '45deg' }], borderWidth: 1.5, borderColor: '#FFF3D6', overflow: 'hidden' },
  done: { shadowColor: '#5BE3B0', shadowOpacity: 1, shadowRadius: 6 },
});
