import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const C = 512;
const ARC = (() => {
  const r = 88, a0 = (42 * Math.PI) / 180, a1 = (318 * Math.PI) / 180;
  const p = (a: number) => `${(C + r * Math.cos(a)).toFixed(1)} ${(C - r * Math.sin(a)).toFixed(1)}`;
  return `M ${p(a0)} A ${r} ${r} 0 1 0 ${p(a1)}`;
})();

/** The Cashino chip (same drawing as brand/logo-symbol.svg). `id` keeps gradient ids unique per instance. */
export function ChipLogo({ size = 64, id = 'logo', mono }: { size?: number; id?: string; mono?: string }) {
  const fill = mono ?? `url(#${id}p)`;
  return (
    <Svg width={size} height={size} viewBox="172 172 680 680">
      <Defs>
        <LinearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFD3E6" />
          <Stop offset="0.5" stopColor="#D6C6FF" />
          <Stop offset="1" stopColor="#A9E4F2" />
        </LinearGradient>
        <RadialGradient id={`${id}s`} cx="35%" cy="25%" r="75%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={C} cy={C} r={340} fill={fill} />
      {!mono && <Circle cx={C} cy={C} r={340} fill={`url(#${id}s)`} />}
      <G>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <Rect key={a} x={C - 34} y={C - 342} width={68} height={104} rx={22} fill="#0B0B0F" fillOpacity={0.9} transform={`rotate(${a} ${C} ${C})`} />
        ))}
      </G>
      <Circle cx={C} cy={C} r={214} fill="#0B0B0F" />
      <Circle cx={C} cy={C} r={186} fill="none" stroke={fill} strokeWidth={8} strokeOpacity={0.9} />
      <Path d={ARC} fill="none" stroke="#FFFFFF" strokeWidth={54} strokeLinecap="round" />
    </Svg>
  );
}
