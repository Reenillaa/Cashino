/**
 * Rooms ("salas"): every game is played in a room that fixes the bet limits, like the tables of a
 * card room. Limits are enforced by the shared protocol, so the server applies exactly the same rule.
 */
export type RoomId = 'practice' | 'r1' | 'r2' | 'r3';
export interface Room {
  id: RoomId;
  min: number;
  max: number;
  /** Practice rooms use free practice chips (no value, no rankings). */
  practice: boolean;
  /** Chip denominations offered in table games (roulette, sic bo, baccarat). */
  chips: number[];
  /** Poker: blinds of the cash table and buy-in range (= min..max). */
  poker: { sb: number; bb: number };
}

export const ROOMS: Room[] = [
  { id: 'practice', min: 10, max: 500, practice: true, chips: [10, 25, 50, 100], poker: { sb: 5, bb: 10 } },
  { id: 'r1', min: 20, max: 100, practice: false, chips: [5, 10, 20, 50], poker: { sb: 1, bb: 2 } },
  { id: 'r2', min: 200, max: 1000, practice: false, chips: [50, 100, 200, 500], poker: { sb: 10, bb: 20 } },
  { id: 'r3', min: 2000, max: 10000, practice: false, chips: [500, 1000, 2000, 5000], poker: { sb: 100, bb: 200 } },
];

export const DEFAULT_ROOM: RoomId = 'r1';

export function roomById(id: unknown): Room | undefined {
  return ROOMS.find((r) => r.id === id);
}

/** A room can be entered when the balance covers its minimum bet. */
export function canEnterRoom(room: Room, balance: number): boolean {
  return room.practice || balance >= room.min;
}

/** Initial stake of a round must fall inside the room limits. */
export function stakeAllowed(room: Room, stake: number): boolean {
  return Number.isInteger(stake) && stake >= room.min && stake <= room.max;
}

export function clampToRoom(room: Room, bet: number, balance: number): number {
  return Math.max(room.min, Math.min(room.max, Math.floor(balance), Math.floor(bet)));
}
