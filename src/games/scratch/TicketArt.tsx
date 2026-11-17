import React from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { ScratchCardId, ScratchLayout } from '@/engine/games/scratch.ts';
import { PAELLA_PAYS, SCRATCH } from '@/engine/games/scratch.ts';
import { GameText, Glint, dg, ol, rg, vg } from '../lineslot/art/kit';
import { FeriaIcon, LifeRing, NumberText, PaellaIcon, Shell, SiestaIcon, SunDisc, TapaIcons } from './icons';
import { PAN, SPOTS, TH, TW, amount, spotCenter } from './geometry';

const FONT = 'Arial Black, Helvetica Neue, Arial, sans-serif';
const rnd = (i: number, salt: number) => ((Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1;

/** Ticket outline: rounded corners and the two notches of the tear-off stub. */
export const OUTLINE = `M18 0 H282 Q300 0 300 18 V362 A10 10 0 0 0 300 382 V422 Q300 440 282 440 H18 Q0 440 0 422 V382 A10 10 0 0 0 0 362 V18 Q0 0 18 0 Z`;

/** Many circles as one path (lunares, stars, bubbles). */
const dots = (pts: [number, number, number][]) => pts.map(([x, y, r]) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`).join(' ');
const star = (x: number, y: number, r: number) => `M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`;

/** Gold rosette with the price. */
function PriceBadge({ p, price, ink }: { p: string; price: number; ink: string }) {
  const cx = 256, cy = 40, n = 18;
  const d = Array.from({ length: n * 2 }, (_, k) => {
    const a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = k % 2 ? 24 : 29;
    return `${k ? 'L' : 'M'}${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`;
  }).join(' ') + ' Z';
  return (
    <G>
      <Path d={d} fill="#000000" opacity={0.25} transform="translate(1.5 2.5)" />
      <Path d={d} fill={`url(#${p}gold)`} {...ol('#6A3A00', 1.6)} />
      <Circle cx={cx} cy={cy} r={20} fill={ink} {...ol('#FFF3C0', 1.6)} />
      <Circle cx={cx} cy={cy} r={16.5} fill="none" stroke="#FFF3C0" strokeWidth={0.8} strokeDasharray="1.6 1.8" />
      <SvgText x={cx} y={cy + (price >= 1000 ? 3 : 4)} fontSize={price >= 1000 ? 11 : 14} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#FFFFFF">{amount(price)}</SvgText>
      <SvgText x={cx} y={cy + 13} fontSize={5.4} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#FFE58A" letterSpacing={0.6}>FICHAS</SvgText>
      <Glint x={cx - 14} y={cy - 16} s={0.5} />
    </G>
  );
}

/** Stub under the perforation: how to win, serial number and barcode. */
function Stub({ p, ink, paper, serial, howTo, card }: { p: string; ink: string; paper: string; serial: string; howTo: string; card: ScratchCardId }) {
  const bars: string[] = [];
  let x = 186;
  for (let k = 0; x < 282; k++) {
    const w = 0.8 + Math.floor(rnd(k, serial.length + card.length) * 3) * 0.8;
    bars.push(`M${x} 404 h${w} v24 h${-w} Z`);
    x += w + 1 + rnd(k, 9) * 1.6;
  }
  return (
    <G>
      <Path d="M0 372 H300 V422 Q300 440 282 440 H18 Q0 440 0 422 Z" fill={paper} />
      <Path d="M12 372 H288" stroke={ink} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.6} />
      <SvgText x={150} y={391} fontSize={9.2} fontWeight="700" fontFamily="Helvetica Neue, Arial, sans-serif" textAnchor="middle" fill={ink}>{howTo}</SvgText>
      <SvgText x={20} y={414} fontSize={7.6} fontWeight="900" fontFamily={FONT} fill={ink} letterSpacing={0.8}>{`Nº ${serial}`}</SvgText>
      <SvgText x={20} y={427} fontSize={6.2} fontWeight="700" fontFamily="Helvetica Neue, Arial, sans-serif" fill={ink} opacity={0.7}>CASHINO · fichas de juego sin valor</SvgText>
      <Rect x={182} y={400} width={104} height={32} rx={3} fill="#FFFFFF" />
      <Path d={bars.join(' ')} fill="#14101E" />
      <Circle cx={150} cy={420} r={6} fill={`url(#${p}gold)`} {...ol('#6A3A00', 0.8)} />
      <Path d={star(150, 420, 3.6)} fill="#FFFFFF" />
    </G>
  );
}

/** Ribbon label across the ticket (section titles). */
function Band({ p, x, y, w, text, color, dark, size = 8.4 }: { p: string; x: number; y: number; w: number; text: string; color: string; dark: string; size?: number }) {
  return (
    <G>
      <Path d={`M${x - 8} ${y - 6} L${x} ${y - 9} L${x} ${y + 7} L${x - 8} ${y + 9} L${x - 4} ${y + 1} Z M${x + w + 8} ${y - 6} L${x + w} ${y - 9} L${x + w} ${y + 7} L${x + w + 8} ${y + 9} L${x + w + 4} ${y + 1} Z`} fill={dark} />
      <Rect x={x} y={y - 9} width={w} height={16} rx={2} fill={color} {...ol(dark, 1.2)} />
      <Path d={`M${x + 3} ${y - 6.5} H${x + w - 3}`} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.2} />
      <SvgText x={x + w / 2} y={y + 2.8} fontSize={size} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#FFFFFF" letterSpacing={0.5}>{text}</SvgText>
      {p ? null : null}
    </G>
  );
}

/** Well under a spot (what you see once the foil is gone). */
function Wells({ card, fill, edge }: { card: ScratchCardId; fill: string; edge: string }) {
  return (
    <G>
      {SPOTS[card].map((s, i) =>
        s.kind === 'rect' ? (
          <G key={i}>
            <Rect x={s.x - 2} y={s.y - 2} width={s.w + 4} height={s.h + 4} rx={s.r + 2} fill={edge} />
            <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={fill} />
            <Rect x={s.x} y={s.y} width={s.w} height={6} rx={3} fill="#000000" opacity={0.06} />
          </G>
        ) : (
          <G key={i}>
            <Circle cx={s.cx} cy={s.cy} r={s.r + 2.2} fill={edge} />
            <Circle cx={s.cx} cy={s.cy} r={s.r} fill={fill} />
          </G>
        ),
      )}
    </G>
  );
}

/* ================================================================ backgrounds */

function TapasBg({ p }: { p: string }) {
  // azulejo tiles in the header: blue flower, yellow corners
  const tiles: string[] = [], petals: string[] = [], corners: string[] = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 12; c++) {
      const x = c * 25, y = r * 25, m = 12.5;
      tiles.push(`M${x + 0.6} ${y + 0.6} h23.8 v23.8 h-23.8 Z`);
      petals.push(`M${x + m} ${y + 3} Q${x + m + 4} ${y + m - 4} ${x + m} ${y + m} Q${x + m - 4} ${y + m - 4} ${x + m} ${y + 3} Z M${x + m} ${y + 22} Q${x + m + 4} ${y + m + 4} ${x + m} ${y + m} Q${x + m - 4} ${y + m + 4} ${x + m} ${y + 22} Z M${x + 3} ${y + m} Q${x + m - 4} ${y + m - 4} ${x + m} ${y + m} Q${x + m - 4} ${y + m + 4} ${x + 3} ${y + m} Z M${x + 22} ${y + m} Q${x + m + 4} ${y + m - 4} ${x + m} ${y + m} Q${x + m + 4} ${y + m + 4} ${x + 22} ${y + m} Z`);
      corners.push(dots([[x, y, 4], [x + 25, y, 4], [x, y + 25, 4], [x + 25, y + 25, 4]]));
    }
  return (
    <G>
      <Rect x={0} y={0} width={TW} height={TH} fill={`url(#${p}tapBg)`} />
      <Path d={tiles.join(' ')} fill="#F6F1E4" />
      <Path d={petals.join(' ')} fill="#1F55B0" opacity={0.9} />
      <Path d={corners.join(' ')} fill="#F2B21C" opacity={0.85} />
      <Rect x={0} y={0} width={TW} height={150} fill="#7A1A06" opacity={0.18} />
      {/* terracotta arch with the title sign */}
      <Path d="M30 140 L30 66 Q150 -6 270 66 L270 140 Z" fill={`url(#${p}tapArch)`} {...ol('#5A1A04', 2.4)} />
      <Path d="M40 140 L40 70 Q150 6 260 70 L260 140" fill="none" stroke="#F6C89A" strokeWidth={1.4} opacity={0.6} />
      {/* hanging hams on the bar */}
      {[52, 248].map((x, k) => (
        <G key={k}>
          <Path d={`M${x} 52 L${x} 62`} stroke="#3A1A06" strokeWidth={1.6} />
          <Path d={`M${x - 8} 62 C${x - 12} 80 ${x - 6} 100 ${x} 104 C${x + 6} 100 ${x + 12} 80 ${x + 8} 62 Z`} fill={`url(#${p}red)`} {...ol('#4A0A10', 1.6)} />
          <Path d={`M${x - 4} 70 C${x - 6} 82 ${x - 2} 94 ${x} 98`} stroke="#FFE0E6" strokeWidth={1.4} fill="none" opacity={0.7} />
          <Rect x={x - 4} y={60} width={8} height={4} rx={1} fill={`url(#${p}gold)`} />
        </G>
      ))}
      <GameText x={150} y={86} text="TAPAS" size={40} fill={`url(#${p}gold)`} stroke="#3A0E02" sw={6} ls={1} />
      <Path d="M88 98 L212 98 L206 120 L94 120 Z" fill={`url(#${p}red)`} {...ol('#4A0A10', 1.6)} />
      <Path d="M80 101 L90 99 L94 120 L80 122 L86 111 Z M220 101 L210 99 L206 120 L220 122 L214 111 Z" fill="#8A0A24" />
      <SvgText x={150} y={114} fontSize={13} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#FFE58A" letterSpacing={3}>DE ORO</SvgText>
      {/* wooden board that holds the play area */}
      <Rect x={14} y={142} width={272} height={224} rx={16} fill={`url(#${p}brown)`} {...ol('#2A0E02', 2)} />
      {[160, 196, 232, 268, 304, 340].map((y, k) => <Path key={k} d={`M22 ${y} C90 ${y - 6} 200 ${y + 6} 278 ${y - 2}`} stroke="#3E1A06" strokeWidth={1} fill="none" opacity={0.5} />)}
      <SvgText x={150} y={155} fontSize={8} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#FFE0B0" letterSpacing={0.6}>3 IMPORTES IGUALES = ¡PREMIO!</SvgText>
      <Wells card="tapas" fill="#FFF7E6" edge="#2A0E02" />
    </G>
  );
}

