import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { Card, Suit } from '@/engine/cards/cards.ts';
import { rankLabel } from '@/engine/cards/cards.ts';

/**
 * Casino-style card faces on a 100×140 artboard: cream card stock with a fine inner frame, indices in two
 * corners, the classic pip layouts for 2–10, an ornate ace and illustrated, mirrored court cards.
 */
const SUIT_D: Record<Suit, string> = {
  s: 'M12 2.5c-3.7 4.6-8 7.3-8 11.3a4.2 4.2 0 0 0 7.1 3L10 21.5h4l-1.1-4.7a4.2 4.2 0 0 0 7.1-3c0-4-4.3-6.7-8-11.3z',
  h: 'M12 21c-5.6-4.2-9-7.4-9-11.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 9 2c0 4-3.4 7.2-9 11.4z',
  d: 'M12 2.5 19.5 12 12 21.5 4.5 12z',
  c: 'M12 3.5a3.9 3.9 0 0 0-3.4 5.8 3.9 3.9 0 1 0 1.5 6.9L9.4 21.5h5.2l-.7-5.3a3.9 3.9 0 1 0 1.5-6.9A3.9 3.9 0 0 0 12 3.5z',
};
const RED = (s: Suit) => s === 'h' || s === 'd';

/** One suit symbol centred at (x, y), `s` units tall, optionally upside down. */
function Pip({ suit, x, y, s, flip, fill }: { suit: Suit; x: number; y: number; s: number; flip?: boolean; fill: string }) {
  return <Path d={SUIT_D[suit]} fill={fill} transform={`translate(${x} ${y}) rotate(${flip ? 180 : 0}) scale(${s / 24}) translate(-12 -12)`} />;
}

const L = 32, R = 68, C = 50;
const PIPS: Record<number, [number, number, boolean?][]> = {
  2: [[C, 30], [C, 110, true]],
  3: [[C, 30], [C, 70], [C, 110, true]],
  4: [[L, 30], [R, 30], [L, 110, true], [R, 110, true]],
  5: [[L, 30], [R, 30], [C, 70], [L, 110, true], [R, 110, true]],
  6: [[L, 30], [R, 30], [L, 70], [R, 70], [L, 110, true], [R, 110, true]],
  7: [[L, 30], [R, 30], [C, 50], [L, 70], [R, 70], [L, 110, true], [R, 110, true]],
  8: [[L, 30], [R, 30], [C, 50], [L, 70], [R, 70], [C, 90, true], [L, 110, true], [R, 110, true]],
  9: [[L, 30], [R, 30], [L, 56], [R, 56], [C, 70], [L, 84, true], [R, 84, true], [L, 110, true], [R, 110, true]],
  10: [[L, 30], [R, 30], [C, 43], [L, 56], [R, 56], [L, 84, true], [R, 84, true], [C, 97, true], [L, 110, true], [R, 110, true]],
};

