import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { MAJOR, MINER, MINI, isNugget, nuggetValue } from '@/engine/games/goldmine.ts';
import { STAR, isWild, wildMult } from '@/engine/games/fruits.ts';
import { PARROT } from '@/engine/games/pirate.ts';

const grad = (id: string, a: string, b: string) => (
  <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <Stop offset="0" stopColor={a} />
    <Stop offset="1" stopColor={b} />
  </LinearGradient>
);
const tag = (text: string, color: string, y = 56, w = 44) => (
  <G>
    <Rect x={30 - w / 2} y={y - 9} width={w} height={12} rx={6} fill={color} stroke="#FFFFFF" strokeWidth={1.2} />
    <SvgText x={30} y={y} fontSize={8.5} fontWeight="900" fill="#FFFFFF" textAnchor="middle">{text}</SvgText>
  </G>
);
const shadow = (cx = 30, cy = 54, rx = 18) => <Ellipse cx={cx} cy={cy} rx={rx} ry={3} fill="rgba(0,0,0,0.35)" />;

/** A gold nugget: a lumpy shiny rock with its value (or MINI / MAJOR) underneath. */
export function Nugget({ value, size, text }: { value: number; size: number; text?: string }) {
  const jackpot = value === MINI ? 'MINI' : value === MAJOR ? 'MAJOR' : null;
  const id = `ng${value}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id={`${id}r`} cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFF6C4" />
          <Stop offset="0.45" stopColor={jackpot === 'MAJOR' ? '#FF7AC0' : jackpot ? '#7FE0FF' : '#FFD06B'} />
          <Stop offset="1" stopColor={jackpot === 'MAJOR' ? '#9A1260' : jackpot ? '#1A6ACF' : '#B06A08'} />
        </RadialGradient>
      </Defs>
      {shadow(30, 47, 17)}
      <Path d="M14 36 C10 26 18 14 28 15 C34 10 46 14 47 24 C53 30 48 42 38 43 C32 48 18 46 14 36 Z" fill={`url(#${id}r)`} stroke="#6A3A00" strokeWidth={1.4} />
      <Path d="M22 22 C25 19 30 19 32 21" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.85} />
      <Circle cx={38} cy={33} r={2} fill="#FFFFFF" opacity={0.6} />
      <Circle cx={24} cy={34} r={1.3} fill="#FFFFFF" opacity={0.5} />
      {tag(jackpot ?? text ?? `×${value}`, jackpot === 'MAJOR' ? '#C0127A' : jackpot ? '#1A6ACF' : '#8A5200', 56, jackpot ? 46 : 40)}
    </Svg>
  );
}