function PlayaBg({ p }: { p: string }) {
  const sand: [number, number, number][] = Array.from({ length: 70 }, (_, k) => [8 + rnd(k, 1) * 284, 140 + rnd(k, 2) * 230, 0.8 + rnd(k, 3) * 0.8]);
  return (
    <G>
      <Rect x={0} y={0} width={TW} height={TH} fill="#F7DFA6" />
      <Path d={dots(sand)} fill="#D9A85A" opacity={0.55} />
      <Rect x={0} y={0} width={TW} height={110} fill={`url(#${p}sky)`} />
      {/* the sun */}
      <Circle cx={56} cy={46} r={40} fill={`url(#${p}glow)`} />
      {Array.from({ length: 12 }, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        return <Path key={k} d={`M${56 + Math.cos(a - 0.12) * 24} ${46 + Math.sin(a - 0.12) * 24} L${56 + Math.cos(a) * 36} ${46 + Math.sin(a) * 36} L${56 + Math.cos(a + 0.12) * 24} ${46 + Math.sin(a + 0.12) * 24} Z`} fill="#FFB938" />;
      })}
      <Circle cx={56} cy={46} r={22} fill={`url(#${p}yellow)`} {...ol('#C86A00', 1.6)} />
      <Path d="M48 44 Q50 48 53 44 M59 44 Q61 48 64 44" stroke="#7A3A00" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M50 52 Q56 58 62 52" stroke="#7A3A00" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Ellipse cx={46} cy={51} rx={3} ry={1.8} fill="#FF7A5A" opacity={0.6} />
      <Ellipse cx={66} cy={51} rx={3} ry={1.8} fill="#FF7A5A" opacity={0.6} />
      {/* gulls */}
      <Path d="M150 30 Q155 25 160 30 Q165 25 170 30 M182 18 Q186 14 190 18 Q194 14 198 18" stroke="#3A3A5A" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {/* sea */}
      <Path d="M0 96 C30 90 60 102 90 96 C120 90 150 102 180 96 C210 90 240 102 270 96 C285 93 295 96 300 96 L300 136 L0 136 Z" fill={`url(#${p}sea)`} />
      <Path d="M0 108 C30 102 60 114 90 108 C120 102 150 114 180 108 C210 102 240 114 270 108 C285 105 295 108 300 108" stroke="#FFFFFF" strokeWidth={1.6} fill="none" opacity={0.7} />
      <Path d="M0 136 C40 128 80 142 120 134 C160 126 200 142 240 134 C270 128 290 134 300 134 L300 142 L0 142 Z" fill="#FFFFFF" opacity={0.85} />
      {/* beach umbrella */}
      <G transform="translate(236 132) scale(0.72) translate(-228 -128)">
      <Path d="M228 128 L240 70" stroke="#5A3A1A" strokeWidth={2.4} />
      <Path d="M206 80 C214 54 262 54 274 82 C264 76 254 78 248 84 C240 76 230 76 222 84 C216 78 210 78 206 80 Z" fill={`url(#${p}red)`} {...ol('#5A0A18', 1.4)} />
      <Path d="M222 84 C226 70 234 60 240 58 C240 66 242 76 248 84" fill="#FFFFFF" />
      </G>
      <GameText x={146} y={64} text="SOL Y PLAYA" size={30} fill="#FFFFFF" stroke="#0B4A8A" sw={6} />
      <Shell x={22} y={350} s={0.9} />
      <Shell x={282} y={226} s={0.7} color="#FFE0C8" />
      {/* towel under "your numbers" */}
      <Rect x={14} y={228} width={272} height={142} rx={12} fill="#FFFFFF" {...ol('#0B4A8A', 1.6)} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <Rect key={k} x={14 + k * 34} y={228} width={17} height={142} fill="#2EB4E8" opacity={0.18} />)}
      <Band p={p} x={70} y={148} w={160} text="NÚMEROS GANADORES" color="#E8304F" dark="#7A0A20" />
      <Band p={p} x={60} y={224} w={180} text="TUS NÚMEROS · TU PREMIO" color="#2E8AE0" dark="#0B3A8A" />
      <Wells card="playa" fill="#FFFDF2" edge="#0B4A8A" />
    </G>
  );
}

