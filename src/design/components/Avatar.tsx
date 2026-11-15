import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, G } from 'react-native-svg';
import { gameTint } from '../tokens';
import { Icon } from './Icon';

const HUES = Object.values(gameTint);
export const AVATAR_COUNT = 24;

/** Original generative avatars: anodized gradient + geometric emblem. id = "a0".."a23". */
export function Avatar({ id = 'a0', size = 44, bot, ring }: { id?: string; size?: number; bot?: boolean; ring?: string }) {
  const n = Math.abs(parseInt(id.replace(/\D/g, '') || '0', 10)) % AVATAR_COUNT;
  const c1 = HUES[n % HUES.length];
  const c2 = HUES[(n * 5 + 3) % HUES.length];
  const shape = n % 6;
  const gid = `g${n}${size}`;
  return (
    <View
      accessibilityLabel={bot ? 'Bot' : undefined}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: ring ? 2 : 0, borderColor: ring }}
    >
      {bot ? (
        <View style={{ flex: 1, backgroundColor: '#262A30', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bot" size={size * 0.55} color="#C5CAD1" />
        </View>
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </LinearGradient>
          </Defs>
          <Rect width="48" height="48" fill={`url(#${gid})`} />
          <G fill="rgba(255,255,255,0.85)">
            {shape === 0 && <Circle cx="24" cy="24" r="9" />}
            {shape === 1 && <Rect x="15" y="15" width="18" height="18" rx="5" />}
            {shape === 2 && <Path d="M24 13 35 33H13z" />}
            {shape === 3 && <Path d="M24 12 35 24 24 36 13 24z" />}
            {shape === 4 && <Path d="M14 30a10 10 0 0 1 20 0z" />}
            {shape === 5 && (<><Circle cx="18" cy="24" r="5" /><Circle cx="30" cy="24" r="5" /></>)}
          </G>
          <Rect width="48" height="20" fill="rgba(255,255,255,0.10)" />
        </Svg>
      )}
    </View>
  );
}
