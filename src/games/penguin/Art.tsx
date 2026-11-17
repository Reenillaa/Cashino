import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path } from 'react-native-svg';
import { Gloss, ol, rg, vg } from '../lineslot/art/kit';

/** The penguin (100×110): navy coat, white belly, red scarf, orange beak and feet. `up` raises the flippers. */
export const PenguinArt = React.memo(function PenguinArt({ size, up, sad }: { size: number; up?: boolean; sad?: boolean }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
      <Defs>
        {rg('pgb', ['#3A4A7A', '#1A2440', '#0A1020'], '0.35', '0.3', '0.8')}
        {rg('pgw', ['#FFFFFF', '#E8F0FA', '#C8D4E8'], '0.45', '0.35', '0.7')}
        {vg('pgk', ['#FFD06B', '#FF8A1C'])}
        {vg('pgs', ['#FF4F6A', '#B8102E'])}
      </Defs>
      <Ellipse cx={50} cy={104} rx={26} ry={5} fill="#000000" opacity={0.22} />
      {/* feet */}
      <Path d="M30 98 C30 92 44 92 44 98 C40 102 34 102 30 98 Z" fill="url(#pgk)" {...ol('#7A3A00', 1.6)} />
      <Path d="M56 98 C56 92 70 92 70 98 C66 102 60 102 56 98 Z" fill="url(#pgk)" {...ol('#7A3A00', 1.6)} />
      {/* flippers */}
      <Path d={up ? 'M22 52 C8 40 4 26 8 20 C16 30 24 40 28 50 Z' : 'M22 50 C10 60 8 76 12 82 C18 74 24 64 28 56 Z'} fill="url(#pgb)" {...ol('#05080F', 2)} />
      <Path d={up ? 'M78 52 C92 40 96 26 92 20 C84 30 76 40 72 50 Z' : 'M78 50 C90 60 92 76 88 82 C82 74 76 64 72 56 Z'} fill="url(#pgb)" {...ol('#05080F', 2)} />
      {/* body */}
      <Path d="M50 8 C74 8 82 34 82 58 C82 82 70 98 50 98 C30 98 18 82 18 58 C18 34 26 8 50 8 Z" fill="url(#pgb)" {...ol('#05080F', 2.6)} />
      <Path d="M50 30 C66 30 72 48 72 64 C72 82 62 92 50 92 C38 92 28 82 28 64 C28 48 34 30 50 30 Z" fill="url(#pgw)" />
      {/* face */}
      <Path d="M34 30 C36 18 64 18 66 30 C64 36 58 38 50 38 C42 38 36 36 34 30 Z" fill="url(#pgw)" />
      <Ellipse cx={42} cy={28} rx={4} ry={sad ? 2 : 4.6} fill="#14101E" />
      <Ellipse cx={58} cy={28} rx={4} ry={sad ? 2 : 4.6} fill="#14101E" />
      {sad ? null : <Circle cx={40.6} cy={26.4} r={1.5} fill="#FFFFFF" />}
      {sad ? null : <Circle cx={56.6} cy={26.4} r={1.5} fill="#FFFFFF" />}
      <Ellipse cx={36} cy={34} rx={3.4} ry={2} fill="#FF8AA0" opacity={0.6} />
      <Ellipse cx={64} cy={34} rx={3.4} ry={2} fill="#FF8AA0" opacity={0.6} />
      <Path d="M44 32 L56 32 L50 40 Z" fill="url(#pgk)" {...ol('#7A3A00', 1.4)} />
      {/* scarf */}
      <Path d="M28 42 C38 48 62 48 72 42 L72 50 C62 56 38 56 28 50 Z" fill="url(#pgs)" {...ol('#5A0A1A', 1.6)} />
      <Path d="M62 50 L70 72 L60 70 L56 52 Z" fill="url(#pgs)" {...ol('#5A0A1A', 1.6)} />
      <Path d="M34 46 L36 52 M42 48 L44 54 M50 48 L50 54 M58 48 L56 54" stroke="#FFFFFF" strokeWidth={1.4} strokeOpacity={0.5} />
      <Gloss d="M30 22 C34 14 42 10 50 10 C42 14 36 20 34 30 Z" o={0.35} />
    </Svg>
  );
});

/** One ice floe (200×120): snowy top face, cold side, cracks; `half` draws only one side (for breaking). */
export const FloeArt = React.memo(function FloeArt({ w, goal, crack }: { w: number; goal?: boolean; crack?: boolean }) {
  return (
    <Svg width={w} height={w * 0.6} viewBox="0 0 200 120">
      <Defs>
        {vg('ift', ['#FFFFFF', '#E4F6FF', '#BFE6FA'])}
        {vg('ifs', ['#7FC8F0', '#3A8AC0', '#1A4A7A'])}
      </Defs>
      <Ellipse cx={100} cy={96} rx={96} ry={18} fill="#06284A" opacity={0.45} />
      <Path d="M8 52 L20 78 C60 92 140 92 180 78 L192 52 Z" fill="url(#ifs)" {...ol('#0A3A6A', 2)} />
      <Path d="M8 52 C10 30 40 18 100 16 C160 18 190 30 192 52 C170 66 30 66 8 52 Z" fill="url(#ift)" {...ol('#6AA8D8', 2)} />
      {/* snow lumps and sparkle */}
      <Path d="M40 40 C48 30 62 30 70 38 C60 42 50 42 40 40 Z M120 30 C128 24 142 24 150 32 C140 34 130 34 120 30 Z" fill="#FFFFFF" />
      <Path d="M30 60 L44 72 M164 60 L150 74 M96 66 L100 80" stroke="#E8F8FF" strokeWidth={2} strokeOpacity={0.6} />
      {crack ? <Path d="M100 16 L92 30 L106 40 L94 52 L104 64" stroke="#2A5A8A" strokeWidth={3} fill="none" strokeLinejoin="round" /> : <Path d="M70 30 L76 36 M132 44 L126 50" stroke="#9CCCEC" strokeWidth={1.4} />}
      {goal ? (
        <G>
          {/* an igloo waits at the end */}
          <Path d="M64 44 C64 14 136 14 136 44 Z" fill="#F4FCFF" {...ol('#6AA8D8', 2)} />
          <Path d="M88 44 C88 32 112 32 112 44 Z" fill="#1A3A5A" />
          <Path d="M70 34 L130 34 M76 24 L124 24 M100 14 L100 24 M84 24 L84 34 M116 24 L116 34" stroke="#BFE0F4" strokeWidth={1.4} />
          <Path d="M134 20 L134 0" stroke="#5A3210" strokeWidth={2.4} />
          <Path d="M134 0 L152 6 L134 12 Z" fill="#E8304F" />
        </G>
      ) : null}
    </Svg>
  );
});