function FeriaBg({ p }: { p: string }) {
  const lunares: [number, number, number][] = [];
  for (let r = 0; r < 22; r++) for (let c = 0; c < 15; c++) lunares.push([c * 22 + (r % 2 ? 11 : 0), r * 20, 4.2]);
  const colors = ['#E8304F', '#3DBA4A', '#FFD93D', '#2E8AE0', '#FF8A1C', '#E8304F', '#3DBA4A'];
  return (
    <G>
      <Rect x={0} y={0} width={TW} height={TH} fill="#FFFDF8" />
      <Path d={dots(lunares)} fill="#E8304F" opacity={0.85} />
      <Rect x={0} y={0} width={TW} height={TH} fill="#FFFFFF" opacity={0.15} />
      {/* string of paper lanterns */}
      <Path d="M-4 20 Q150 60 304 20" stroke="#3A2A1A" strokeWidth={1.4} fill="none" />
      {colors.map((col, k) => {
        const x = 22 + k * 42, y = 20 + Math.sin((x / 300) * Math.PI) * 20 * 1.0;
        return (
          <G key={k}>
            <Path d={`M${x - 9} ${y + 3} C${x - 14} ${y + 12} ${x - 14} ${y + 18} ${x - 9} ${y + 26} L${x + 9} ${y + 26} C${x + 14} ${y + 18} ${x + 14} ${y + 12} ${x + 9} ${y + 3} Z`} fill={col} {...ol('#3A1A10', 1.2)} />
            <Path d={`M${x - 4} ${y + 3} C${x - 6} ${y + 12} ${x - 6} ${y + 18} ${x - 4} ${y + 26} M${x + 4} ${y + 3} C${x + 6} ${y + 12} ${x + 6} ${y + 18} ${x + 4} ${y + 26}`} stroke="#FFFFFF" strokeWidth={1} fill="none" opacity={0.7} />
            <Rect x={x - 5} y={y + 1} width={10} height={3} fill="#2A2A2A" />
            <Rect x={x - 5} y={y + 25} width={10} height={3} fill="#2A2A2A" />
          </G>
        );
      })}
      {/* flamenco ruffle behind the title */}
      <Path d="M20 70 Q40 58 60 70 Q80 58 100 70 Q120 58 140 70 Q160 58 180 70 Q200 58 220 70 Q240 58 260 70 Q280 58 290 66 L290 128 L20 128 Z" fill={`url(#${p}red)`} {...ol('#6A0A18', 1.6)} />
      <Path d="M20 128 Q40 138 60 128 Q80 138 100 128 Q120 138 140 128 Q160 138 180 128 Q200 138 220 128 Q240 138 260 128 Q280 138 290 128" fill="none" stroke="#6A0A18" strokeWidth={1.6} />
      <Path d={dots([[44, 80, 3], [96, 110, 3], [150, 82, 3], [206, 112, 3], [262, 84, 3], [70, 118, 2.4], [236, 96, 2.4]])} fill="#FFFFFF" opacity={0.85} />
      <GameText x={150} y={104} text="FERIA" size={38} fill={`url(#${p}yellow)`} stroke="#5A0A14" sw={6} ls={2} />
      <Band p={p} x={96} y={124} w={108} text="DE ABRIL" color="#3DBA4A" dark="#14602A" size={10} />
      {/* play panel with ruffled edge */}
      <Rect x={14} y={140} width={272} height={228} rx={14} fill="#FFFFFF" {...ol('#B0102E', 2)} />
      {/* awnings (casetas) above each spot */}
      {SPOTS.feria.slice(0, 6).map((s, i) => {
        if (s.kind !== 'rect') return null;
        const x0 = s.x - 4, w = s.w + 8, y0 = s.y - 16;
        const stripes = Array.from({ length: 6 }, (_, k) => <Rect key={k} x={x0 + (k * w) / 6} y={y0} width={w / 12} height={12} fill={i % 2 ? '#3DBA4A' : '#E8304F'} />);
        return (
          <G key={i}>
            <Rect x={x0} y={y0} width={w} height={12} fill="#FFFFFF" {...ol('#6A0A18', 1)} />
            {stripes}
            <Path d={`M${x0} ${y0 + 12} ${Array.from({ length: 6 }, (_, k) => `Q${x0 + ((k + 0.5) * w) / 6} ${y0 + 18} ${x0 + ((k + 1) * w) / 6} ${y0 + 12}`).join(' ')}`} fill={i % 2 ? '#3DBA4A' : '#E8304F'} {...ol('#6A0A18', 1)} />
          </G>
        );
      })}
      {/* prize box */}
      <Rect x={28} y={308} width={244} height={58} rx={14} fill={`url(#${p}gold)`} {...ol('#6A3A00', 1.6)} />
      <SvgText x={68} y={334} fontSize={11} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#5A1A00">PREMIO</SvgText>
      <SvgText x={68} y={348} fontSize={6.6} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#5A1A00">3 FAROLILLOS</SvgText>
      <Wells card="feria" fill="#FFF8EC" edge="#6A0A18" />
    </G>
  );
}

