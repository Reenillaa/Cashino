import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { SlotSymbol } from '@/engine/games/slots.ts';

/** Original slot symbols (drawn for Cashino): cherry, lemon, bell, BAR, 7 and diamond. */
export function SlotSymbolArt({ sym, size = 56 }: { sym: SlotSymbol; size?: number }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`sgold${u}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE58A" />
          <Stop offset="1" stopColor="#D98A0E" />
        </LinearGradient>
        <LinearGradient id={`sred${u}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF6A7E" />
          <Stop offset="1" stopColor="#C8102E" />
        </LinearGradient>
        <LinearGradient id={`sblue${u}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#D9F7FF" />
          <Stop offset="1" stopColor="#3D9BFF" />
        </LinearGradient>
      </Defs>
      {sym === 'cherry' && (
        <>
          <Path d="M50 18 Q46 42 32 58 M50 18 Q60 44 68 60" stroke="#2E8B3E" strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d="M50 18 Q64 10 76 20 Q62 26 50 18 Z" fill="#3DBE5C" />
          <Circle cx={32} cy={66} r={17} fill={`url(#sred${u})`} />
          <Circle cx={68} cy={68} r={17} fill={`url(#sred${u})`} />
          <Circle cx={26} cy={60} r={4} fill="#FFFFFF" opacity={0.7} />
          <Circle cx={62} cy={62} r={4} fill="#FFFFFF" opacity={0.7} />
        </>
      )}
      {sym === 'lemon' && (
        <>
          <Ellipse cx={50} cy={52} rx={34} ry={26} fill="#FFD84D" />
          <Ellipse cx={50} cy={52} rx={34} ry={26} fill="none" stroke="#E0A800" strokeWidth={3} />
          <Path d="M14 52 L8 50 M86 52 L92 50" stroke="#E0A800" strokeWidth={5} strokeLinecap="round" />
          <Ellipse cx={40} cy={42} rx={10} ry={5} fill="#FFFFFF" opacity={0.6} />
        </>
      )}
      {sym === 'bell' && (
        <>
          <Path d="M50 14 C30 14 26 38 24 60 L18 72 L82 72 L76 60 C74 38 70 14 50 14 Z" fill={`url(#sgold${u})`} stroke="#8A5300" strokeWidth={3} />
          <Rect x={16} y={70} width={68} height={8} rx={4} fill="#C98B12" />
          <Circle cx={50} cy={84} r={7} fill="#8A5300" />
          <Path d="M38 26 Q34 44 34 58" stroke="#FFF6D0" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.8} />
        </>
      )}
      {sym === 'bar' && (
        <>
          <Rect x={12} y={30} width={76} height={40} rx={8} fill="#231A3A" stroke={`url(#sgold${u})`} strokeWidth={4} />
          <SvgText x={50} y={60} fontSize={26} fontWeight="900" fill={`url(#sgold${u})`} textAnchor="middle">BAR</SvgText>
        </>
      )}
      {sym === 'seven' && (
        <>
          <SvgText x={52} y={86} fontSize={84} fontWeight="900" fill="#8A0016" textAnchor="middle">7</SvgText>
          <SvgText x={50} y={82} fontSize={84} fontWeight="900" fill={`url(#sred${u})`} stroke="#FFE58A" strokeWidth={2.5} textAnchor="middle">7</SvgText>
        </>
      )}
      {sym === 'diamond' && (
        <>
          <Polygon points="50,90 12,40 28,16 72,16 88,40" fill={`url(#sblue${u})`} stroke="#FFFFFF" strokeWidth={2} />
          <Polygon points="12,40 88,40 50,90" fill="#7CC7FF" opacity={0.8} />
          <Polygon points="28,16 50,40 72,16" fill="#FFFFFF" opacity={0.75} />
          <Polygon points="38,40 50,90 62,40" fill="#3D7BFF" opacity={0.7} />
        </>
      )}
    </Svg>
  );
}
