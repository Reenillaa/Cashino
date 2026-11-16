import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { GameId } from '@/engine/games/types.ts';

/**
 * Original illustrated logo for each game (drawn for Cashino, no third-party art).
 * Meant to sit on the game's vivid gradient; 100 × 100 artboard with a soft drop shadow.
 */
export function GameLogo({ game, size = 64 }: { game: GameId; size?: number }) {
  // Unique per instance: on the web, SVG gradient ids are global and hidden screens would steal them.
  const id = `gl-${game}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}-w`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E6E3F2" />
        </LinearGradient>
        <LinearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE58A" />
          <Stop offset="0.55" stopColor="#FFC23D" />
          <Stop offset="1" stopColor="#E08A00" />
        </LinearGradient>
        <LinearGradient id={`${id}-fire`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF3A0" />
          <Stop offset="0.5" stopColor="#FFB020" />
          <Stop offset="1" stopColor="#FF4D2E" />
        </LinearGradient>
        <RadialGradient id={`${id}-ball`} cx="35%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#C9C4DA" />
        </RadialGradient>
      </Defs>
      <G>{ART[game](id)}</G>
    </Svg>
  );
}

const SH = 'rgba(20,6,40,0.28)';
const W = (id: string) => `url(#${id}-w)`;
const card = (id: string, x: number, y: number, rot: number, glyph: string, color: string, label?: string) => (
  <G transform={`rotate(${rot} ${x + 17} ${y + 24})`}>
    <Rect x={x + 2} y={y + 4} width={34} height={48} rx={7} fill={SH} />
    <Rect x={x} y={y} width={34} height={48} rx={7} fill={W(id)} />
    {label ? <SvgText x={x + 6} y={y + 14} fontSize={12} fontWeight="800" fill={color}>{label}</SvgText> : null}
    <SvgText x={x + 17} y={y + 34} fontSize={20} fill={color} textAnchor="middle">{glyph}</SvgText>
  </G>
);
const die = (id: string, x: number, y: number, s: number, rot: number, pips: [number, number][]) => (
  <G transform={`rotate(${rot} ${x + s / 2} ${y + s / 2})`}>
    <Rect x={x + 2} y={y + 4} width={s} height={s} rx={s * 0.22} fill={SH} />
    <Rect x={x} y={y} width={s} height={s} rx={s * 0.22} fill={W(id)} />
    {pips.map(([px, py], i) => <Circle key={i} cx={x + px * s} cy={y + py * s} r={s * 0.09} fill={i === 0 && pips.length === 1 ? '#FF3B5C' : '#231A3A'} />)}
  </G>
);

