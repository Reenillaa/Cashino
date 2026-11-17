import React from 'react';
import { Circle, Defs, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { dg, ol, rg, vg } from '../lineslot/art/kit';

/**
 * Shared paint box of the scratch tickets. Every ticket SVG defines these gradients once under its own prefix
 * (`p`), because gradient ids are global on the web and two tickets on screen must never share one.
 */
export function Paints({ p }: { p: string }) {
  return (
    <Defs>
      {vg(`${p}gold`, ['#FFF6C2', '#FFD34D', '#E09A12', '#8A4E04'])}
      {dg(`${p}goldD`, ['#FFF6C2', '#FFC93C', '#B87508', '#FFE38A'])}
      {vg(`${p}silver`, ['#FFFFFF', '#DCE2EC', '#9AA4B8', '#5E687C'])}
      {vg(`${p}red`, ['#FF8A8A', '#E8304F', '#8A0A24'])}
      {vg(`${p}green`, ['#B6F08A', '#3DBA4A', '#14602A'])}
      {vg(`${p}blue`, ['#9BDCFF', '#2E8AE0', '#0B3A8A'])}
      {vg(`${p}yellow`, ['#FFF9B8', '#FFD93D', '#D99A00'])}
      {vg(`${p}orange`, ['#FFD09A', '#FF8A1C', '#A84000'])}
      {vg(`${p}brown`, ['#D9A06A', '#8A4B1E', '#3E1A06'])}
      {vg(`${p}cream`, ['#FFFFFF', '#FFF2D6', '#E8CB98'])}
      {vg(`${p}pink`, ['#FFD0DC', '#FF6F91', '#B02A52'])}
      {vg(`${p}iron`, ['#6A6A7A', '#2E2E3A', '#0A0A12'])}
      {vg(`${p}night`, ['#4A4AA8', '#201A60', '#0A0828'])}
      {vg(`${p}rice`, ['#FFF4B0', '#F6C832', '#D08A0A'])}
      {vg(`${p}purple`, ['#D8B8FF', '#8A4FE0', '#3A1480'])}
      {rg(`${p}plate`, ['#FFFFFF', '#F2F6FF', '#C8D4EA'], '0.42', '0.35', '0.7')}
      {rg(`${p}glow`, ['#FFF6C2', '#FFD34D00'], '0.5', '0.5', '0.5')}
    </Defs>
  );
}

type Ic = { p: string; x: number; y: number; s?: number };
/** Places a 40×40 drawing centred on (x, y), scaled by s. */
const At = ({ x, y, s = 1, children }: { x: number; y: number; s?: number; children: React.ReactNode }) => <G transform={`translate(${x - 20 * s} ${y - 20 * s}) scale(${s})`}>{children}</G>;
const shine = (d: string, o = 0.55) => <Path d={d} fill="#FFFFFF" opacity={o} />;

/* ---------------------------------------------------------------- tapas (decor under each amount) */
export const TapaIcons = [
  // olive and pepper skewer
  ({ p, x, y, s }: Ic) => (
    <At x={x} y={y} s={s}>
      <Path d="M8 34 L32 6" {...ol('#6A3A10', 2.4)} />
      <Ellipse cx={16} cy={24} rx={7} ry={6} fill={`url(#${p}green)`} {...ol('#14401A', 1.6)} />
      <Circle cx={16} cy={24} r={2.4} fill="#E8304F" />
      <Ellipse cx={25} cy={14} rx={6} ry={5.4} fill="#2A2A2A" {...ol('#000000', 1.4)} />
      {shine('M12 20 Q15 18 18 19 Q15 20 13 22 Z')}
      <Path d="M30 4 L35 2 L33 8 Z" fill="#E8304F" />
    </At>
  ),
  // croquette
  ({ p, x, y, s }: Ic) => (
    <At x={x} y={y} s={s}>
      <Path d="M6 22 C6 12 34 12 34 22 C34 32 6 32 6 22 Z" fill={`url(#${p}orange)`} {...ol('#6A2A00', 2)} />
      {[[12, 18], [18, 24], [24, 17], [28, 25], [14, 27], [22, 21]].map(([a, b], k) => <Circle key={k} cx={a} cy={b} r={1.1} fill="#7A3A00" opacity={0.7} />)}
      {shine('M10 18 Q18 13 28 16 Q18 16 12 21 Z', 0.5)}
    </At>
  ),
  // cured ham slice
  ({ p, x, y, s }: Ic) => (
    <At x={x} y={y} s={s}>
      <Path d="M4 26 C8 10 30 6 36 16 C30 18 26 24 22 32 C14 34 6 32 4 26 Z" fill={`url(#${p}red)`} {...ol('#5A0A18', 2)} />
      <Path d="M8 26 C12 16 24 12 32 16" stroke="#FFE0E6" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Path d="M10 30 C14 24 20 22 24 22" stroke="#FFE0E6" strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.7} />
    </At>
  ),
  // potato omelette wedge
  ({ p, x, y, s }: Ic) => (
    <At x={x} y={y} s={s}>
      <Path d="M6 30 L20 6 L34 30 Z" fill={`url(#${p}yellow)`} {...ol('#7A5200', 2)} />
      <Path d="M6 30 L34 30 L32 34 L8 34 Z" fill="#C88A1A" {...ol('#7A5200', 1.6)} />
      {[[16, 22], [22, 18], [24, 26], [18, 28]].map(([a, b], k) => <Ellipse key={k} cx={a} cy={b} rx={2.4} ry={1.6} fill="#FFF3B0" />)}
    </At>
  ),
  // garlic prawn
  ({ p, x, y, s }: Ic) => (
    <At x={x} y={y} s={s}>
      <Path d="M30 8 C40 18 32 34 18 34 C10 34 6 28 8 24 C14 28 22 26 24 20 C26 14 24 10 30 8 Z" fill={`url(#${p}orange)`} {...ol('#8A2A00', 2)} />
      <Path d="M24 14 L30 16 M24 21 L30 25 M18 27 L22 32" stroke="#FFD09A" strokeWidth={1.4} />
      <Path d="M30 8 C34 2 38 4 38 6 M30 8 C30 2 26 0 24 2" stroke="#A84000" strokeWidth={1.2} fill="none" />
      <Circle cx={31} cy={12} r={1.4} fill="#1A0A00" />
    </At>
  ),
  // padrón peppers
  ({ p, x, y, s }: Ic) => (
    <At x={x} y={y} s={s}>
      <Path d="M8 12 C4 22 12 34 18 34 C22 30 20 20 14 12 Z" fill={`url(#${p}green)`} {...ol('#14401A', 1.8)} />
      <Path d="M22 10 C18 22 26 34 32 32 C36 26 32 16 26 10 Z" fill={`url(#${p}green)`} {...ol('#14401A', 1.8)} />
      <Path d="M11 12 L12 6 M24 10 L25 4" stroke="#6A3A10" strokeWidth={2.4} strokeLinecap="round" />
      {shine('M10 16 Q9 22 12 28 Q11 22 12 16 Z')}
      {[[14, 22], [26, 24], [20, 30]].map(([a, b], k) => <Circle key={k} cx={a} cy={b} r={0.9} fill="#FFFFFF" />)}
    </At>
  ),
];

