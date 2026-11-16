import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { RED_NUMBERS, WHEEL_ORDER } from '@/engine/games/roulette.ts';

const SEG = 360 / 37;
const POCKET = { red: ['#F0405E', '#9A1028'], black: ['#2A2236', '#0C0812'], green: ['#22D88E', '#0B7A4A'] } as const;
const kind = (n: number) => (n === 0 ? 'green' : RED_NUMBERS.has(n) ? 'red' : 'black');

/**
 * A detailed European wheel: wooden bowl with a gold rim, polished ball track with diamond deflectors,
 * the number ring, the pocket cups with silver frets, a wooden cone and the gold turret with its handles.
 * `onPocket` makes every pocket tappable; `overlay(n, x, y)` draws something on a pocket (bet chips).
 */
export const RouletteWheelArt = React.memo(function RouletteWheelArt({ size, id = 'rw', onPocket, overlay }: { size: number; id?: string; onPocket?: (n: number) => void; overlay?: (n: number, x: number, y: number) => React.ReactNode }) {
  const r = size / 2;
  const R = (k: number) => r * k;
  const pt = (a: number, rr: number) => `${(r + rr * Math.cos(a)).toFixed(2)},${(r + rr * Math.sin(a)).toFixed(2)}`;
  const ring = (i: number, ro: number, ri: number) => {
    const a0 = ((i * SEG - SEG / 2 - 90) * Math.PI) / 180, a1 = ((i * SEG + SEG / 2 - 90) * Math.PI) / 180;
    return `M${pt(a0, ro)} A${ro},${ro} 0 0 1 ${pt(a1, ro)} L${pt(a1, ri)} A${ri},${ri} 0 0 0 ${pt(a0, ri)} Z`;
  };
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`${id}wood`} cx="0.4" cy="0.35" r="0.75">
          <Stop offset="0" stopColor="#9A5A2A" />
          <Stop offset="0.6" stopColor="#5A2E12" />
          <Stop offset="1" stopColor="#2A1206" />
        </RadialGradient>
        <LinearGradient id={`${id}gold`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF0B0" />
          <Stop offset="0.45" stopColor="#E0A21C" />
          <Stop offset="1" stopColor="#7A4A00" />
        </LinearGradient>
        <RadialGradient id={`${id}track`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0.75" stopColor="#1A0E06" />
          <Stop offset="0.9" stopColor="#4A2A14" />
          <Stop offset="1" stopColor="#2A1408" />
        </RadialGradient>
        <RadialGradient id={`${id}cone`} cx="0.42" cy="0.38" r="0.6">
          <Stop offset="0" stopColor="#B07A40" />
          <Stop offset="0.7" stopColor="#6A3A18" />
          <Stop offset="1" stopColor="#3A1C0A" />
        </RadialGradient>
        <RadialGradient id={`${id}dome`} cx="0.35" cy="0.3" r="0.7">
          <Stop offset="0" stopColor="#FFFBE0" />
          <Stop offset="0.5" stopColor="#F2C14A" />
          <Stop offset="1" stopColor="#8A5600" />
        </RadialGradient>
        {(['red', 'black', 'green'] as const).map((k) => (
          <RadialGradient key={k} id={`${id}${k}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0.6" stopColor={POCKET[k][1]} />
            <Stop offset="1" stopColor={POCKET[k][0]} />
          </RadialGradient>
        ))}
      </Defs>
      {/* bowl and rim */}
      <Circle cx={r} cy={r} r={r} fill={`url(#${id}gold)`} />
      <Circle cx={r} cy={r} r={R(0.965)} fill={`url(#${id}wood)`} />
      {/* ball track */}
      <Circle cx={r} cy={r} r={R(0.9)} fill={`url(#${id}track)`} />
      <Circle cx={r} cy={r} r={R(0.9)} fill="none" stroke="rgba(255,230,160,0.35)" strokeWidth={R(0.012)} />
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k * 45 + 22.5) * (Math.PI / 180);
        const cx = r + R(0.835) * Math.cos(a), cy = r + R(0.835) * Math.sin(a);
        const d = R(0.035);
        return <Polygon key={k} points={`${cx},${cy - d * 1.4} ${cx + d},${cy} ${cx},${cy + d * 1.4} ${cx - d},${cy}`} fill={`url(#${id}gold)`} rotation={k * 45 + 22.5 + 90} origin={`${cx},${cy}`} />;
      })}
      {/* numbers ring and pocket cups */}
      {WHEEL_ORDER.map((n, i) => {
        const k = kind(n);
        return (
          <G key={n} onPress={onPocket ? () => onPocket(n) : undefined}>
            <Path d={ring(i, R(0.775), R(0.64))} fill={POCKET[k][0]} />
            <Path d={ring(i, R(0.64), R(0.53))} fill={`url(#${id}${k})`} />
            <SvgText x={r} y={r - R(0.685)} fontSize={R(0.075)} fontWeight="800" fill="#FFFFFF" textAnchor="middle" rotation={i * SEG} origin={`${r},${r}`}>{n}</SvgText>
          </G>
        );
      })}
      {/* silver frets between pockets */}
      {WHEEL_ORDER.map((_, i) => {
        const a = ((i * SEG - SEG / 2 - 90) * Math.PI) / 180;
        return <Path key={`f${i}`} d={`M${pt(a, R(0.775))} L${pt(a, R(0.53))}`} stroke="#E8ECF4" strokeWidth={R(0.008)} opacity={0.9} />;
      })}
      <Circle cx={r} cy={r} r={R(0.775)} fill="none" stroke="#E0A21C" strokeWidth={R(0.014)} />
      <Circle cx={r} cy={r} r={R(0.64)} fill="none" stroke="#E8ECF4" strokeWidth={R(0.008)} opacity={0.8} />
      {/* cone and turret */}
      <Circle cx={r} cy={r} r={R(0.53)} fill={`url(#${id}cone)`} />
      <Circle cx={r} cy={r} r={R(0.53)} fill="none" stroke="#E0A21C" strokeWidth={R(0.02)} />
      {[0, 1, 2, 3].map((k) => {
        const a = (k * 90 * Math.PI) / 180;
        return (
          <G key={k}>
            <Path d={`M${pt(a, R(0.08))} L${pt(a, R(0.36))}`} stroke="#E8B030" strokeWidth={R(0.045)} strokeLinecap="round" />
            <Circle cx={r + R(0.4) * Math.cos(a)} cy={r + R(0.4) * Math.sin(a)} r={R(0.055)} fill={`url(#${id}dome)`} />
          </G>
        );
      })}
      <Circle cx={r} cy={r} r={R(0.15)} fill={`url(#${id}dome)`} stroke="#7A4A00" strokeWidth={R(0.012)} />
      <Circle cx={r} cy={r} r={R(0.05)} fill="#FFFBE0" />
      {/* gloss */}
      <Path d={`M${pt(Math.PI * 1.08, R(0.93))} A${R(0.93)},${R(0.93)} 0 0 1 ${pt(Math.PI * 1.42, R(0.93))}`} stroke="#FFFFFF" strokeWidth={R(0.02)} strokeLinecap="round" fill="none" opacity={0.3} />
      <Ellipse cx={r - R(0.2)} cy={r - R(0.22)} rx={R(0.16)} ry={R(0.07)} fill="#FFFFFF" opacity={0.08} rotation={-35} origin={`${r - R(0.2)},${r - R(0.22)}`} />
      {overlay ? WHEEL_ORDER.map((n, i) => {
        const mid = ((i * SEG - 90) * Math.PI) / 180;
        return <G key={`o${n}`}>{overlay(n, r + R(0.585) * Math.cos(mid), r + R(0.585) * Math.sin(mid))}</G>;
      }) : null}
    </Svg>
  );
});