/** Half of a court card (drawn twice, the second upside down). */
function CourtHalf({ kind, suit, ink, robe, trim }: { kind: 'J' | 'Q' | 'K'; suit: Suit; ink: string; robe: string; trim: string }) {
  return (
    <G>
      {/* robe and shoulders */}
      <Path d="M24 70 C26 58 36 52 50 52 C64 52 74 58 76 70 Z" fill={robe} stroke={ink} strokeWidth={1.2} />
      <Path d="M38 54 L50 66 L62 54" fill="none" stroke={trim} strokeWidth={3} />
      <Path d="M30 70 C32 62 38 58 44 57" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.5} fill="none" />
      {kind === 'K' ? (
        <G>
          {/* ermine collar */}
          <Path d="M36 54 C42 58 58 58 64 54 L62 60 C56 62 44 62 38 60 Z" fill="#FFFFFF" stroke={ink} strokeWidth={0.8} />
          {[41, 47, 53, 59].map((x) => <Path key={x} d={`M${x} 57.5 l1 2 l1 -2 Z`} fill="#14101E" />)}
          {/* sceptre */}
          <Path d="M70 70 L72 36" stroke="#C98B12" strokeWidth={2.2} />
          <Circle cx={72} cy={34} r={3} fill="#FFD84D" stroke={ink} strokeWidth={0.8} />
        </G>
      ) : kind === 'Q' ? (
        <G>
          {/* flower */}
          <Path d="M30 70 L28 44" stroke="#2E8A3A" strokeWidth={1.6} />
          {[0, 72, 144, 216, 288].map((a) => <Circle key={a} cx={28 + Math.cos((a * Math.PI) / 180) * 3} cy={42 + Math.sin((a * Math.PI) / 180) * 3} r={2.2} fill={trim} stroke={ink} strokeWidth={0.5} />)}
          <Circle cx={28} cy={42} r={1.6} fill="#FFD84D" />
        </G>
      ) : (
        <G>
          {/* halberd */}
          <Path d="M72 70 L72 30" stroke="#8A5A2A" strokeWidth={1.8} />
          <Path d="M72 28 L78 33 L72 36 Z M72 28 L72 24" fill="#C9C4DA" stroke={ink} strokeWidth={0.8} />
        </G>
      )}
      {/* hair behind the face */}
      {kind === 'Q' ? <Path d="M39 40 C38 30 62 30 61 40 L63 54 C58 52 42 52 37 54 Z" fill="#E0A010" stroke={ink} strokeWidth={0.8} /> : null}
      {/* face */}
      <Path d="M42 38 C42 31 58 31 58 38 C58 46 54 50 50 50 C46 50 42 46 42 38 Z" fill="#F7D6B8" stroke={ink} strokeWidth={1} />
      <Circle cx={46.5} cy={39} r={1} fill={ink} />
      <Circle cx={53.5} cy={39} r={1} fill={ink} />
      <Path d="M48.5 45 Q50 46.2 51.5 45" stroke={ink} strokeWidth={0.8} fill="none" />
      {kind === 'K' ? <Path d="M43 42 C44 52 56 52 57 42 C55 47 45 47 43 42 Z" fill="#8A6A4A" stroke={ink} strokeWidth={0.6} /> : null}
      {/* headwear */}
      {kind === 'K' ? (
        <G>
          <Path d="M41 32 L41 23 L45 28 L50 21 L55 28 L59 23 L59 32 Z" fill="#FFD84D" stroke={ink} strokeWidth={1} />
          <Circle cx={50} cy={27.5} r={1.4} fill={trim} />
          <Rect x={41} y={30.5} width={18} height={2.4} fill="#C98B12" />
        </G>
      ) : kind === 'Q' ? (
        <G>
          <Path d="M43 32 L44 26 L47 29 L50 24 L53 29 L56 26 L57 32 Z" fill="#FFD84D" stroke={ink} strokeWidth={0.9} />
          <Circle cx={50} cy={28.5} r={1.2} fill={trim} />
        </G>
      ) : (
        <G>
          <Path d="M40 34 C40 26 60 26 60 34 C56 32 44 32 40 34 Z" fill={robe} stroke={ink} strokeWidth={1} />
          <Path d="M58 30 C64 24 68 22 70 22 C66 26 62 30 58 32 Z" fill={trim} stroke={ink} strokeWidth={0.6} />
        </G>
      )}
      {/* the suit, held up in the corner of the portrait */}
      <Pip suit={suit} x={32} y={30} s={9} fill={RED(suit) ? '#D7182A' : '#14101E'} />
    </G>
  );
}