function SiestaBg({ p }: { p: string }) {
  const stars = Array.from({ length: 34 }, (_, k) => star(10 + rnd(k, 4) * 280, 8 + rnd(k, 5) * 250, 1.4 + rnd(k, 6) * 2.4)).join(' ');
  return (
    <G>
      <Rect x={0} y={0} width={TW} height={TH} fill={`url(#${p}night)`} />
      <Path d={stars} fill="#FFF6C2" opacity={0.85} />
      {/* big crescent moon */}
      <Circle cx={44} cy={46} r={34} fill={`url(#${p}glow)`} opacity={0.6} />
      <Path d="M54 16 C34 16 22 32 22 46 C22 62 36 76 54 74 C40 68 34 58 34 46 C34 34 42 22 54 16 Z" fill={`url(#${p}gold)`} {...ol('#7A4A00', 1.6)} />
      {/* hammock between two palms */}
      <Path d="M206 132 C204 100 210 70 222 50 M286 132 C284 104 280 80 276 56" stroke="#5A3A1A" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M222 50 C210 40 196 44 192 50 C204 46 214 48 222 50 Z M222 50 C230 36 244 36 250 42 C238 42 230 46 222 50 Z M276 56 C270 44 256 44 252 50 C262 48 270 52 276 56 Z M276 56 C284 46 296 48 298 54 C290 52 282 54 276 56 Z" fill={`url(#${p}green)`} />
      <Path d="M214 96 C230 124 262 126 280 98" stroke="#FFD34D" strokeWidth={9} fill="none" strokeLinecap="round" />
      <Path d="M214 96 C230 124 262 126 280 98" stroke="#E8304F" strokeWidth={9} strokeDasharray="6 6" fill="none" />
      <Circle cx={232} cy={104} r={6} fill="#F2C8A0" />
      <Path d="M226 100 C228 94 238 94 240 100 Z" fill="#E8C060" />
      <SvgText x={252} y={86} fontSize={11} fontWeight="900" fontFamily={FONT} fill="#FFFFFF" opacity={0.85}>z</SvgText>
      <SvgText x={262} y={74} fontSize={14} fontWeight="900" fontFamily={FONT} fill="#FFFFFF" opacity={0.7}>Z</SvgText>
      <GameText x={124} y={68} text="SIESTA" size={34} fill={`url(#${p}gold)`} stroke="#120A3A" sw={6} ls={1} />
      <Band p={p} x={60} y={90} w={130} text="MILLONARIA" color="#8A4FE0" dark="#2A0A6A" size={11} />
      {/* bed: headboard and blanket for the pillows */}
      <Rect x={14} y={242} width={272} height={124} rx={18} fill={`url(#${p}purple)`} {...ol('#14082A', 2)} />
      <Path d="M14 300 C80 290 220 310 286 296 L286 352 Q286 366 272 366 L28 366 Q14 366 14 352 Z" fill="#2A1A6A" opacity={0.6} />
      <SvgText x={150} y={256} fontSize={8} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#FFE58A" letterSpacing={0.4}>LA LUNA BAJO LA ALMOHADA = ¡PREMIO!</SvgText>
      <Rect x={52} y={136} width={196} height={108} rx={24} fill="#14082A" opacity={0.55} />
      <Wells card="siesta" fill="#FFF8E6" edge="#FFD34D" />
    </G>
  );
}