/** Mina de Oro symbols (60×60). */
export const MineSymbol = React.memo(function MineSymbol({ code, size, nuggetText }: { code: number; size: number; nuggetText?: string }) {
  if (isNugget(code)) return <Nugget value={nuggetValue(code)} size={size} text={nuggetText} />;
  const id = `mn${code}`;
  let body: React.ReactNode = null;
  switch (code) {
    case 0: // pickaxe
      body = (
        <G>
          {shadow()}
          <Path d="M18 50 L40 22" stroke="#8A4B1E" strokeWidth={5} strokeLinecap="round" />
          <Path d="M14 24 C22 12 40 8 50 14 C40 14 30 18 24 28 Z" fill="#C9C4DA" stroke="#4A4560" strokeWidth={1.5} />
          <Path d="M20 20 C26 14 34 12 40 13" stroke="#FFFFFF" strokeWidth={1.5} fill="none" opacity={0.7} />
        </G>
      );
      break;
    case 1: // shovel
      body = (
        <G>
          {shadow()}
          <Path d="M30 8 L30 34" stroke="#8A4B1E" strokeWidth={4.5} strokeLinecap="round" />
          <Rect x={24} y={6} width={12} height={5} rx={2.5} fill="#5A2E10" />
          <Path d="M20 32 L40 32 L38 46 C34 52 26 52 22 46 Z" fill="#9FB4C8" stroke="#4A4560" strokeWidth={1.5} />
          <Path d="M24 35 L26 46" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.6} />
        </G>
      );
      break;
    case 2: // lantern
      body = (
        <G>
          <Defs>{grad(`${id}l`, '#FFF3A0', '#FF9A1C')}</Defs>
          {shadow()}
          <Path d="M24 10 C24 4 36 4 36 10" stroke="#4A4560" strokeWidth={2.5} fill="none" />
          <Rect x={20} y={10} width={20} height={6} rx={2} fill="#C98B12" />
          <Rect x={21} y={16} width={18} height={26} rx={4} fill={`url(#${id}l)`} stroke="#7A4A00" strokeWidth={1.5} />
          <Path d="M30 22 C34 28 34 32 30 36 C26 32 26 28 30 22 Z" fill="#FFFFFF" opacity={0.85} />
          <Rect x={19} y={42} width={22} height={6} rx={2} fill="#C98B12" />
        </G>
      );
      break;
    case 3: // helmet
      body = (
        <G>
          <Defs>{grad(`${id}h`, '#FFE070', '#E0A010')}</Defs>
          {shadow()}
          <Path d="M10 42 C10 24 20 14 30 14 C40 14 50 24 50 42 Z" fill={`url(#${id}h)`} stroke="#7A4A00" strokeWidth={1.5} />
          <Rect x={6} y={40} width={48} height={7} rx={3.5} fill="#E0A010" stroke="#7A4A00" strokeWidth={1.5} />
          <Circle cx={30} cy={28} r={7} fill="#FFFFFF" stroke="#7A4A00" strokeWidth={1.5} />
          <Circle cx={30} cy={28} r={4} fill="#FFF3A0" />
          <Path d="M18 22 C20 18 24 16 27 16" stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.7} />
        </G>
      );
      break;
    case 4: // cart full of gold
      body = (
        <G>
          {shadow(30, 54, 20)}
          <Circle cx={18} cy={30} r={5} fill="#FFD06B" stroke="#8A5200" strokeWidth={1} />
          <Circle cx={28} cy={26} r={6} fill="#FFE070" stroke="#8A5200" strokeWidth={1} />
          <Circle cx={40} cy={29} r={5.5} fill="#FFD06B" stroke="#8A5200" strokeWidth={1} />
          <Path d="M8 30 L52 30 L46 46 L14 46 Z" fill="#7A3E1A" stroke="#3A1A08" strokeWidth={1.5} />
          <Rect x={12} y={34} width={36} height={3} fill="#5A2E10" />
          <Circle cx={20} cy={49} r={5} fill="#3A3550" stroke="#C9C4DA" strokeWidth={1.5} />
          <Circle cx={40} cy={49} r={5} fill="#3A3550" stroke="#C9C4DA" strokeWidth={1.5} />
        </G>
      );
      break;
    case 5: // dynamite
      body = (
        <G>
          {shadow()}
          {[18, 26, 34].map((x, k) => <Rect key={k} x={x} y={18} width={9} height={32} rx={3} fill="#E8304F" stroke="#7A0A1A" strokeWidth={1.2} />)}
          <Rect x={16} y={30} width={29} height={5} fill="#231A3A" />
          <Path d="M30 18 C30 12 36 10 40 8" stroke="#3A3550" strokeWidth={2} fill="none" />
          <Path d="M40 8 L44 2 L42 8 L48 6 L42 10 Z" fill="#FFD06B" />
          <Circle cx={41} cy={7} r={2.5} fill="#FFFFFF" />
        </G>
      );
      break;
    case 6: // gold bar
      body = (
        <G>
          <Defs>{grad(`${id}g`, '#FFF3A0', '#C98B12')}</Defs>
          {shadow(30, 50, 22)}
          <Polygon points="14,24 46,24 54,44 6,44" fill={`url(#${id}g)`} stroke="#7A4A00" strokeWidth={1.6} />
          <Polygon points="14,24 46,24 42,30 18,30" fill="#FFF6C4" opacity={0.7} />
          <SvgText x={30} y={40} fontSize={8} fontWeight="900" fill="#8A5200" textAnchor="middle">999</SvgText>
          <Path d="M46 14 L48 18 L52 19 L48 21 L46 25 L44 21 L40 19 L44 18 Z" fill="#FFFFFF" />
        </G>
      );
      break;
    case MINER:
      body = (
        <G>
          <Defs>{grad(`${id}m`, '#FFE070', '#C98B12')}</Defs>
          <Circle cx={30} cy={30} r={27} fill="#4A2A08" stroke="#FFD06B" strokeWidth={2.5} />
          <Path d="M14 54 C16 42 22 38 30 38 C38 38 44 42 46 54 Z" fill="#3D6ACF" />
          <Rect x={22} y={40} width={4} height={12} fill="#FFD06B" />
          <Rect x={34} y={40} width={4} height={12} fill="#FFD06B" />
          <Circle cx={30} cy={29} r={9} fill="#F2C9A0" />
          <Path d="M22 31 C24 37 36 37 38 31 C34 34 26 34 22 31 Z" fill="#5A2E10" />
          <Circle cx={26.5} cy={28} r={1.3} fill="#1A1430" />
          <Circle cx={33.5} cy={28} r={1.3} fill="#1A1430" />
          <Path d="M18 23 C18 12 42 12 42 23 Z" fill={`url(#${id}m)`} stroke="#7A4A00" strokeWidth={1} />
          <Circle cx={30} cy={18} r={3.5} fill="#FFFFFF" stroke="#7A4A00" strokeWidth={1} />
          {tag('WILD', '#E8304F', 57)}
        </G>
      );
      break;
  }
  return <Svg width={size} height={size} viewBox="0 0 60 60">{body}</Svg>;
});

