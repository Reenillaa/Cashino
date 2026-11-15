import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameId } from '@/engine/games/types.ts';
import { DEFAULT_ROOM, roomById, ROOMS, type Room, type RoomId } from '@/engine/meta/rooms.ts';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';

/** Last room chosen per game (persisted) — the picker opens on it next time. */
interface RoomState {
  byGame: Partial<Record<GameId, RoomId>>;
  choose: (g: GameId, id: RoomId) => void;
}

export const useRooms = create<RoomState>()(
  persist(
    (set) => ({
      byGame: {},
      choose: (g, id) => set((s) => ({ byGame: { ...s.byGame, [g]: id } })),
    }),
    { name: `${STORAGE_PREFIX}rooms`, storage: persistStorage, version: 1 },
  ),
);

export function useRoom(game: GameId): Room {
  const id = useRooms((s) => s.byGame[game]);
  return roomById(id) ?? roomById(DEFAULT_ROOM)!;
}

export { ROOMS, type Room, type RoomId };