function PaellaBg({ p }: { p: string }) {
  // blue-and-white kitchen tablecloth
  const checks: string[] = [];
  for (let r = 0; r < 20; r++) for (let c = 0; c < 14; c++) if ((r + c) % 2 === 0) checks.push(`M${c * 22} ${130 + r * 22} h22 v22 h-22 Z`);
  return (
    <G>
      <Rect x={0} y={0} width={TW} height={TH} fill="#FFFFFF" />
      <Path d={checks.join(' ')} fill="#2E6AD0" opacity={0.28} />
      <Rect x={0} y={0} width={TW} height={130} fill={`url(#${p}paeSky)`} />
      {/* orange-tree branches */}
      <Path d="M-4 18 C30 26 50 20 74 34 M300 10 C270 20 252 14 230 30" stroke="#5A3A1A" strokeWidth={3} fill="none" />
      {[[20, 24], [46, 28], [64, 36], [282, 16], [252, 24], [236, 34]].map(([x, y], k) => (
        <G key={k}>
          <Path d={`M${x} ${y} C${x - 10} ${y - 10} ${x - 2} ${y - 16} ${x + 6} ${y - 8} Z`} fill={`url(#${p}green)`} />
          <Circle cx={x + 2} cy={y + 8} r={6.5} fill={`url(#${p}orange)`} {...ol('#8A3A00', 1)} />
          <Circle cx={x} cy={y + 6} r={1.6} fill="#FFFFFF" opacity={0.6} />
        </G>
      ))}
      <GameText x={150} y={62} text="PAELLA" size={38} fill={`url(#${p}rice)`} stroke="#6A1A00" sw={6} ls={2} />
      <Path d="M70 74 L230 74 L222 96 L78 96 Z" fill={`url(#${p}red)`} {...ol('#5A0A14', 1.6)} />
      <SvgText x={150} y={90} fontSize={13} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#FFE58A" letterSpacing={2.4}>PREMIADA</SvgText>
      <SvgText x={150} y={118} fontSize={8} fontWeight="900" fontFamily={FONT} textAnchor="middle" fill="#7A2A00" letterSpacing={0.4}>3 INGREDIENTES IGUALES = SU PREMIO</SvgText>
      {/* the pan: handles, rim, rice */}
      <Path d={`M${PAN.cx - PAN.r - 26} ${PAN.cy - 10} L${PAN.cx - PAN.r + 4} ${PAN.cy - 6} M${PAN.cx + PAN.r + 26} ${PAN.cy - 10} L${PAN.cx + PAN.r - 4} ${PAN.cy - 6}`} stroke="#1A1A22" strokeWidth={9} strokeLinecap="round" />
      <Path d={`M${PAN.cx - PAN.r - 26} ${PAN.cy - 10} L${PAN.cx - PAN.r + 4} ${PAN.cy - 6} M${PAN.cx + PAN.r + 26} ${PAN.cy - 10} L${PAN.cx + PAN.r - 4} ${PAN.cy - 6}`} stroke="#5A5A6A" strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={PAN.cx} cy={PAN.cy + 6} rx={PAN.r + 6} ry={PAN.r + 4} fill="#000000" opacity={0.25} />
      <Circle cx={PAN.cx} cy={PAN.cy} r={PAN.r + 4} fill={`url(#${p}iron)`} {...ol('#000000', 2)} />
      <Circle cx={PAN.cx} cy={PAN.cy} r={PAN.r - 6} fill={`url(#${p}paeRice)`} />
      {Array.from({ length: 60 }, (_, k) => {
        const a = rnd(k, 7) * Math.PI * 2, d = Math.sqrt(rnd(k, 8)) * (PAN.r - 12);
        const x = PAN.cx + Math.cos(a) * d, y = PAN.cy + Math.sin(a) * d;
        return <Ellipse key={k} cx={x} cy={y} rx={2.2} ry={1.2} fill="#FFF6C8" transform={`rotate(${rnd(k, 9) * 180} ${x} ${y})`} />;
      })}
      {/* lemon wedge and parsley in the middle */}
      <Path d={`M${PAN.cx - 14} ${PAN.cy + 4} A14 14 0 0 1 ${PAN.cx + 14} ${PAN.cy + 4} Z`} fill={`url(#${p}yellow)`} {...ol('#7A5A00', 1.4)} />
      <Path d={`M${PAN.cx} ${PAN.cy + 4} L${PAN.cx - 8} ${PAN.cy - 6} M${PAN.cx} ${PAN.cy + 4} L${PAN.cx} ${PAN.cy - 9} M${PAN.cx} ${PAN.cy + 4} L${PAN.cx + 8} ${PAN.cy - 6}`} stroke="#FFF9C8" strokeWidth={1.2} />
      <Path d={dots([[PAN.cx - 18, PAN.cy + 14, 2.4], [PAN.cx + 16, PAN.cy + 16, 2.4], [PAN.cx + 2, PAN.cy + 20, 2]])} fill="#2A8A3A" />
      <Path d={`M${PAN.cx - PAN.r + 10} ${PAN.cy - 40} A${PAN.r - 2} ${PAN.r - 2} 0 0 1 ${PAN.cx - 30} ${PAN.cy - PAN.r + 6}`} stroke="#FFFFFF" strokeWidth={3} fill="none" opacity={0.25} />
      {/* pay table */}
      <Rect x={14} y={334} width={272} height={34} rx={10} fill="#FFF6D8" {...ol('#7A2A00', 1.4)} />
      {Object.entries(PAELLA_PAYS).map(([k, m], i) => {
        const x = 24 + i * 44.6;
        return (
          <G key={k}>
            {PaellaIcon[k]({ p, x: x + 9, y: 351, s: 0.42 })}
            <SvgText x={x + 20} y={355} fontSize={m >= 1000 ? 7 : 8} fontWeight="900" fontFamily={FONT} fill="#7A2A00">{`×${amount(m)}`}</SvgText>
          </G>
        );
      })}
      <Wells card="paella" fill="#FFF4C8" edge="#3A2A10" />
    </G>
  );
}