/* ---------------------------------------------------------------- feria */
export const FeriaIcon: Record<string, (i: Ic) => React.ReactElement> = {
  farolillo: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M20 0 L20 6" stroke="#4A2A10" strokeWidth={1.6} />
      <Rect x={14} y={5} width={12} height={4} rx={1} fill="#3A3A3A" />
      <Path d="M8 10 C2 20 2 26 8 34 L32 34 C38 26 38 20 32 10 Z" fill={`url(#${p}red)`} {...ol('#5A0A18', 1.8)} />
      <Path d="M10 10 C6 20 6 26 10 34 M16 10 C14 20 14 26 16 34 M24 10 C26 20 26 26 24 34 M30 10 C34 20 34 26 30 34" stroke="#FFFFFF" strokeWidth={1.6} fill="none" />
      {[[13, 16], [27, 16], [20, 22], [13, 28], [27, 28]].map(([a, b], k) => <Circle key={k} cx={a} cy={b} r={1.6} fill="#FFFFFF" />)}
      <Rect x={14} y={34} width={12} height={4} rx={1} fill="#3A3A3A" />
      <Ellipse cx={20} cy={22} rx={10} ry={8} fill="#FFE58A" opacity={0.22} />
    </At>
  ),
  abanico: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M20 34 L2 14 C8 4 32 4 38 14 Z" fill={`url(#${p}pink)`} {...ol('#7A1038', 1.8)} />
      {[6, 11, 16, 20, 24, 29, 34].map((a, k) => <Path key={k} d={`M20 34 L${a} ${6 + Math.abs(20 - a) * 0.3}`} stroke="#7A1038" strokeWidth={0.9} />)}
      <Path d="M8 12 C14 8 26 8 32 12" stroke="#FFFFFF" strokeWidth={1.6} fill="none" opacity={0.8} />
      <Circle cx={20} cy={14} r={2.6} fill="#FFFFFF" /><Circle cx={13} cy={15} r={1.6} fill="#FFFFFF" /><Circle cx={27} cy={15} r={1.6} fill="#FFFFFF" />
      <Circle cx={20} cy={33} r={2.4} fill={`url(#${p}gold)`} {...ol('#6A3A00', 1)} />
    </At>
  ),
  clavel: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M20 22 C20 30 18 34 16 38" stroke="#2A8A3A" strokeWidth={2.4} fill="none" />
      <Path d="M18 32 C12 30 10 26 12 24 C16 26 18 28 18 32 Z" fill={`url(#${p}green)`} />
      <Path d="M20 4 L23 8 L27 5 L28 10 L33 9 L31 14 L35 17 L30 19 L32 24 L26 23 L24 27 L20 24 L16 27 L14 23 L8 24 L10 19 L5 17 L9 14 L7 9 L12 10 L13 5 L17 8 Z" fill={`url(#${p}red)`} {...ol('#6A0A18', 1.6)} />
      <Path d="M20 10 L22 13 L25 12 L24 16 L27 18 L23 19 L22 22 L20 20 L18 22 L17 19 L13 18 L16 16 L15 12 L18 13 Z" fill="#FF8A8A" />
      <Circle cx={20} cy={16} r={2} fill="#B0102E" />
    </At>
  ),
  peineta: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M4 22 C4 6 36 6 36 22 L32 22 L30 34 L28 22 L24 22 L22 36 L20 22 L18 36 L16 22 L12 22 L10 34 L8 22 Z" fill={`url(#${p}brown)`} {...ol('#2A1004', 1.6)} />
      <Path d="M8 18 C10 10 30 10 32 18" stroke="#F4D7A8" strokeWidth={1.4} fill="none" />
      {[[12, 15], [20, 12], [28, 15]].map(([a, b], k) => <Circle key={k} cx={a} cy={b} r={2} fill="none" stroke="#F4D7A8" strokeWidth={1.2} />)}
      {shine('M8 16 Q12 9 20 8 Q13 11 10 18 Z', 0.45)}
    </At>
  ),
  castanuelas: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Ellipse cx={14} cy={22} rx={10} ry={12} fill={`url(#${p}brown)`} {...ol('#2A1004', 1.8)} />
      <Ellipse cx={26} cy={20} rx={10} ry={12} fill={`url(#${p}brown)`} {...ol('#2A1004', 1.8)} />
      <Path d="M14 10 C16 4 24 4 26 8" stroke="#E8304F" strokeWidth={2.4} fill="none" />
      <Path d="M18 6 L22 2 L24 6 L20 8 Z" fill="#E8304F" />
      <Ellipse cx={26} cy={20} rx={5} ry={6} fill="none" stroke="#F4D7A8" strokeWidth={1} opacity={0.6} />
      {shine('M20 12 Q24 8 30 10 Q24 11 22 16 Z', 0.45)}
    </At>
  ),
  guitarra: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M26 4 L36 0 L38 4 L30 10 Z" fill="#3A1A06" />
      <Path d="M24 12 L32 6" stroke="#5A2A0A" strokeWidth={4} strokeLinecap="round" />
      <Path d="M14 12 C22 8 28 14 24 20 C30 22 30 34 20 36 C10 38 2 32 4 24 C6 18 10 18 12 18 C10 14 11 13 14 12 Z" fill={`url(#${p}orange)`} {...ol('#4A1A00', 1.8)} />
      <Circle cx={17} cy={24} r={3.4} fill="#2A1004" />
      <Path d="M10 30 L14 34" stroke="#2A1004" strokeWidth={2.4} />
      <Path d="M12 32 L30 8" stroke="#FFF3D0" strokeWidth={0.7} />
    </At>
  ),
};

