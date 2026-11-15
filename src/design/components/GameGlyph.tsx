import React from 'react';
import { Text } from 'react-native';
import type { GameId } from '@/engine/games/types.ts';
import { gameArt } from '../tokens';

/** The game's emoji, the same art used on its home card. `color` is kept for API compatibility. */
export function GameGlyph({ game, size = 28 }: { game: GameId; size?: number; color?: string }) {
  return (
    <Text style={{ fontSize: size * 0.92, lineHeight: size * 1.15, textAlign: 'center' }} accessible={false}>
      {gameArt[game].emoji}
    </Text>
  );
}