/** Extra gradients the backgrounds use. */
function BgPaints({ p }: { p: string }) {
  return (
    <Defs>
      {vg(`${p}tapBg`, ['#C8501A', '#8A2A0A'])}
      {vg(`${p}tapArch`, ['#E8784A', '#B8401A', '#7A1A06'])}
      {vg(`${p}sky`, ['#FF9A6A', '#FFD27A', '#9FE4FF'])}
      {vg(`${p}sea`, ['#2EC4E8', '#0B7AB8'])}
      {vg(`${p}paeSky`, ['#FFE9A8', '#FFC93C'])}
      {rg(`${p}paeRice`, ['#FFE070', '#F4B820', '#C8780A'], '0.5', '0.45', '0.6')}
      <ClipPath id={`${p}clip`}><Path d={OUTLINE} /></ClipPath>
      {dg(`${p}x`, ['#000000', '#000000'])}
    </Defs>
  );
}

export const TICKET_STYLE: Record<ScratchCardId, { ink: string; paper: string; badge: string }> = {
  tapas: { ink: '#5A1A04', paper: '#FFF2DA', badge: '#B8401A' },
  playa: { ink: '#0B3A8A', paper: '#E8F8FF', badge: '#2E8AE0' },
  feria: { ink: '#8A0A24', paper: '#FFF2F4', badge: '#E8304F' },
  siesta: { ink: '#2A0A6A', paper: '#EFE8FF', badge: '#3A1480' },
  paella: { ink: '#7A2A00', paper: '#FFF8E0', badge: '#C8501A' },
};

