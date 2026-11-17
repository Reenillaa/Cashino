import React from 'react';
import { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

/**
 * Drawing kit for the slot symbols (100×100 artboards): the same recipe a game-icon illustrator uses —
 * a dark outline, a light-to-dark body gradient, a shaded side, a glossy highlight, a specular glint and a
 * soft cast shadow — so every symbol reads as one family.
 */
export const vg = (id: string, stops: string[]) => (
  <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    {stops.map((c, i) => <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />)}
  </LinearGradient>
);
export const dg = (id: string, stops: string[], x1 = '0', y1 = '0', x2 = '1', y2 = '1') => (
  <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
    {stops.map((c, i) => <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />)}
  </LinearGradient>
);
export const rg = (id: string, stops: string[], cx = '0.38', cy = '0.32', r = '0.75') => (
  <RadialGradient id={id} cx={cx} cy={cy} r={r}>
    {stops.map((c, i) => <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />)}
  </RadialGradient>
);
/** Outline props: thick, round joins, in the dark tone of the piece. */
export const ol = (c: string, w = 3) => ({ stroke: c, strokeWidth: w, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });

/** Soft cast shadow under a symbol. */
export function Shadow({ cx = 50, cy = 91, rx = 30, ry = 5 }: { cx?: number; cy?: number; rx?: number; ry?: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000000" opacity={0.18} />
      <Ellipse cx={cx} cy={cy} rx={rx * 0.66} ry={ry * 0.66} fill="#000000" opacity={0.22} />
    </G>
  );
}

/** Four-point glint. */
export function Glint({ x, y, s = 1, o = 0.95 }: { x: number; y: number; s?: number; o?: number }) {
  return <Path d={`M${x} ${y - 7 * s} Q${x + 1.2 * s} ${y - 1.2 * s} ${x + 7 * s} ${y} Q${x + 1.2 * s} ${y + 1.2 * s} ${x} ${y + 7 * s} Q${x - 1.2 * s} ${y + 1.2 * s} ${x - 7 * s} ${y} Q${x - 1.2 * s} ${y - 1.2 * s} ${x} ${y - 7 * s} Z`} fill="#FFFFFF" opacity={o} />;
}

/** Outlined game text (dark stroke drawn under a gradient fill). */
export function GameText({ x, y, text, size, fill, stroke, sw = 3, anchor = 'middle', ls = 0 }: { x: number; y: number; text: string; size: number; fill: string; stroke: string; sw?: number; anchor?: 'middle' | 'start' | 'end'; ls?: number }) {
  return (
    <G>
      <SvgText x={x} y={y + 1.5} fontSize={size} fontWeight="900" fontFamily="Arial Black, Helvetica Neue, Arial, sans-serif" textAnchor={anchor} letterSpacing={ls} fill={stroke} stroke={stroke} strokeWidth={sw} strokeLinejoin="round">{text}</SvgText>
      <SvgText x={x} y={y} fontSize={size} fontWeight="900" fontFamily="Arial Black, Helvetica Neue, Arial, sans-serif" textAnchor={anchor} letterSpacing={ls} fill={stroke} stroke={stroke} strokeWidth={sw} strokeLinejoin="round">{text}</SvgText>
      <SvgText x={x} y={y} fontSize={size} fontWeight="900" fontFamily="Arial Black, Helvetica Neue, Arial, sans-serif" textAnchor={anchor} letterSpacing={ls} fill={fill}>{text}</SvgText>
    </G>
  );
}

/** A folded ribbon banner (WILD, FREE…). */
export function Ribbon({ id, text, colors, dark, y = 84, w = 70 }: { id: string; text: string; colors: [string, string]; dark: string; y?: number; w?: number }) {
  const x0 = 50 - w / 2, x1 = 50 + w / 2;
  return (
    <G>
      <Defs>{vg(`${id}rb`, [colors[0], colors[1]])}</Defs>
      {/* tails */}
      <Path d={`M${x0 + 4} ${y - 3} L${x0 - 8} ${y - 1} L${x0 - 3} ${y + 5} L${x0 - 8} ${y + 11} L${x0 + 6} ${y + 11} Z`} fill={dark} {...ol(dark, 1.5)} />
      <Path d={`M${x1 - 4} ${y - 3} L${x1 + 8} ${y - 1} L${x1 + 3} ${y + 5} L${x1 + 8} ${y + 11} L${x1 - 6} ${y + 11} Z`} fill={dark} {...ol(dark, 1.5)} />
      {/* band, slightly arched */}
      <Path d={`M${x0} ${y - 8} Q50 ${y - 12} ${x1} ${y - 8} L${x1} ${y + 7} Q50 ${y + 3} ${x0} ${y + 7} Z`} fill={`url(#${id}rb)`} {...ol(dark, 2.2)} />
      <Path d={`M${x0 + 3} ${y - 5.5} Q50 ${y - 9.5} ${x1 - 3} ${y - 5.5}`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.6} fill="none" />
      <GameText x={50} y={y + 3.5} text={text} size={12} fill="#FFFFFF" stroke={dark} sw={2.6} ls={1} />
    </G>
  );
}

/** A small embossed plaque for values (fish, nuggets). */
export function Plaque({ id, text, colors, dark, y = 84, w }: { id: string; text: string; colors: [string, string]; dark: string; y?: number; w?: number }) {
  const width = w ?? Math.max(40, text.length * 8 + 14);
  return (
    <G>
      <Defs>{vg(`${id}pq`, [colors[0], colors[1]])}</Defs>
      <Path d={`M${50 - width / 2 + 6} ${y - 9} L${50 + width / 2 - 6} ${y - 9} Q${50 + width / 2} ${y - 9} ${50 + width / 2} ${y - 3} L${50 + width / 2} ${y + 3} Q${50 + width / 2} ${y + 9} ${50 + width / 2 - 6} ${y + 9} L${50 - width / 2 + 6} ${y + 9} Q${50 - width / 2} ${y + 9} ${50 - width / 2} ${y + 3} L${50 - width / 2} ${y - 3} Q${50 - width / 2} ${y - 9} ${50 - width / 2 + 6} ${y - 9} Z`} fill={`url(#${id}pq)`} {...ol(dark, 2.2)} />
      <Path d={`M${50 - width / 2 + 5} ${y - 6} L${50 + width / 2 - 5} ${y - 6}`} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.5} />
      <GameText x={50} y={y + 4.5} text={text} size={text.length > 5 ? 11 : 13} fill="#FFFFFF" stroke={dark} sw={2.4} />
    </G>
  );
}

/** Glossy highlight blob (top-left light). */
export function Gloss({ d, o = 0.55 }: { d: string; o?: number }) {
  return <Path d={d} fill="#FFFFFF" opacity={o} />;
}