/** Fuego Frutal symbols (60×60). Wild fireballs show their multiplier. */
export const FruitSymbol = React.memo(function FruitSymbol({ code, size }: { code: number; size: number }) {
  const id = `fr${code}`;
  let body: React.ReactNode = null;
  if (isWild(code)) {
    body = (
      <G>
        <Defs>
          <RadialGradient id={`${id}f`} cx="0.5" cy="0.6" r="0.6">
            <Stop offset="0" stopColor="#FFF3A0" />
            <Stop offset="0.5" stopColor="#FF8A1C" />
            <Stop offset="1" stopColor="#C0180A" />
          </RadialGradient>
        </Defs>
        <Path d="M30 4 C36 14 46 16 46 30 C50 26 50 22 48 18 C56 26 56 50 30 54 C8 52 6 30 16 20 C16 26 18 28 20 30 C18 18 26 12 30 4 Z" fill={`url(#${id}f)`} stroke="#7A0A00" strokeWidth={1.4} />
        <SvgText x={30} y={42} fontSize={18} fontWeight="900" fill="#FFFFFF" stroke="#7A0A00" strokeWidth={1} textAnchor="middle">×{wildMult(code)}</SvgText>
        {tag('WILD', '#E8304F', 57, 38)}
      </G>
    );
  } else if (code === STAR) {
    body = (
      <G>
        <Defs>{grad(`${id}s`, '#FFF3A0', '#FFB938')}</Defs>
        <Circle cx={30} cy={30} r={26} fill="#3D2BC9" opacity={0.55} />
        <Path d="M30 6 L36.5 21 L53 22.5 L40.5 33.5 L44.5 50 L30 41.5 L15.5 50 L19.5 33.5 L7 22.5 L23.5 21 Z" fill={`url(#${id}s)`} stroke="#8A5200" strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M24 22 L30 12 L34 20" stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.7} />
        {tag('FREE', '#3D2BC9', 57, 38)}
      </G>
    );
  } else {
    switch (code) {
      case 0: // cherries
        body = (
          <G>
            {shadow()}
            <Path d="M22 36 C24 22 30 14 40 10 M38 38 C36 26 38 16 40 10" stroke="#2E8A3A" strokeWidth={2.5} fill="none" />
            <Path d="M40 10 C46 8 50 12 48 16 C44 16 42 14 40 10 Z" fill="#3BE39A" />
            <Circle cx={21} cy={40} r={10} fill="#E8183F" stroke="#7A0A1A" strokeWidth={1.4} />
            <Circle cx={38} cy={42} r={10} fill="#E8183F" stroke="#7A0A1A" strokeWidth={1.4} />
            <Circle cx={18} cy={36} r={2.5} fill="#FFFFFF" opacity={0.7} />
            <Circle cx={35} cy={38} r={2.5} fill="#FFFFFF" opacity={0.7} />
          </G>
        );
        break;
      case 1: // lemon
        body = (
          <G>
            {shadow()}
            <Ellipse cx={30} cy={32} rx={20} ry={15} fill="#FFE03A" stroke="#A08000" strokeWidth={1.4} />
            <Ellipse cx={10} cy={32} rx={3} ry={2.5} fill="#FFE03A" stroke="#A08000" strokeWidth={1.2} />
            <Ellipse cx={50} cy={32} rx={3} ry={2.5} fill="#FFE03A" stroke="#A08000" strokeWidth={1.2} />
            <Ellipse cx={24} cy={26} rx={7} ry={3} fill="#FFFFFF" opacity={0.55} />
          </G>
        );
        break;
      case 2: // orange
        body = (
          <G>
            {shadow()}
            <Circle cx={30} cy={33} r={18} fill="#FF8A1C" stroke="#9A4200" strokeWidth={1.4} />
            <Path d="M30 15 C34 10 40 10 42 12 C38 16 34 16 30 15 Z" fill="#3BE39A" />
            <Ellipse cx={24} cy={26} rx={6} ry={3.5} fill="#FFFFFF" opacity={0.5} />
            {[[36, 38], [26, 42], [38, 28]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={0.9} fill="#C25A00" />)}
          </G>
        );
        break;
      case 3: // plum
        body = (
          <G>
            {shadow()}
            <Path d="M30 16 C44 14 50 28 46 40 C42 50 18 50 14 40 C10 28 16 16 30 16 Z" fill="#8A3DCF" stroke="#3A0A6A" strokeWidth={1.4} />
            <Path d="M30 18 C28 28 28 40 30 48" stroke="#5A1A9A" strokeWidth={1.2} fill="none" />
            <Path d="M30 16 C30 10 34 8 36 8" stroke="#5A2E10" strokeWidth={2} fill="none" />
            <Ellipse cx={22} cy={26} rx={4} ry={6} fill="#FFFFFF" opacity={0.4} />
          </G>
        );
        break;
      case 4: // grapes
        body = (
          <G>
            {shadow()}
            {[[22, 22], [30, 22], [38, 22], [26, 30], [34, 30], [22, 38], [30, 38], [38, 38], [26, 46], [34, 46]].slice(0, 9).map(([x, y], k) => (
              <G key={k}>
                <Circle cx={x} cy={y} r={5.5} fill="#5A2BC9" stroke="#24104A" strokeWidth={1} />
                <Circle cx={x - 1.5} cy={y - 1.5} r={1.4} fill="#FFFFFF" opacity={0.55} />
              </G>
            ))}
            <Path d="M30 16 L30 8 C34 6 40 8 42 12" stroke="#2E8A3A" strokeWidth={2.2} fill="none" />
          </G>
        );
        break;
      case 5: // watermelon slice
        body = (
          <G>
            {shadow()}
            <Path d="M6 22 L54 22 C52 40 42 50 30 50 C18 50 8 40 6 22 Z" fill="#2E8A3A" />
            <Path d="M10 22 L50 22 C48 36 40 45 30 45 C20 45 12 36 10 22 Z" fill="#FF4F6A" />
            {[[20, 28], [30, 32], [40, 28], [26, 38], [34, 38]].map(([x, y], k) => <Ellipse key={k} cx={x} cy={y} rx={1.4} ry={2.2} fill="#231A3A" />)}
          </G>
        );
        break;
      case 6: // bell
        body = (
          <G>
            <Defs>{grad(`${id}b`, '#FFF3A0', '#E0A010')}</Defs>
            {shadow()}
            <Path d="M30 8 C42 8 44 22 44 32 L50 42 L10 42 L16 32 C16 22 18 8 30 8 Z" fill={`url(#${id}b)`} stroke="#7A4A00" strokeWidth={1.6} />
            <Circle cx={30} cy={46} r={5} fill="#C98B12" stroke="#7A4A00" strokeWidth={1.2} />
            <Path d="M22 16 C20 22 20 28 21 34" stroke="#FFFFFF" strokeWidth={2.2} fill="none" opacity={0.6} />
          </G>
        );
        break;
      case 7: // red seven
        body = (
          <G>
            {shadow()}
            <SvgText x={31} y={51} fontSize={50} fontWeight="900" fill="#7A0A1A" textAnchor="middle">7</SvgText>
            <SvgText x={29} y={48} fontSize={50} fontWeight="900" fill="#E8183F" stroke="#FFFFFF" strokeWidth={1.5} textAnchor="middle">7</SvgText>
          </G>
        );
        break;
    }
  }
  return <Svg width={size} height={size} viewBox="0 0 60 60">{body}</Svg>;
});

