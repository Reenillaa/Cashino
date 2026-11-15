import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GameId } from '@/engine/games/types.ts';
import { gameVivid } from '../tokens';
import { GameLogo } from './GameLogo';

/** The game's own icon: its illustrated logo on its vivid gradient (like a tiny app icon). */
export function GameGlyph({ game, size = 28 }: { game: GameId; size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={gameVivid[game]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      {/* wrapped: on the web an <svg> sibling would paint under the absolutely positioned gradient */}
      <View>
        <GameLogo game={game} size={size * 0.86} />
      </View>
    </View>
  );
}