/* ---------------------------------------------------------------- siesta */
export const SiestaIcon: Record<string, (i: Ic) => React.ReactElement> = {
  luna: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Circle cx={20} cy={20} r={19} fill={`url(#${p}glow)`} />
      <Path d="M24 4 C12 4 6 14 6 21 C6 30 14 37 24 36 C16 32 13 26 13 20 C13 13 17 7 24 4 Z" fill={`url(#${p}gold)`} {...ol('#7A4A00', 1.8)} />
      <Circle cx={11} cy={22} r={1.6} fill="#C88A1A" /><Circle cx={14} cy={29} r={1.2} fill="#C88A1A" />
      <Path d="M30 10 L31 13 L34 14 L31 15 L30 18 L29 15 L26 14 L29 13 Z" fill="#FFFFFF" />
      {shine('M9 16 Q12 8 20 6 Q13 10 11 18 Z', 0.6)}
    </At>
  ),
  oveja: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M10 30 L10 36 M16 31 L16 37 M24 31 L24 37 M30 30 L30 36" stroke="#2A2A3A" strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M8 22 C4 18 8 12 12 14 C12 8 20 8 22 12 C26 8 34 10 32 16 C38 18 36 26 32 26 C32 32 24 32 22 30 C18 34 10 32 10 28 C4 28 4 22 8 22 Z" fill={`url(#${p}cream)`} {...ol('#5A5A6A', 1.6)} />
      <Ellipse cx={34} cy={20} rx={5} ry={6} fill="#3A3A4A" />
      <Circle cx={35} cy={19} r={1} fill="#FFFFFF" />
      <Path d="M30 15 C28 13 28 11 30 11" stroke="#3A3A4A" strokeWidth={2} fill="none" />
    </At>
  ),
  gallo: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M8 14 C2 18 2 30 10 34 L26 34 C32 30 32 22 28 18 Z" fill={`url(#${p}orange)`} {...ol('#5A1A00', 1.6)} />
      <Path d="M8 14 C4 8 6 4 10 6 C10 2 16 2 16 6" fill="none" stroke="#2A6A3A" strokeWidth={3} strokeLinecap="round" />
      <Path d="M24 4 C24 0 30 0 30 4 C32 2 36 4 34 8 L26 10 Z" fill={`url(#${p}red)`} />
      <Path d="M22 10 C28 8 32 12 30 18 L22 18 Z" fill={`url(#${p}yellow)`} {...ol('#5A3A00', 1.2)} />
      <Path d="M30 13 L37 15 L30 17 Z" fill="#FFB938" {...ol('#7A4A00', 1)} />
      <Circle cx={27} cy={13} r={1.4} fill="#1A0A00" />
      <Path d="M28 18 C30 22 28 24 26 22" fill="#E8304F" />
      <Path d="M14 34 L14 38 M22 34 L22 38" stroke="#FFB938" strokeWidth={2.2} />
    </At>
  ),
  despertador: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Circle cx={10} cy={8} r={5} fill={`url(#${p}red)`} {...ol('#5A0A18', 1.4)} />
      <Circle cx={30} cy={8} r={5} fill={`url(#${p}red)`} {...ol('#5A0A18', 1.4)} />
      <Path d="M10 34 L6 38 M30 34 L34 38" stroke="#3A3A3A" strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={20} cy={22} r={14} fill={`url(#${p}red)`} {...ol('#5A0A18', 1.8)} />
      <Circle cx={20} cy={22} r={10.5} fill="#FFFDF5" />
      <Path d="M20 22 L20 15 M20 22 L25 24" stroke="#1A1A2A" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M2 14 L0 12 M38 14 L40 12 M2 20 L-1 20 M38 20 L41 20" stroke="#FFD93D" strokeWidth={1.6} />
    </At>
  ),
  cafe: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M14 4 C12 8 16 10 14 14 M22 2 C20 6 24 8 22 12" stroke="#FFFFFF" strokeWidth={1.6} fill="none" opacity={0.75} />
      <Ellipse cx={20} cy={34} rx={16} ry={4} fill={`url(#${p}plate)`} {...ol('#7A8AA8', 1.2)} />
      <Path d="M8 16 L32 16 L29 32 C28 34 12 34 11 32 Z" fill={`url(#${p}plate)`} {...ol('#7A8AA8', 1.6)} />
      <Path d="M32 19 C38 19 38 27 31 27" stroke="#9AA4B8" strokeWidth={2.4} fill="none" />
      <Ellipse cx={20} cy={16} rx={12} ry={3} fill="#5A2A0A" />
      <Path d="M12 22 L28 22" stroke="#2E8AE0" strokeWidth={1.6} />
    </At>
  ),
};

