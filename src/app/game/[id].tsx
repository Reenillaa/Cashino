import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { GAME_IDS, type GameId } from '@/engine/games/types.ts';
import { EmptyState, Screen } from '@/design/components';
import { GAME_SCREENS } from '@/games/registry';
import { LockedGate } from '@/features/unlocks/LockedGate';

export default function GameHost() {
  const { id, tutorial } = useLocalSearchParams<{ id: string; tutorial?: string }>();
  if (!GAME_IDS.includes(id as GameId)) {
    return (
      <Screen back tabBar={false}>
        <EmptyState icon="info" title="404" />
      </Screen>
    );
  }
  const Comp = GAME_SCREENS[id as GameId];
  return (
    <LockedGate id={`game:${id as GameId}`}>
      <Comp forceTutorial={tutorial === '1'} />
    </LockedGate>
  );
}