const BG: Record<ScratchCardId, (x: { p: string }) => React.ReactElement> = { tapas: TapasBg, playa: PlayaBg, feria: FeriaBg, siesta: SiestaBg, paella: PaellaBg };

/** The printed ticket: background, title, price, stub and frame. */
export function TicketPrint({ p, card, serial, howTo }: { p: string; card: ScratchCardId; serial: string; howTo: string }) {
  const st = TICKET_STYLE[card];
  const Bg = BG[card];
  return (
    <G>
      <BgPaints p={p} />
      <G clipPath={`url(#${p}clip)`}>
        <Bg p={p} />
        <PriceBadge p={p} price={SCRATCH[card].price} ink={st.badge} />
        <Stub p={p} ink={st.ink} paper={st.paper} serial={serial} howTo={howTo} card={card} />
      </G>
      <Path d={OUTLINE} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} />
      <Path d="M8 22 Q8 8 22 8 H278 Q292 8 292 22" fill="none" stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={1} />
    </G>
  );
}

/* ================================================================ what is under the foil */

function Highlight({ card, i }: { card: ScratchCardId; i: number }) {
  const s = SPOTS[card][i];
  if (s.kind === 'circle') return <Circle cx={s.cx} cy={s.cy} r={s.r - 1.5} fill="#FFE58A" stroke="#FF9A00" strokeWidth={3} />;
  return <Rect x={s.x + 1.5} y={s.y + 1.5} width={s.w - 3} height={s.h - 3} rx={s.r} fill="#FFE58A" stroke="#FF9A00" strokeWidth={3} />;
}