/* ---------------------------------------------------------------- paella */
export const PaellaIcon: Record<string, (i: Ic) => React.ReactElement> = {
  limon: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M4 22 C4 10 18 6 26 8 C34 10 38 18 36 24 C34 32 22 36 14 34 C8 32 4 28 4 22 Z" fill={`url(#${p}yellow)`} {...ol('#7A5A00', 1.8)} />
      <Path d="M30 8 C32 4 36 2 38 4 C36 8 32 10 30 8 Z" fill={`url(#${p}green)`} />
      {[[12, 18], [18, 26], [26, 20], [22, 14], [28, 28]].map(([a, b], k) => <Circle key={k} cx={a} cy={b} r={0.8} fill="#C89A00" />)}
      {shine('M8 18 Q12 11 20 10 Q13 14 11 21 Z', 0.6)}
    </At>
  ),
  gamba: (i) => TapaIcons[4](i),
  mejillon: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M6 32 C2 22 10 6 24 4 C34 4 36 12 30 18 C24 26 16 32 6 32 Z" fill={`url(#${p}iron)`} {...ol('#000000', 1.8)} />
      <Path d="M10 28 C10 20 16 12 24 10 C30 10 30 14 26 18 C20 24 16 28 10 28 Z" fill={`url(#${p}orange)`} />
      <Path d="M8 30 C12 22 20 12 30 8" stroke="#6A6A8A" strokeWidth={1.2} fill="none" />
      {shine('M10 22 Q14 12 22 8 Q15 14 12 24 Z', 0.4)}
    </At>
  ),
  azafran: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M20 22 L20 38" stroke="#2A8A3A" strokeWidth={2} />
      <Path d="M20 22 C10 20 6 10 10 4 C14 10 18 14 20 22 Z M20 22 C30 20 34 10 30 4 C26 10 22 14 20 22 Z M20 22 C16 14 16 6 20 2 C24 6 24 14 20 22 Z" fill={`url(#${p}purple)`} {...ol('#2A0A5A', 1.4)} />
      <Path d="M20 20 L14 8 M20 20 L20 6 M20 20 L26 8" stroke="#E8301F" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={14} cy={8} r={1.4} fill="#FF6A1F" /><Circle cx={20} cy={6} r={1.4} fill="#FF6A1F" /><Circle cx={26} cy={8} r={1.4} fill="#FF6A1F" />
    </At>
  ),
  langosta: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M14 4 C8 -2 2 4 6 10 C8 8 10 8 12 10 M26 4 C32 -2 38 4 34 10 C32 8 30 8 28 10" fill={`url(#${p}red)`} {...ol('#5A0A10', 1.4)} />
      <Path d="M14 10 C14 6 26 6 26 10 L28 22 C28 30 24 36 20 38 C16 36 12 30 12 22 Z" fill={`url(#${p}red)`} {...ol('#5A0A10', 1.8)} />
      <Path d="M13 18 L27 18 M13 24 L27 24 M14 30 L26 30" stroke="#FFB0B0" strokeWidth={1.2} />
      <Path d="M18 8 C14 2 10 0 8 0 M22 8 C26 2 30 0 32 0" stroke="#8A0A1A" strokeWidth={1} fill="none" />
      <Circle cx={17} cy={11} r={1.2} fill="#1A0000" /><Circle cx={23} cy={11} r={1.2} fill="#1A0000" />
      {shine('M15 14 Q16 10 20 9 Q17 12 16 18 Z', 0.5)}
    </At>
  ),
  paellera: ({ p, x, y, s }) => (
    <At x={x} y={y} s={s}>
      <Path d="M0 20 L6 18 M40 20 L34 18" stroke="#8A4E04" strokeWidth={3.4} strokeLinecap="round" />
      <Ellipse cx={20} cy={21} rx={16} ry={11} fill={`url(#${p}goldD)`} {...ol('#6A3A00', 1.8)} />
      <Ellipse cx={20} cy={20} rx={12.5} ry={8} fill={`url(#${p}rice)`} />
      <Circle cx={15} cy={19} r={1.8} fill="#E8304F" /><Circle cx={24} cy={22} r={1.8} fill="#3DBA4A" /><Circle cx={22} cy={17} r={1.4} fill="#FF8A1C" />
      <Path d="M20 2 L21.4 6 L25 6.4 L22.2 8.8 L23 12.4 L20 10.4 L17 12.4 L17.8 8.8 L15 6.4 L18.6 6 Z" fill="#FFFFFF" />
    </At>
  ),
};

