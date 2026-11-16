import React from 'react';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * A real-looking casino chip seen from above: glossy clay body, six edge inserts, a dashed inner ring,
 * the printed inlay with the value and a soft highlight. Drawn here (no images).
 */
export const CasinoChip = React.memo(function CasinoChip({ size, color, label }: { size: number; color: string; label: string }) {
  const id = `cc${color.slice(1)}`;
  const light = shade(color, 0.35), dark = shade(color, -0.4);
  const fs = label.length >= 4 ? 15 : label.length === 3 ? 18 : 21;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${id}b`} cx="0.38" cy="0.32" r="0.75">
          <Stop offset="0" stopColor={light} />
          <Stop offset="0.6" stopColor={color} />
          <Stop offset="1" stopColor={dark} />
        </RadialGradient>
        <RadialGradient id={`${id}i`} cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E6E2F0" />
        </RadialGradient>
      </Defs>
      {/* edge (thickness) */}
      <Circle cx={50} cy={52.5} r={47} fill={dark} />
      <Circle cx={50} cy={50} r={47} fill={`url(#${id}b)`} />
      {/* six edge inserts */}
      {Array.from({ length: 6 }, (_, k) => (
        <G key={k} rotation={k * 60} origin="50,50">
          <Rect x={43} y={3.5} width={14} height={13} rx={2.5} fill="#FFFFFF" />
          <Rect x={46} y={5} width={8} height={10} rx={1.5} fill={color} opacity={0.25} />
        </G>
      ))}
      {/* dashed ring and inlay */}
      <Circle cx={50} cy={50} r={33} fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeDasharray="5.5 4" opacity={0.9} />
      <Circle cx={50} cy={50} r={27} fill={dark} opacity={0.35} />
      <Circle cx={50} cy={50} r={25.5} fill={`url(#${id}i)`} />
      <Circle cx={50} cy={50} r={22} fill="none" stroke={color} strokeWidth={1.6} />
      <SvgText x={50} y={50 + fs * 0.36} fontSize={fs} fontWeight="900" fill={dark} textAnchor="middle">{label}</SvgText>
      {/* gloss */}
      <Path d="M18 36 A34 34 0 0 1 40 14" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.35} />
      <Circle cx={50} cy={50} r={47} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
    </Svg>
  );
});