export function TicketContent({ p, card, layout, wins }: { p: string; card: ScratchCardId; layout: ScratchLayout; wins: number[] }) {
  const spots = SPOTS[card];
  const lit = (i: number) => wins.includes(i);
  const hl = wins.map((i) => <Highlight key={`h${i}`} card={card} i={i} />);
  if (layout.kind === 'tapas') {
    return (
      <G>
        {hl}
        {layout.amounts.map((a, i) => {
          const c = spotCenter(spots[i]);
          const Icon = TapaIcons[(i * 5 + a) % TapaIcons.length];
          return (
            <G key={i}>
              <Ellipse cx={c.x} cy={c.y - 7} rx={20} ry={11} fill={`url(#${p}plate)`} {...ol('#1F55B0', 1.4)} />
              <Ellipse cx={c.x} cy={c.y - 7} rx={14} ry={7} fill="none" stroke="#1F55B0" strokeWidth={0.8} opacity={0.6} />
              {Icon({ p, x: c.x, y: c.y - 12, s: 0.5 })}
              <NumberText x={c.x} y={c.y + 20} size={a >= 1000 ? 13 : 15} text={amount(a)} color={lit(i) ? '#B8001E' : '#5A1A04'} />
            </G>
          );
        })}
      </G>
    );
  }
  if (layout.kind === 'playa') {
    return (
      <G>
        {hl}
        {layout.winning.map((n, i) => {
          const c = spotCenter(spots[i]);
          return <SunDisc key={i} p={p} x={c.x} y={c.y} r={15} n={n} win={lit(i)} />;
        })}
        {layout.mine.map((m, i) => {
          const c = spotCenter(spots[i + 2]);
          return (
            <G key={i}>
              <LifeRing p={p} x={c.x} y={c.y - 9} r={17} n={m.n} win={lit(i + 2)} />
              <NumberText x={c.x} y={c.y + 23} size={11} text={amount(m.prize)} color={lit(i + 2) ? '#B8001E' : '#0B3A8A'} />
            </G>
          );
        })}
      </G>
    );
  }
  if (layout.kind === 'feria') {
    const box = spotCenter(spots[6]);
    return (
      <G>
        {hl}
        {layout.symbols.map((sym, i) => {
          const c = spotCenter(spots[i]);
          return <G key={i}>{FeriaIcon[sym]({ p, x: c.x, y: c.y, s: 0.95 })}</G>;
        })}
        <NumberText x={box.x} y={box.y + 8} size={22} text={amount(layout.box)} color={lit(6) ? '#B8001E' : '#6A0A18'} />
      </G>
    );
  }
  if (layout.kind === 'siesta') {
    const h = spotCenter(spots[0]);
    return (
      <G>
        {hl}
        {/* straw hat with the prize on its band */}
        <Ellipse cx={h.x} cy={h.y + 16} rx={78} ry={18} fill={`url(#${p}yellow)`} {...ol('#7A5200', 1.8)} />
        <Path d={`M${h.x - 42} ${h.y + 14} C${h.x - 44} ${h.y - 26} ${h.x + 44} ${h.y - 26} ${h.x + 42} ${h.y + 14} Z`} fill={`url(#${p}yellow)`} {...ol('#7A5200', 1.8)} />
        <Path d={`M${h.x - 42} ${h.y + 2} C${h.x - 20} ${h.y + 8} ${h.x + 20} ${h.y + 8} ${h.x + 42} ${h.y + 2} L${h.x + 42} ${h.y + 14} C${h.x + 20} ${h.y + 20} ${h.x - 20} ${h.y + 20} ${h.x - 42} ${h.y + 14} Z`} fill={`url(#${p}red)`} />
        {Array.from({ length: 7 }, (_, k) => <Path key={k} d={`M${h.x - 36 + k * 12} ${h.y - 14} L${h.x - 32 + k * 12} ${h.y + 2}`} stroke="#C89A20" strokeWidth={0.8} />)}
        <NumberText x={h.x} y={h.y + 13} size={layout.hat >= 10000 ? 11 : 13} text={amount(layout.hat)} color="#FFFFFF" outline="#5A0A18" />
        {layout.pillows.map((k, i) => {
          const c = spotCenter(spots[i + 1]);
          return <G key={i}>{SiestaIcon[k]({ p, x: c.x, y: c.y, s: 1.3 })}</G>;
        })}
      </G>
    );
  }
  return (
    <G>
      {hl}
      {layout.cells.map((k, i) => {
        const c = spotCenter(spots[i]);
        return <G key={i}>{PaellaIcon[k]({ p, x: c.x, y: c.y, s: 0.95 })}</G>;
      })}
    </G>
  );
}