/* ---------------------------------------------------------------- playa */
/** A life ring with a number (Sol y Playa). */
export function LifeRing({ p, x, y, r, n, win }: { p: string; x: number; y: number; r: number; n: number; win?: boolean }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill={`url(#${p}red)`} {...ol('#5A0A18', 1.6)} />
      {[45, 135, 225, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        return <Path key={a} d={`M${x + Math.cos(rad - 0.32) * r} ${y + Math.sin(rad - 0.32) * r} A${r} ${r} 0 0 1 ${x + Math.cos(rad + 0.32) * r} ${y + Math.sin(rad + 0.32) * r} L${x + Math.cos(rad + 0.42) * r * 0.55} ${y + Math.sin(rad + 0.42) * r * 0.55} A${r * 0.55} ${r * 0.55} 0 0 0 ${x + Math.cos(rad - 0.42) * r * 0.55} ${y + Math.sin(rad - 0.42) * r * 0.55} Z`} fill="#FFFFFF" />;
      })}
      <Circle cx={x} cy={y} r={r * 0.55} fill={win ? '#FFE58A' : '#FFFDF5'} {...ol('#5A0A18', 1.2)} />
      <Path d={`M${x - r * 0.7} ${y - r * 0.55} A${r * 0.9} ${r * 0.9} 0 0 1 ${x + r * 0.2} ${y - r * 0.88}`} stroke="#FFFFFF" strokeWidth={1.6} fill="none" opacity={0.7} />
      <NumberText x={x} y={y + r * 0.2} size={r * 0.62} text={`${n}`} color="#0B3A8A" />
    </G>
  );
}