export function CardFaceArt({ card, w, h }: { card: Card; w: number; h: number }) {
  const red = RED(card.suit);
  const ink = red ? '#C8102E' : '#14101E';
  const label = rankLabel(card.rank);
  const small = w < 52;
  const uid = `cf${label}${card.suit}`;
  const court = label === 'J' || label === 'Q' || label === 'K';
  const robe = red ? '#C8102E' : '#1F3A9A';
  const trim = red ? '#1F3A9A' : '#C8102E';
  const index = (flip: boolean) => (
    <G transform={flip ? 'rotate(180 50 70)' : undefined}>
      <SvgText x={small ? 18 : 12} y={small ? 34 : 22} fontSize={small ? (label === '10' ? 26 : 32) : label === '10' ? 16 : 19} fontWeight="700" fontFamily="Georgia, 'Times New Roman', serif" textAnchor="middle" fill={ink} letterSpacing={label === '10' ? -1.5 : 0}>{label}</SvgText>
      {small ? null : <Pip suit={card.suit} x={12} y={31} s={10} fill={ink} />}
    </G>
  );
  return (
    <Svg width={w} height={h} viewBox="0 0 100 140">
      <Defs>
        <LinearGradient id={`${uid}st`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#F3EEE2" />
        </LinearGradient>
        <LinearGradient id={`${uid}pp`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={red ? '#FF3A4E' : '#3A3650'} />
          <Stop offset="1" stopColor={red ? '#B00A22' : '#0A0812'} />
        </LinearGradient>
        <Pattern id={`${uid}hx`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Rect x="0" y="0" width="1" height="4" fill={red ? '#F4C8C8' : '#C8D0EC'} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={100} height={140} rx={9} fill={`url(#${uid}st)`} />
      <Rect x={3.5} y={3.5} width={93} height={133} rx={7} fill="none" stroke="#E2DACA" strokeWidth={1} />
      {small ? (
        <>
          {index(false)}
          <Pip suit={card.suit} x={64} y={100} s={48} fill={`url(#${uid}pp)`} />
        </>
      ) : court ? (
        <>
          {index(false)}
          {index(true)}
          <Rect x={20} y={18} width={60} height={104} rx={3} fill="#FFF8E8" stroke={ink} strokeWidth={1.4} />
          <Rect x={20} y={18} width={60} height={104} rx={3} fill={`url(#${uid}hx)`} opacity={0.6} />
          <G>
            <CourtHalf kind={label as 'J' | 'Q' | 'K'} suit={card.suit} ink="#2A1A10" robe={robe} trim={trim} />
          </G>
          <G transform="rotate(180 50 70)">
            <CourtHalf kind={label as 'J' | 'Q' | 'K'} suit={card.suit} ink="#2A1A10" robe={robe} trim={trim} />
          </G>
          <Path d="M20 70 L80 70" stroke={ink} strokeWidth={1} />
          <Rect x={20} y={18} width={60} height={104} rx={3} fill="none" stroke="#C98B12" strokeWidth={0.8} transform="translate(2 2) scale(0.96)" />
        </>
      ) : label === 'A' ? (
        <>
          {index(false)}
          {index(true)}
          <Circle cx={50} cy={70} r={30} fill="none" stroke={ink} strokeOpacity={0.18} strokeWidth={1} />
          <Circle cx={50} cy={70} r={26} fill="none" stroke={ink} strokeOpacity={0.12} strokeWidth={4} strokeDasharray="1 3" />
          <Pip suit={card.suit} x={50} y={70} s={card.suit === 's' ? 44 : 38} fill={`url(#${uid}pp)`} />
          <Path d={SUIT_D[card.suit]} fill="#FFFFFF" opacity={0.18} transform={`translate(50 70) scale(${(card.suit === 's' ? 44 : 38) / 24 * 0.5}) translate(-16 -16)`} />
        </>
      ) : (
        <>
          {index(false)}
          {index(true)}
          {(PIPS[Number(label)] ?? []).map(([x, y, f], k) => <Pip key={k} suit={card.suit} x={x} y={y} s={19} flip={f} fill={`url(#${uid}pp)`} />)}
        </>
      )}
    </Svg>
  );
}

/** Ornate card back: the shop design's colours and pattern inside a double frame, corner diamonds and a chip medallion. */
export function CardBackSvg({ w, h, colors, accent, pattern, uid }: { w: number; h: number; colors: [string, string]; accent: string; pattern: string; uid: string }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 100 140">
      <Defs>
        <LinearGradient id={`${uid}bg`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
        <Pattern id={`${uid}pt`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          {pattern === 'dots' ? <Circle cx="3.5" cy="3.5" r="1.1" fill={accent} opacity={0.45} />
            : pattern === 'diamonds' ? <Rect x="1.8" y="1.8" width="3.4" height="3.4" fill="none" stroke={accent} strokeWidth="0.7" opacity={0.55} />
              : <Rect x="0" y="0" width="1.4" height="7" fill={accent} opacity={0.28} />}
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={100} height={140} rx={9} fill={`url(#${uid}bg)`} />
      <Rect x={7} y={7} width={86} height={126} rx={5} fill={`url(#${uid}pt)`} stroke={accent} strokeWidth={1.4} strokeOpacity={0.85} />
      <Rect x={10.5} y={10.5} width={79} height={119} rx={3.5} fill="none" stroke={accent} strokeWidth={0.6} strokeOpacity={0.6} />
      {[[7, 7], [93, 7], [7, 133], [93, 133]].map(([x, y], k) => <Path key={k} d={`M${x} ${y - 4} L${x + 4} ${y} L${x} ${y + 4} L${x - 4} ${y} Z`} fill={accent} />)}
      {/* chip medallion */}
      <Circle cx={50} cy={70} r={20} fill={colors[1]} stroke={accent} strokeWidth={1.6} />
      <Circle cx={50} cy={70} r={16} fill="none" stroke={accent} strokeWidth={3} strokeDasharray="4 3.2" />
      <Circle cx={50} cy={70} r={11} fill={colors[0]} stroke={accent} strokeWidth={0.8} />
      <SvgText x={50} y={75.5} fontSize={15} fontWeight="900" fontFamily="Georgia, serif" textAnchor="middle" fill={accent}>C</SvgText>
      <Path d="M20 40 Q50 30 80 40 M20 100 Q50 110 80 100" stroke={accent} strokeOpacity={0.5} strokeWidth={0.8} fill="none" />
      <Rect x={0} y={0} width={100} height={70} rx={9} fill="#FFFFFF" opacity={0.06} />
    </Svg>
  );
}