const ART: Record<GameId, (id: string) => React.ReactNode> = {
  poker: (id) => (<>{card(id, 22, 24, -14, '♥', '#FF3B5C', 'A')}{card(id, 44, 22, 12, '♠', '#231A3A', 'K')}</>),
  blackjack: (id) => (
    <>
      {card(id, 20, 22, -10, '♠', '#231A3A', 'A')}
      {card(id, 42, 24, 10, '♦', '#FF3B5C', 'J')}
      <Circle cx={74} cy={72} r={15} fill={SH} />
      <Circle cx={72} cy={70} r={15} fill={`url(#${id}-gold)`} stroke="#FFF6D0" strokeWidth={2} strokeDasharray="4 3" />
      <SvgText x={72} y={75} fontSize={13} fontWeight="900" fill="#5A3200" textAnchor="middle">21</SvgText>
    </>
  ),
  crash: (id) => (
    <>
      <Path d="M14 84 C 34 80, 52 64, 64 40" stroke="rgba(255,255,255,0.55)" strokeWidth={4} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
      <G transform="rotate(40 60 40)">
        <Path d="M60 76 C 52 88, 60 94, 60 98 C 60 94, 68 88, 60 76 Z" fill={`url(#${id}-fire)`} />
        <Path d="M50 62 L42 76 L54 72 Z" fill="#FF4F7B" />
        <Path d="M70 62 L78 76 L66 72 Z" fill="#FF4F7B" />
        <Path d="M60 12 C 74 26, 74 54, 68 74 L52 74 C 46 54, 46 26, 60 12 Z" fill={W(id)} />
        <Circle cx={60} cy={40} r={7} fill="#3D7BFF" stroke="#231A3A" strokeWidth={2.5} />
      </G>
    </>
  ),
  dice: (id) => (<>{die(id, 16, 30, 40, -14, [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]])}{die(id, 48, 40, 36, 12, [[0.5, 0.5]])}</>),
  mines: (id) => (
    <>
      <Polygon points="52,88 18,44 32,24 72,24 86,44" fill={SH} transform="translate(2 4)" />
      <Polygon points="50,86 16,42 30,22 70,22 84,42" fill="#FFFFFF" />
      <Polygon points="16,42 84,42 50,86" fill="#D9F7FF" />
      <Polygon points="30,22 50,42 70,22" fill="#F3FDFF" />
      <Polygon points="16,42 30,22 40,42" fill="#BDEFFF" />
      <Polygon points="84,42 70,22 60,42" fill="#A9E6FF" />
      <Polygon points="40,42 50,86 60,42" fill="#8FDCFA" />
      <Circle cx={80} cy={76} r={11} fill="#231A3A" />
      <Path d="M86 67 Q 90 60 94 62" stroke="#231A3A" strokeWidth={3} fill="none" />
      <Circle cx={95} cy={61} r={3.5} fill="#FFC23D" />
    </>
  ),
  plinko: (id) => (
    <>
      {[[50, 30], [40, 46], [60, 46], [30, 62], [50, 62], [70, 62], [20, 78], [40, 78], [60, 78], [80, 78]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3.6} fill="rgba(255,255,255,0.85)" />)}
      <Path d="M50 8 C 50 20, 44 30, 46 40" stroke="rgba(255,255,255,0.45)" strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={47} cy={44} r={10} fill={SH} transform="translate(2 3)" />
      <Circle cx={46} cy={42} r={10} fill={`url(#${id}-ball)`} />
    </>
  ),
  crossing: (id) => (
    <>
      <Rect x={6} y={78} width={88} height={14} rx={4} fill="rgba(20,6,40,0.35)" />
      {[12, 34, 56, 78].map((x) => <Rect key={x} x={x} y={83} width={12} height={4} rx={2} fill="#FFFFFF" opacity={0.8} />)}
      <Ellipse cx={52} cy={62} rx={24} ry={22} fill={SH} />
      <Ellipse cx={50} cy={58} rx={24} ry={22} fill={W(id)} />
      <Circle cx={42} cy={30} r={7} fill="#FF3B5C" /><Circle cx={51} cy={27} r={7} fill="#FF3B5C" /><Circle cx={60} cy={30} r={6} fill="#FF3B5C" />
      <Circle cx={50} cy={44} r={16} fill={W(id)} />
      <Circle cx={56} cy={42} r={3} fill="#231A3A" />
      <Polygon points="64,46 76,49 64,53" fill="#FFB020" />
      <Path d="M30 60 Q 40 70 52 62" stroke="#E2DDF0" strokeWidth={4} fill="none" strokeLinecap="round" />
    </>
  ),
  roulette: (id) => {
    const wedges = Array.from({ length: 12 }, (_, i) => {
      const a0 = ((i * 30 - 90) * Math.PI) / 180, a1 = (((i + 1) * 30 - 90) * Math.PI) / 180;
      const p = (a: number, r: number) => `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
      return <Path key={i} d={`M${p(a0, 38)} A38,38 0 0 1 ${p(a1, 38)} L${p(a1, 22)} A22,22 0 0 0 ${p(a0, 22)} Z`} fill={i === 0 ? '#16C47F' : i % 2 ? '#231A3A' : '#FF3B5C'} />;
    });
    return (
      <>
        <Circle cx={52} cy={54} r={44} fill={SH} />
        <Circle cx={50} cy={50} r={44} fill={`url(#${id}-gold)`} />
        <Circle cx={50} cy={50} r={39} fill="#3A1F12" />
        {wedges}
        <Circle cx={50} cy={50} r={20} fill={`url(#${id}-gold)`} />
        <Path d="M50 34 L50 66 M34 50 L66 50" stroke="#7A4E1D" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={74} cy={28} r={5.5} fill={`url(#${id}-ball)`} />
      </>
    );
  },
  limbo: () => (
    <>
      <Path d="M12 82 L36 58 L50 68 L80 30" stroke={SH} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(2 4)" />
      <Path d="M12 82 L36 58 L50 68 L80 30" stroke="#FFFFFF" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Polygon points="66,26 88,20 82,42" fill="#FFFFFF" />
      <SvgText x={22} y={40} fontSize={26} fontWeight="900" fill="#FFFFFF" opacity={0.9}>×</SvgText>
    </>
  ),
  coinflip: (id) => (
    <>
      <Ellipse cx={52} cy={58} rx={34} ry={34} fill={SH} />
      <Ellipse cx={50} cy={56} rx={34} ry={34} fill="#C27A00" />
      <Ellipse cx={50} cy={50} rx={34} ry={34} fill={`url(#${id}-gold)`} />
      <Ellipse cx={50} cy={50} rx={26} ry={26} fill="none" stroke="#FFF2B8" strokeWidth={3} />
      <Polygon points="50,32 55,45 69,45 58,53 62,67 50,59 38,67 42,53 31,45 45,45" fill="#FFF6D0" />
    </>
  ),
  baccarat: (id) => (
    <>
      <Path d="M18 72 L14 32 L34 50 L50 22 L66 50 L86 32 L82 72 Z" fill={SH} transform="translate(2 4)" />
      <Path d="M18 72 L14 32 L34 50 L50 22 L66 50 L86 32 L82 72 Z" fill={`url(#${id}-gold)`} />
      <Rect x={18} y={72} width={64} height={12} rx={4} fill="#E08A00" />
      <Circle cx={50} cy={60} r={6} fill="#FF3B5C" /><Circle cx={32} cy={62} r={4} fill="#16C47F" /><Circle cx={68} cy={62} r={4} fill="#3D7BFF" />
      <Circle cx={14} cy={32} r={4} fill="#FFF6D0" /><Circle cx={50} cy={22} r={4} fill="#FFF6D0" /><Circle cx={86} cy={32} r={4} fill="#FFF6D0" />
    </>
  ),
  hilo: (id) => (
    <>
      {card(id, 30, 22, -4, '♣', '#231A3A', '7')}
      <Polygon points="80,22 92,38 68,38" fill="#3BE39A" />
      <Polygon points="80,84 92,68 68,68" fill="#FF5C7A" />
      <Rect x={77} y={38} width={6} height={10} rx={2} fill="#3BE39A" /><Rect x={77} y={58} width={6} height={10} rx={2} fill="#FF5C7A" />
    </>
  ),
  keno: (id) => (
    <>
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((cIdx) => {
        const n = r * 3 + cIdx + 1, hit = [2, 5, 9].includes(n);
        const x = 22 + cIdx * 28, y = 22 + r * 28;
        return (
          <G key={n}>
            <Circle cx={x + 1.5} cy={y + 2.5} r={12} fill={SH} />
            <Circle cx={x} cy={y} r={12} fill={hit ? `url(#${id}-gold)` : 'rgba(255,255,255,0.92)'} />
            <SvgText x={x} y={y + 4.5} fontSize={12} fontWeight="800" fill={hit ? '#5A3200' : '#231A3A'} textAnchor="middle">{n}</SvgText>
          </G>
        );
      }))}
    </>
  ),
  slots: (id) => (
    <>
      <Rect x={20} y={22} width={60} height={70} rx={10} fill={SH} transform="translate(2 4)" />
      <Path d="M24 26 Q50 2 76 26 Z" fill="#FF3B5C" />
      <Circle cx={50} cy={14} r={4} fill="#FFF6D0" />
      <Rect x={18} y={24} width={64} height={66} rx={10} fill={`url(#${id}-gold)`} />
      <Rect x={24} y={34} width={52} height={28} rx={6} fill="#231A3A" />
      {[0, 1, 2].map((k) => (
        <G key={k}>
          <Rect x={27 + k * 16.3} y={37} width={14} height={22} rx={3} fill="#FFFFFF" />
          <SvgText x={34 + k * 16.3} y={54} fontSize={17} fontWeight="900" fill="#FF3B5C" textAnchor="middle">7</SvgText>
        </G>
      ))}
      <Rect x={30} y={70} width={40} height={8} rx={4} fill="#8A5300" />
      <Rect x={84} y={34} width={5} height={30} rx={2.5} fill="#C9C4DA" />
      <Circle cx={86.5} cy={32} r={6} fill="#FF3B5C" stroke="#FFF6D0" strokeWidth={1.5} />
    </>
  ),
  videopoker: (id) => (
    <>
      <Rect x={10} y={22} width={80} height={62} rx={10} fill={SH} transform="translate(2 4)" />
      <Rect x={10} y={22} width={80} height={62} rx={10} fill="#231A3A" stroke={`url(#${id}-gold)`} strokeWidth={3} />
      {[0, 1, 2, 3, 4].map((k) => (
        <G key={k}>
          <Rect x={15 + k * 14.4} y={32} width={12.5} height={18} rx={2.5} fill="#FFFFFF" />
          <SvgText x={21.25 + k * 14.4} y={45} fontSize={10} fontWeight="900" fill={k % 2 ? '#231A3A' : '#FF3B5C'} textAnchor="middle">{['A', 'K', 'Q', 'J', '10'][k]}</SvgText>
        </G>
      ))}
      {[0, 1, 2, 3, 4].map((k) => <Rect key={k} x={15 + k * 14.4} y={55} width={12.5} height={6} rx={2} fill={k < 4 ? '#FFD06B' : 'rgba(255,255,255,0.25)'} />)}
      <Rect x={22} y={68} width={56} height={9} rx={4.5} fill={`url(#${id}-gold)`} />
    </>
  ),
  wheel: (id) => {
    const cols = ['#FF4FA3', '#FFD06B', '#7B5CFF', '#12C08A', '#FF4FA3', '#FFD06B', '#7B5CFF', '#12C08A'];
    return (
      <>
        <Circle cx={52} cy={54} r={40} fill={SH} />
        <Circle cx={50} cy={50} r={40} fill={`url(#${id}-gold)`} />
        {cols.map((col, i) => {
          const a0 = (i * 45 - 90) * (Math.PI / 180), a1 = ((i + 1) * 45 - 90) * (Math.PI / 180);
          return <Path key={i} d={`M50 50 L${50 + 34 * Math.cos(a0)} ${50 + 34 * Math.sin(a0)} A34 34 0 0 1 ${50 + 34 * Math.cos(a1)} ${50 + 34 * Math.sin(a1)} Z`} fill={col} stroke="#FFF6D0" strokeWidth={1.2} />;
        })}
        <Circle cx={50} cy={50} r={8} fill="#FFF6D0" stroke="#8A5300" strokeWidth={2} />
        <Polygon points="50,4 43,-6 57,-6" fill="#FF3B5C" transform="translate(0 10)" />
      </>
    );
  },
  towers: (id) => (
    <>
      {[0, 1, 2, 3].map((r) => (
        <G key={r}>
          {[0, 1, 2].map((k) => (
            <Rect key={k} x={18 + k * 22} y={74 - r * 18} width={18} height={14} rx={3} fill={r === 3 && k === 1 ? '#FF3B5C' : r < 3 && k === (r % 3) ? `url(#${id}-gold)` : 'rgba(255,255,255,0.88)'} />
          ))}
        </G>
      ))}
      <Path d="M30 22 Q50 2 70 22 Q60 16 50 20 Q40 16 30 22 Z" fill="#12C08A" />
      <Circle cx={44} cy={14} r={2} fill="#231A3A" />
      <Circle cx={56} cy={14} r={2} fill="#231A3A" />
    </>
  ),
  diamonds: () => (
    <>
      {[[20, 56, '#5BE3B0'], [38, 40, '#FF4FA3'], [56, 56, '#5BE3B0'], [74, 40, '#FFD06B'], [47, 72, '#5BE3B0']].map(([x, y, col], i) => (
        <G key={i} transform={`translate(${x as number} ${y as number})`}>
          <Path d="M-11 -6 L-6 -12 L6 -12 L11 -6 L0 12 Z" fill={SH} transform="translate(1.5 3)" />
          <Path d="M-11 -6 L-6 -12 L6 -12 L11 -6 L0 12 Z" fill={col as string} />
          <Path d="M-11 -6 L11 -6 L0 12 Z" fill="rgba(0,0,0,0.12)" />
          <Path d="M-6 -12 L-3 -6 L3 -6 L6 -12 Z" fill="rgba(255,255,255,0.55)" />
        </G>
      ))}
    </>
  ),
  pump: (id) => (
    <>
      <Ellipse cx={52} cy={44} rx={28} ry={32} fill={SH} />
      <Ellipse cx={50} cy={40} rx={28} ry={32} fill="#FF4FA3" />
      <Ellipse cx={40} cy={28} rx={7} ry={10} fill="rgba(255,255,255,0.45)" />
      <Path d="M46 72 L54 72 L50 78 Z" fill="#B3127A" />
      <Path d="M50 78 Q44 86 52 92" stroke="#FFFFFF" strokeWidth={2} fill="none" />
      <Rect x={70} y={70} width={14} height={22} rx={3} fill={`url(#${id}-gold)`} />
      <Rect x={74} y={58} width={6} height={14} rx={2} fill="#C9C4DA" />
      <Rect x={68} y={54} width={18} height={5} rx={2.5} fill="#231A3A" />
    </>
  ),
  dragontiger: (id) => (
    <>
      <Rect x={10} y={22} width={38} height={54} rx={7} fill={SH} transform="translate(2 4) rotate(-8 29 49)" />
      <Rect x={10} y={22} width={38} height={54} rx={7} fill="#12C08A" transform="rotate(-8 29 49)" />
      <SvgText x={29} y={58} fontSize={26} textAnchor="middle" transform="rotate(-8 29 49)">🐉</SvgText>
      <Rect x={52} y={22} width={38} height={54} rx={7} fill={SH} transform="translate(2 4) rotate(8 71 49)" />
      <Rect x={52} y={22} width={38} height={54} rx={7} fill="#FFB938" transform="rotate(8 71 49)" />
      <SvgText x={71} y={58} fontSize={26} textAnchor="middle" transform="rotate(8 71 49)">🐯</SvgText>
      <Circle cx={50} cy={84} r={9} fill={`url(#${id}-gold)`} />
      <SvgText x={50} y={88} fontSize={9} fontWeight="900" fill="#5A3200" textAnchor="middle">VS</SvgText>
    </>
  ),
  trader: () => (
    <>
      {[[16, 60, 22, 70, '#FF5C7A'], [30, 52, 20, 62, '#3BE39A'], [44, 56, 18, 66, '#FF5C7A'], [58, 40, 26, 54, '#3BE39A'], [72, 26, 30, 44, '#3BE39A']].map(([x, top, h, wick, col], i) => (
        <G key={i}>
          <Rect x={(x as number) + 4.5} y={(top as number) - 6} width={2} height={(wick as number) - (top as number) + 16} fill={col as string} opacity={0.8} />
          <Rect x={x as number} y={top as number} width={11} height={h as number} rx={2.5} fill={col as string} />
        </G>
      ))}
      <Path d="M10 84 L36 64 L52 70 L86 30" stroke={SH} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(2 3)" />
      <Path d="M10 84 L36 64 L52 70 L86 30" stroke="#FFFFFF" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Polygon points="74,26 92,20 88,38" fill="#FFFFFF" />
    </>
  ),
  sicbo: (id) => (
    <>
      {die(id, 28, 12, 30, -8, [[0.5, 0.5]])}
      {die(id, 12, 50, 30, 10, [[0.28, 0.28], [0.72, 0.72]])}
      {die(id, 54, 48, 32, -14, [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]])}
    </>
  ),
};
