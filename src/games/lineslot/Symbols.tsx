import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { BOX, FISH, FISHER } from '@/engine/games/fishing.ts';
import { IDOL } from '@/engine/games/jade.ts';

const grad = (id: string, a: string, b: string, vertical = true) => (
  <LinearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
    <Stop offset="0" stopColor={a} />
    <Stop offset="1" stopColor={b} />
  </LinearGradient>
);
const label = (text: string, color: string, y = 56) => (
  <G>
    <Rect x={8} y={y - 9} width={44} height={12} rx={6} fill={color} stroke="#FFFFFF" strokeWidth={1.2} />
    <SvgText x={30} y={y} fontSize={8.5} fontWeight="900" fill="#FFFFFF" textAnchor="middle">{text}</SvgText>
  </G>
);

/** Lago de Oro symbols (60×60). Fish show their prize in chips (`fishText`). */
export const FishSymbol = React.memo(function FishSymbol({ code, size, fishText }: { code: number; size: number; fishText?: string }) {
  const id = `fs${code >= FISH ? 'f' : code}`;
  let body: React.ReactNode;
  if (code >= FISH) {
    body = (
      <G>
        <Defs>{grad(`${id}g`, '#FFE070', '#F08A1C')}</Defs>
        <Path d="M10 30 C18 16 36 14 46 26 L56 18 L54 30 L56 42 L46 34 C36 46 18 44 10 30 Z" fill={`url(#${id}g)`} stroke="#9A4A00" strokeWidth={1.6} />
        <Path d="M30 20 C32 26 32 34 30 40" stroke="#C8620A" strokeWidth={1.5} fill="none" opacity={0.7} />
        <Path d="M22 22 L28 14 L32 20 Z" fill="#F08A1C" />
        <Circle cx={18} cy={27} r={3.2} fill="#FFFFFF" />
        <Circle cx={17.4} cy={27} r={1.7} fill="#1A1430" />
        <Path d="M12 33 Q15 35 18 33" stroke="#9A4A00" strokeWidth={1.2} fill="none" />
        <Ellipse cx={25} cy={24} rx={6} ry={2.5} fill="#FFFFFF" opacity={0.45} />
        {fishText ? label(fishText, '#12A05A', 54) : null}
      </G>
    );
  } else if (code === FISHER) {
    body = (
      <G>
        <Defs>{grad(`${id}h`, '#FFD86B', '#C98B12')}{grad(`${id}v`, '#3D9BFF', '#1A4ACF')}</Defs>
        <Circle cx={30} cy={30} r={27} fill="#0B6E52" stroke="#FFD06B" strokeWidth={2.5} />
        <Path d="M14 54 C16 40 22 36 30 36 C38 36 44 40 46 54 Z" fill={`url(#${id}v)`} />
        <Path d="M24 38 L30 46 L36 38" stroke="#FFD06B" strokeWidth={2} fill="none" />
        <Circle cx={30} cy={28} r={9} fill="#F2C9A0" />
        <Path d="M21 30 C22 40 38 40 39 30 C36 34 24 34 21 30 Z" fill="#E8E2D6" />
        <Circle cx={26.5} cy={27} r={1.3} fill="#1A1430" />
        <Circle cx={33.5} cy={27} r={1.3} fill="#1A1430" />
        <Path d="M14 21 L46 21 L42 17 C40 9 20 9 18 17 Z" fill={`url(#${id}h)`} stroke="#7A4A00" strokeWidth={1} />
        <Path d="M26 12 L30 7 L34 12" stroke="#E8304F" strokeWidth={2.5} fill="none" />
        {label('WILD', '#E8304F', 57)}
      </G>
    );
  } else if (code === BOX) {
    body = (
      <G>
        <Defs>{grad(`${id}b`, '#FF8A4A', '#C0391A')}</Defs>
        <Path d="M10 24 L50 24 L48 50 L12 50 Z" fill={`url(#${id}b)`} stroke="#6A1A08" strokeWidth={1.5} />
        <Path d="M8 18 L52 18 L50 26 L10 26 Z" fill="#FFB938" stroke="#7A4A00" strokeWidth={1.2} />
        <Rect x={24} y={10} width={12} height={9} rx={3} fill="none" stroke="#C9C4DA" strokeWidth={2.5} />
        <Rect x={26} y={30} width={8} height={8} rx={2} fill="#FFD06B" />
        <Path d="M16 34 L22 31 M40 31 L46 34" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.6} />
        {label('FREE', '#7B5CFF', 57)}
      </G>
    );
  } else {
    const draws: React.ReactNode[] = [
      // float (bobber)
      <G key="0"><Path d="M30 4 L30 14" stroke="#1A1430" strokeWidth={2.5} /><Circle cx={30} cy={30} r={15} fill="#FFFFFF" stroke="#1A1430" strokeWidth={1.5} /><Path d="M15 30 A15 15 0 0 1 45 30 Z" fill="#E8304F" /><Path d="M30 45 L30 56" stroke="#1A1430" strokeWidth={2.5} /><Ellipse cx={24} cy={22} rx={4} ry={2.5} fill="#FFFFFF" opacity={0.6} /></G>,
      // hook
      <G key="1"><Circle cx={30} cy={8} r={4} fill="none" stroke="#C9CEE0" strokeWidth={3} /><Path d="M30 12 L30 38 C30 50 16 50 16 40 L20 44" stroke="#C9CEE0" strokeWidth={4} fill="none" strokeLinecap="round" /><Path d="M30 12 L30 38 C30 50 16 50 16 40" stroke="#FFFFFF" strokeWidth={1.2} fill="none" opacity={0.7} /><Path d="M38 26 C44 22 48 28 44 32 C40 36 36 30 38 26 Z" fill="#E86A9A" /></G>,
      // lure
      <G key="2"><Path d="M18 10 C34 10 44 22 40 36 C36 48 22 50 16 40 C10 30 10 16 18 10 Z" fill="#FFB938" stroke="#7A4A00" strokeWidth={1.4} /><Path d="M20 16 C30 18 36 26 34 36" stroke="#FFFFFF" strokeWidth={2.5} fill="none" opacity={0.7} /><Circle cx={22} cy={20} r={3} fill="#E8304F" /><Path d="M30 46 L30 54 M26 52 L30 56 L34 52" stroke="#C9CEE0" strokeWidth={2} fill="none" /></G>,
      // reel
      <G key="3"><Circle cx={28} cy={32} r={16} fill="#5A6078" stroke="#1A1430" strokeWidth={1.5} /><Circle cx={28} cy={32} r={10} fill="#C9CEE0" /><Circle cx={28} cy={32} r={3} fill="#1A1430" /><Path d="M28 32 L46 22" stroke="#1A1430" strokeWidth={3} strokeLinecap="round" /><Circle cx={47} cy={21} r={4} fill="#E8304F" /><Rect x={20} y={10} width={16} height={6} rx={2} fill="#5A6078" /></G>,
      // dragonfly
      <G key="4"><Ellipse cx={18} cy={22} rx={13} ry={6} fill="#9CD0FF" opacity={0.85} rotation={-20} origin="18,22" /><Ellipse cx={42} cy={22} rx={13} ry={6} fill="#9CD0FF" opacity={0.85} rotation={20} origin="42,22" /><Ellipse cx={18} cy={34} rx={11} ry={5} fill="#B9E0FF" opacity={0.8} rotation={15} origin="18,34" /><Ellipse cx={42} cy={34} rx={11} ry={5} fill="#B9E0FF" opacity={0.8} rotation={-15} origin="42,34" /><Path d="M30 16 L30 56" stroke="#1A5ACF" strokeWidth={5} strokeLinecap="round" /><Circle cx={30} cy={14} r={5} fill="#3D7BFF" /><Circle cx={28} cy={13} r={1.5} fill="#FFFFFF" /><Circle cx={32} cy={13} r={1.5} fill="#FFFFFF" /></G>,
      // frog
      <G key="5"><Ellipse cx={30} cy={48} rx={26} ry={8} fill="#1F9A5C" /><Ellipse cx={30} cy={34} rx={16} ry={13} fill="#5BE3B0" stroke="#0B6E52" strokeWidth={1.5} /><Circle cx={22} cy={22} r={6} fill="#5BE3B0" stroke="#0B6E52" strokeWidth={1.5} /><Circle cx={38} cy={22} r={6} fill="#5BE3B0" stroke="#0B6E52" strokeWidth={1.5} /><Circle cx={22} cy={22} r={3} fill="#1A1430" /><Circle cx={38} cy={22} r={3} fill="#1A1430" /><Path d="M22 36 Q30 42 38 36" stroke="#0B6E52" strokeWidth={2} fill="none" /><Ellipse cx={30} cy={40} rx={7} ry={3} fill="#C8F5DF" opacity={0.6} /></G>,
      // boat
      <G key="6"><Path d="M6 36 L54 36 L46 50 L14 50 Z" fill="#B0602A" stroke="#5A2E12" strokeWidth={1.5} /><Path d="M8 40 L52 40" stroke="#E09A5A" strokeWidth={2} /><Path d="M30 36 L30 8" stroke="#5A2E12" strokeWidth={2.5} /><Path d="M31 10 L48 32 L31 32 Z" fill="#FFFFFF" stroke="#C9CEE0" strokeWidth={1} /><Path d="M4 52 Q15 48 26 52 T48 52 T58 52" stroke="#3D9BFF" strokeWidth={2.5} fill="none" /></G>,
      // rod
      <G key="7"><Path d="M8 54 L48 8" stroke="#5A2E12" strokeWidth={4} strokeLinecap="round" /><Path d="M8 54 L20 40" stroke="#1A1430" strokeWidth={6} strokeLinecap="round" /><Circle cx={18} cy={46} r={5} fill="#C9CEE0" stroke="#1A1430" strokeWidth={1.2} /><Path d="M48 8 Q56 26 50 44" stroke="#FFFFFF" strokeWidth={1.2} fill="none" /><Path d="M50 44 L50 50 C50 54 46 54 46 51" stroke="#C9CEE0" strokeWidth={2} fill="none" /><Path d="M28 31 L33 26" stroke="#FFD06B" strokeWidth={3} /></G>,
    ];
    body = draws[code] ?? null;
  }
  return <Svg width={size} height={size} viewBox="0 0 60 60">{body}</Svg>;
});

