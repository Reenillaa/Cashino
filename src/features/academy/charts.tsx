import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { T } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { motion } from '@/design/tokens';
import { fmtMult, fmtPct, type Lang, type ModelRow } from './models';

const EASE = Easing.bezier(...motion.easeEnter);

/** One row per outcome: label, a bar as long as its probability, the % and what it pays back. */
export function ProbBars({ rows, lang, tint, chanceLabel, returnsLabel }: { rows: ModelRow[]; lang: Lang; tint: string; chanceLabel: string; returnsLabel: string }) {
  const { c } = useTheme();
  const max = Math.max(...rows.map((r) => r.p));
  const showPay = rows.some((r) => r.mult !== null);
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.head}>
        <T variant="footnote" color="text3" style={{ flex: 1 }}>{chanceLabel}</T>
        {showPay ? <T variant="footnote" color="text3">{returnsLabel}</T> : null}
      </View>
      {rows.map((r, i) => (
        <Animated.View key={i} entering={FadeIn.duration(motion.slow).delay(i * 60).easing(EASE)} accessible accessibilityLabel={`${r.label}: ${fmtPct(lang, r.p)}${r.mult !== null ? `, ${fmtMult(lang, r.mult)}` : ''}`}>
          <View style={styles.rowTop}>
            <T variant="callout" weight="medium" style={{ flex: 1 }} numberOfLines={2}>{r.label}</T>
            {r.mult !== null ? (
              <View style={[styles.pay, { backgroundColor: r.mult >= 1 ? alpha(c.win, 0.14) : c.surface3 }]}>
                <T variant="footnote" weight="semibold" tabular color={r.mult >= 1 ? 'win' : 'text2'}>{fmtMult(lang, r.mult)}</T>
              </View>
            ) : null}
          </View>
          <View style={styles.barRow}>
            <View style={[styles.track, { backgroundColor: c.surface3 }]}>
              <View style={[styles.fill, { width: `${Math.max(2, (r.p / max) * 100)}%`, backgroundColor: tint }]} />
            </View>
            <T variant="footnote" weight="semibold" tabular style={{ width: 64, textAlign: 'right' }}>{fmtPct(lang, r.p)}</T>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/** "For every 100 chips": a 10 × 10 grid of chips, green ones come back, grey ones stay with the house. */
export function HundredChips({ rtp }: { rtp: number }) {
  const { c } = useTheme();
  const back = Math.round(rtp * 100);
  return (
    <View style={styles.hundred} accessible accessibilityLabel={`${back} / 100`}>
      {Array.from({ length: 100 }, (_, i) => (
        <View key={i} style={[styles.chip, { backgroundColor: i < back ? c.win : c.surface3 }]} />
      ))}
    </View>
  );
}

/** Vertical distribution (e.g. Plinko bins) with the multiplier under each bar. */
export function DistBars({ bins, lang, tint }: { bins: { label: string; p: number; mult: number }[]; lang: Lang; tint: string }) {
  const { c } = useTheme();
  const w = 320, h = 150, pad = 18;
  const max = Math.max(...bins.map((b) => b.p));
  const bw = w / bins.length;
  return (
    <Svg width="100%" height={h + 34} viewBox={`0 0 ${w} ${h + 34}`}>
      {bins.map((b, i) => {
        const bh = Math.max(2, (b.p / max) * (h - pad));
        return (
          <React.Fragment key={i}>
            <Rect x={i * bw + 2} y={h - bh} width={bw - 4} height={bh} rx={4} fill={b.mult >= 1 ? tint : c.surface3} />
            <SvgText x={i * bw + bw / 2} y={h + 14} fontSize={8.5} fill={b.mult >= 1 ? c.win : c.text3} textAnchor="middle">{`${b.mult}`}</SvgText>
            {b.p >= max * 0.6 ? <SvgText x={i * bw + bw / 2} y={h - bh - 4} fontSize={8} fill={c.text2} textAnchor="middle">{fmtPct(lang, b.p).replace(' ', '')}</SvgText> : null}
          </React.Fragment>
        );
      })}
      <SvgText x={w / 2} y={h + 30} fontSize={9} fill={c.text3} textAnchor="middle">× {lang === 'es' ? 'lo que paga cada casilla' : 'what each bin pays'}</SvgText>
    </Svg>
  );
}

/** Several players' running result, the break-even line and the theoretical drift (dashed). */
export function PathsChart({ paths, theory, zeroLabel, theoryLabel }: { paths: number[][]; theory: number; zeroLabel: string; theoryLabel: string }) {
  const { c } = useTheme();
  const w = 320, h = 190, left = 44, top = 10, bottom = 18;
  const all = paths.flat().concat([0, theory]);
  const min = Math.min(...all), max = Math.max(...all);
  const span = Math.max(1, max - min);
  const n = Math.max(...paths.map((p) => p.length)) - 1;
  const x = (i: number) => left + (i / Math.max(1, n)) * (w - left - 6);
  const y = (v: number) => top + (1 - (v - min) / span) * (h - top - bottom);
  const colors = ['#FFFFFF', '#C7B9FF', '#8EE3C0', '#FFD38A', '#FF9F94'];
  const fmt = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString('es-ES')}`;
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <Line x1={left} x2={w - 6} y1={y(0)} y2={y(0)} stroke={c.text3} strokeWidth={1} />
      <SvgText x={left - 6} y={y(0) + 3} fontSize={9} fill={c.text3} textAnchor="end">0</SvgText>
      <SvgText x={left - 6} y={top + 8} fontSize={9} fill={c.text3} textAnchor="end">{fmt(max)}</SvgText>
      <SvgText x={left - 6} y={h - bottom} fontSize={9} fill={c.text3} textAnchor="end">{fmt(min)}</SvgText>
      {paths.slice(1).map((p, k) => (
        <Polyline key={k} points={p.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colors[(k + 1) % colors.length]} strokeOpacity={0.55} strokeWidth={1.4} />
      ))}
      {paths[0] ? <Polyline points={paths[0].map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colors[0]} strokeWidth={2.2} /> : null}
      <Line x1={x(0)} y1={y(0)} x2={x(n)} y2={y(theory)} stroke={c.warn} strokeWidth={2} strokeDasharray="5 5" />
      <SvgText x={w - 8} y={Math.min(h - 4, y(theory) + (theory < 0 ? 14 : -6))} fontSize={9} fill={c.warn} textAnchor="end">{theoryLabel}</SvgText>
      <SvgText x={left + 4} y={y(0) - 4} fontSize={9} fill={c.text3}>{zeroLabel}</SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pay: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  hundred: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, width: 10 * 18 + 9 * 5 },
  chip: { width: 18, height: 18, borderRadius: 9 },
});