/** A bright sun disc holding a winning number. */
export function SunDisc({ p, x, y, r, n, win }: { p: string; x: number; y: number; r: number; n: number; win?: boolean }) {
  const rays = Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2;
    const a1 = a - 0.11, a2 = a + 0.11;
    return `M${x + Math.cos(a1) * r * 0.92} ${y + Math.sin(a1) * r * 0.92} L${x + Math.cos(a) * r * 1.28} ${y + Math.sin(a) * r * 1.28} L${x + Math.cos(a2) * r * 0.92} ${y + Math.sin(a2) * r * 0.92} Z`;
  }).join(' ');
  return (
    <G>
      <Path d={rays} fill={`url(#${p}orange)`} {...ol('#8A3A00', 1)} />
      <Circle cx={x} cy={y} r={r} fill={`url(#${p}yellow)`} {...ol('#8A5200', 1.8)} />
      {win ? <Circle cx={x} cy={y} r={r * 0.82} fill="#FFFFFF" opacity={0.5} /> : null}
      {shine(`M${x - r * 0.7} ${y - r * 0.2} Q${x - r * 0.5} ${y - r * 0.8} ${x + r * 0.1} ${y - r * 0.85} Q${x - r * 0.4} ${y - r * 0.5} ${x - r * 0.55} ${y} Z`, 0.55)}
      <NumberText x={x} y={y + r * 0.26} size={r * 0.78} text={`${n}`} color="#7A2A00" />
    </G>
  );
}

/** A seashell (decor). */
export function Shell({ x, y, s = 1, color = '#FFC2A8' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path d="M0 10 C-12 6 -12 -10 0 -12 C12 -10 12 6 0 10 Z" fill={color} {...ol('#A85A3A', 1.2)} />
      <Path d="M0 10 L-7 -6 M0 10 L-3 -10 M0 10 L3 -10 M0 10 L7 -6" stroke="#A85A3A" strokeWidth={1} />
      <Path d="M-4 10 L4 10 L2 14 L-2 14 Z" fill={color} {...ol('#A85A3A', 1)} />
    </G>
  );
}

/** Big amount text with a dark outline, used for every number on the tickets. */
export function NumberText({ x, y, size, text, color, outline = '#FFFFFF' }: { x: number; y: number; size: number; text: string; color: string; outline?: string }) {
  const font = 'Arial Black, Helvetica Neue, Arial, sans-serif';
  return (
    <G>
      <SvgText x={x} y={y} fontSize={size} fontWeight="900" fontFamily={font} textAnchor="middle" fill={outline} stroke={outline} strokeWidth={size * 0.18} strokeLinejoin="round">{text}</SvgText>
      <SvgText x={x} y={y} fontSize={size} fontWeight="900" fontFamily={font} textAnchor="middle" fill={color}>{text}</SvgText>
    </G>
  );
}