/** Templo de Jade symbols (60×60). */
export const JadeSymbol = React.memo(function JadeSymbol({ code, size }: { code: number; size: number }) {
  const id = `js${code}`;
  const draws: React.ReactNode[] = [
    // leaf
    <G key="0"><Path d="M12 50 C10 26 26 10 50 10 C50 34 34 50 12 50 Z" fill="#2ECC71" stroke="#0B5E3E" strokeWidth={1.5} /><Path d="M14 48 L46 14" stroke="#0B5E3E" strokeWidth={1.8} /><Path d="M24 38 L22 28 M32 30 L30 20 M30 32 L40 32" stroke="#0B5E3E" strokeWidth={1.2} /></G>,
    // feather
    <G key="1"><Path d="M44 6 C20 14 12 34 16 52 C34 46 48 28 44 6 Z" fill="#3DC8FF" stroke="#0B4E7A" strokeWidth={1.5} /><Path d="M14 56 L42 10" stroke="#FFFFFF" strokeWidth={2} /><Path d="M22 40 L30 42 M26 32 L36 32 M30 24 L40 22" stroke="#0B4E7A" strokeWidth={1} /></G>,
    // shell
    <G key="2"><Path d="M30 52 C14 52 8 40 12 30 C16 18 28 14 36 18 C44 22 46 32 40 38 C34 44 26 40 26 34 C26 28 34 28 34 32" stroke="#E09A5A" strokeWidth={4} fill="#FFD6B0" strokeLinecap="round" /><Path d="M30 52 C40 52 50 46 52 36" stroke="#E09A5A" strokeWidth={4} fill="none" strokeLinecap="round" /></G>,
    // amulet
    <G key="3"><Path d="M18 8 Q30 22 42 8" stroke="#C98B12" strokeWidth={2} fill="none" /><Circle cx={30} cy={34} r={17} fill="#FFD06B" stroke="#7A4A00" strokeWidth={1.5} /><Circle cx={30} cy={34} r={10} fill="#12C08A" stroke="#0B5E3E" strokeWidth={1.5} /><Ellipse cx={27} cy={31} rx={3} ry={2} fill="#FFFFFF" opacity={0.6} /></G>,
    // drum
    <G key="4"><Ellipse cx={30} cy={16} rx={18} ry={6} fill="#F4E2C0" stroke="#5A2E12" strokeWidth={1.5} /><Path d="M12 16 L16 48 L44 48 L48 16" fill="#B0602A" stroke="#5A2E12" strokeWidth={1.5} /><Path d="M14 22 L46 42 M46 22 L14 42" stroke="#FFD06B" strokeWidth={2} /><Ellipse cx={30} cy={48} rx={14} ry={4} fill="#7A3A12" /></G>,
    // mask
    <G key="5"><Defs>{grad(`${id}m`, '#5BE3B0', '#0B6E52')}</Defs><Path d="M10 14 C10 10 50 10 50 14 C52 36 44 54 30 54 C16 54 8 36 10 14 Z" fill={`url(#${id}m)`} stroke="#04331F" strokeWidth={1.5} /><Path d="M16 26 L26 26 L24 32 L16 30 Z M44 26 L34 26 L36 32 L44 30 Z" fill="#04331F" /><Path d="M30 30 L26 40 L34 40 Z" fill="#0B6E52" /><Path d="M22 46 L38 46" stroke="#04331F" strokeWidth={2.5} /><Circle cx={30} cy={18} r={3} fill="#FFD06B" /></G>,
    // jaguar
    <G key="6"><Circle cx={16} cy={14} r={7} fill="#E8A030" stroke="#5A2E12" strokeWidth={1.2} /><Circle cx={44} cy={14} r={7} fill="#E8A030" stroke="#5A2E12" strokeWidth={1.2} /><Ellipse cx={30} cy={32} rx={20} ry={19} fill="#F2B040" stroke="#5A2E12" strokeWidth={1.5} />{[[18, 24], [42, 24], [16, 36], [44, 36], [30, 18]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={2.5} fill="none" stroke="#5A2E12" strokeWidth={1.5} />)}<Ellipse cx={30} cy={40} rx={9} ry={7} fill="#FFF0D0" /><Path d="M27 37 L33 37 L30 41 Z" fill="#1A1430" /><Circle cx={23} cy={29} r={2.5} fill="#2ECC71" /><Circle cx={37} cy={29} r={2.5} fill="#2ECC71" /></G>,
    // serpent
    <G key="7"><Path d="M12 50 C4 40 14 30 26 34 C38 38 48 30 42 20 C38 14 30 16 30 22" stroke="#12C08A" strokeWidth={8} fill="none" strokeLinecap="round" /><Path d="M12 50 C4 40 14 30 26 34 C38 38 48 30 42 20" stroke="#FFD06B" strokeWidth={2} fill="none" strokeDasharray="3 4" /><Circle cx={30} cy={20} r={8} fill="#12C08A" stroke="#0B5E3E" strokeWidth={1.5} /><Path d="M22 14 L18 6 L26 12 M38 14 L42 6 L34 12" stroke="#E8304F" strokeWidth={3} fill="none" /><Circle cx={27} cy={19} r={1.5} fill="#FFD06B" /><Circle cx={33} cy={19} r={1.5} fill="#FFD06B" /><Path d="M30 27 L30 32 M30 32 L27 35 M30 32 L33 35" stroke="#E8304F" strokeWidth={1.5} /></G>,
    // explorer
    <G key="8"><Path d="M14 56 C16 44 22 40 30 40 C38 40 44 44 46 56 Z" fill="#8A6A3A" /><Path d="M26 40 L30 48 L34 40" stroke="#F4E2C0" strokeWidth={3} fill="none" /><Circle cx={30} cy={30} r={10} fill="#F2C9A0" /><Path d="M24 33 Q30 37 36 33" stroke="#7A3A12" strokeWidth={1.5} fill="none" /><Circle cx={26} cy={28} r={1.3} fill="#1A1430" /><Circle cx={34} cy={28} r={1.3} fill="#1A1430" /><Ellipse cx={30} cy={21} rx={20} ry={4} fill="#B0874A" stroke="#5A3A12" strokeWidth={1.2} /><Path d="M19 21 C19 8 41 8 41 21 Z" fill="#C9A060" stroke="#5A3A12" strokeWidth={1.2} /><Rect x={19} y={16} width={22} height={3} fill="#5A3A12" /></G>,
  ];
  if (code === IDOL) {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Defs>
          <RadialGradient id={`${id}i`} cx="0.4" cy="0.35" r="0.7"><Stop offset="0" stopColor="#FFF6C0" /><Stop offset="0.5" stopColor="#FFC93A" /><Stop offset="1" stopColor="#9A6000" /></RadialGradient>
        </Defs>
        <Circle cx={30} cy={30} r={28} fill="#0B5E3E" stroke="#FFD06B" strokeWidth={2} />
        <Polygon points="30,6 46,14 50,32 42,48 18,48 10,32 14,14" fill={`url(#${id}i)`} stroke="#7A4A00" strokeWidth={1.5} />
        <Path d="M18 24 L26 24 M34 24 L42 24" stroke="#7A4A00" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={22} cy={24} r={2} fill="#12C08A" /><Circle cx={38} cy={24} r={2} fill="#12C08A" />
        <Path d="M30 26 L27 34 L33 34 Z" fill="#B07A10" />
        <Rect x={22} y={38} width={16} height={4} rx={2} fill="#7A4A00" />
        <Path d="M14 14 L10 6 M46 14 L50 6 M30 6 L30 1" stroke="#FFD06B" strokeWidth={2} />
        {label('WILD', '#E8304F', 57)}
      </Svg>
    );
  }
  return <Svg width={size} height={size} viewBox="0 0 60 60">{draws[code] ?? null}</Svg>;
});
