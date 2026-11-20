import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { sceneForGame, setMusicScene } from '@/services/audio';

/** While a game is on screen its own music plays (if music is on); leaving it brings back the lobby's. */
export function useGameMusic(game: string) {
  useFocusEffect(
    useCallback(() => {
      setMusicScene(sceneForGame(game));
      return () => setMusicScene('lobby');
    }, [game]),
  );
}