/** Noche Pirata symbols (60×60). */
export const PirateSymbol = React.memo(function PirateSymbol({ code, size }: { code: number; size: number }) {
  const id = `pr${code}`;
  let body: React.ReactNode = null;
  switch (code) {
    case 0: // anchor
      body = (
        <G>
          {shadow()}
          <Circle cx={30} cy={12} r={5} fill="none" stroke="#9FB4C8" strokeWidth={3} />
          <Path d="M30 17 L30 50 M20 24 L40 24" stroke="#9FB4C8" strokeWidth={4} strokeLinecap="round" />
          <Path d="M12 36 C14 48 26 52 30 50 C34 52 46 48 48 36" stroke="#9FB4C8" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M8 38 L12 32 L16 38 M44 38 L48 32 L52 38" stroke="#9FB4C8" strokeWidth={3} fill="none" />
        </G>
      );
      break;
    case 1: // compass
      body = (
        <G>
          {shadow()}
          <Circle cx={30} cy={30} r={20} fill="#C98B12" stroke="#5A3200" strokeWidth={1.6} />
          <Circle cx={30} cy={30} r={16} fill="#FFF3D6" />
          <Polygon points="30,16 34,30 30,44 26,30" fill="#E8304F" />
          <Polygon points="30,30 34,30 30,44 26,30" fill="#3A3550" />
          <Circle cx={30} cy={30} r={2.5} fill="#C98B12" />
        </G>
      );
      break;
    case 2: // rum bottle
      body = (
        <G>
          {shadow()}
          <Rect x={26} y={6} width={8} height={8} rx={2} fill="#8A4B1E" />
          <Path d="M26 14 L34 14 L34 20 C42 22 42 28 42 32 L42 48 C42 52 18 52 18 48 L18 32 C18 28 18 22 26 20 Z" fill="#3A8A3A" stroke="#14401A" strokeWidth={1.4} />
          <Rect x={20} y={32} width={20} height={11} rx={2} fill="#FFF3D6" />
          <SvgText x={30} y={40.5} fontSize={7} fontWeight="900" fill="#8A1A1A" textAnchor="middle">RUM</SvgText>
          <Path d="M22 24 L22 46" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.4} />
        </G>
      );
      break;
    case 3: // treasure map
      body = (
        <G>
          {shadow()}
          <Path d="M10 14 L24 10 L36 14 L50 10 L50 46 L36 50 L24 46 L10 50 Z" fill="#F2DDB0" stroke="#8A5A1E" strokeWidth={1.4} />
          <Path d="M24 10 L24 46 M36 14 L36 50" stroke="#C9A060" strokeWidth={1} />
          <Path d="M14 40 C20 32 26 36 30 28 C34 22 40 26 42 20" stroke="#8A1A1A" strokeWidth={1.6} strokeDasharray="3 2" fill="none" />
          <Path d="M39 17 L45 23 M45 17 L39 23" stroke="#E8304F" strokeWidth={2.5} />
        </G>
      );
      break;
    case 4: // cannon
      body = (
        <G>
          {shadow(30, 54, 20)}
          <Path d="M10 22 L44 30 L42 40 L8 32 Z" fill="#3A3550" stroke="#14101E" strokeWidth={1.4} />
          <Ellipse cx={44} cy={35} rx={4} ry={6} fill="#231A3A" stroke="#C9C4DA" strokeWidth={1.2} />
          <Path d="M14 40 L40 40 L40 46 L14 46 Z" fill="#8A4B1E" />
          <Circle cx={18} cy={47} r={6} fill="#5A2E10" stroke="#3A1A08" strokeWidth={1.2} />
          <Circle cx={36} cy={47} r={6} fill="#5A2E10" stroke="#3A1A08" strokeWidth={1.2} />
          <Path d="M14 26 L36 31" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.4} />
        </G>
      );
      break;
    case 5: // treasure chest
      body = (
        <G>
          <Defs>{grad(`${id}c`, '#B0682A', '#6A3410')}</Defs>
          {shadow(30, 54, 22)}
          <Path d="M10 24 C10 12 50 12 50 24 Z" fill={`url(#${id}c)`} stroke="#3A1A08" strokeWidth={1.4} />
          <Rect x={10} y={24} width={40} height={24} rx={2} fill={`url(#${id}c)`} stroke="#3A1A08" strokeWidth={1.4} />
          {[16, 40].map((x, k) => <Rect key={k} x={x} y={14} width={4} height={34} fill="#FFD06B" />)}
          <Rect x={26} y={26} width={8} height={9} rx={2} fill="#FFD06B" stroke="#7A4A00" strokeWidth={1} />
          <Circle cx={22} cy={20} r={3} fill="#FFE070" />
          <Circle cx={34} cy={18} r={2.4} fill="#7FE0FF" />
        </G>
      );
      break;
    case 6: // ship
      body = (
        <G>
          {shadow(30, 54, 22)}
          <Path d="M28 8 L28 40" stroke="#5A2E10" strokeWidth={2.5} />
          <Path d="M28 10 C44 14 44 30 28 34 Z" fill="#F4F2FA" stroke="#9A94B0" strokeWidth={1} />
          <Path d="M28 14 C16 18 16 30 28 32 Z" fill="#E8E2D6" stroke="#9A94B0" strokeWidth={1} />
          <Path d="M28 8 L38 6 L28 4 Z" fill="#231A3A" />
          <Path d="M6 38 L54 38 L46 50 L14 50 Z" fill="#8A4B1E" stroke="#3A1A08" strokeWidth={1.4} />
          {[18, 26, 34, 42].map((x, k) => <Circle key={k} cx={x} cy={43} r={1.8} fill="#FFD06B" />)}
        </G>
      );
      break;
    case 7: // captain
      body = (
        <G>
          <Circle cx={30} cy={32} r={24} fill="#2A1E5A" />
          <Circle cx={30} cy={34} r={12} fill="#F2C9A0" />
          <Path d="M18 38 C20 50 40 50 42 38 C38 44 22 44 18 38 Z" fill="#3A1A08" />
          <Circle cx={34} cy={32} r={1.6} fill="#1A1430" />
          <Rect x={22} y={29} width={8} height={6} rx={3} fill="#1A1430" />
          <Path d="M20 30 L40 28" stroke="#1A1430" strokeWidth={1} />
          <Path d="M8 26 C12 10 48 10 52 26 C44 22 16 22 8 26 Z" fill="#1A1430" stroke="#FFD06B" strokeWidth={1.4} />
          <Circle cx={30} cy={18} r={3} fill="#FFFFFF" />
          <Path d="M28 21 L32 21" stroke="#1A1430" strokeWidth={1} />
        </G>
      );
      break;
    case PARROT:
      body = (
        <G>
          <Defs>{grad(`${id}p`, '#FF4F3A', '#B0180A')}</Defs>
          <Circle cx={30} cy={30} r={27} fill="#0B6E52" stroke="#FFD06B" strokeWidth={2.5} />
          <Path d="M24 50 C16 40 18 22 30 16 C40 12 46 20 44 28 C42 40 36 48 24 50 Z" fill={`url(#${id}p)`} stroke="#5A0A00" strokeWidth={1.2} />
          <Path d="M26 36 C22 42 22 48 24 52 C30 46 32 40 30 34 Z" fill="#3D9BFF" />
          <Path d="M30 30 C26 36 26 44 28 50 C34 44 36 38 34 30 Z" fill="#FFD06B" />
          <Path d="M42 22 C50 22 52 28 46 32 C46 28 44 26 42 26 Z" fill="#FFE070" stroke="#7A4A00" strokeWidth={1} />
          <Circle cx={37} cy={22} r={3.5} fill="#FFFFFF" />
          <Circle cx={38} cy={22} r={1.8} fill="#1A1430" />
          {tag('WILD', '#E8304F', 57)}
        </G>
      );
      break;
  }
  return <Svg width={size} height={size} viewBox="0 0 60 60">{body}</Svg>;
});
