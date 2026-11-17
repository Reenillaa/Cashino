import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { GAME_IDS, type GameId } from '@/engine/games/types.ts';
import { applyRound, emptyStats, newlyUnlocked, type GameStats } from '@/engine/meta/achievements.ts';
import { levelFromXp, roundXp, seasonAt, seasonTier, passReward, ALL_DAILY_MISSIONS, ALL_WEEKLY_MISSIONS, missionIncrement, type MissionDef, type MissionEvent } from '@/engine/meta/progression.ts';
import { utcDay, ECONOMY } from '@/engine/meta/economy.ts';
import { SP } from '@/engine/meta/ranking.ts';
import { useWallet } from './wallet';
import { useSession } from './session';

export interface RoundLog {
  id: string;
  game: GameId;
  ts: number;
  bet: number;
  payout: number;
  practice: boolean;
  /** Short human summary of the outcome, e.g. "2.00×", "Banker 7–5". */
  detail: string;
  /** Provably fair data (offline rounds). */
  fair?: { hash: string; clientSeed: string; nonce: number };
}

export interface Toast {
  id: string;
  kind: 'level' | 'achievement' | 'mission' | 'info';
  title: string;
  body?: string;
}

interface ProgressState {
  xp: number;
  roundXpDay: number;
  roundXpToday: number;
  spDay: number;
  spRoundsToday: number;
  seasonPoints: number;
  /** Season the local season points belong to (they restart with every season). */
  pointsSeason: number | null;
  passClaimed: string[];
  stats: Partial<Record<GameId, GameStats>>;
  practiceStats: Partial<Record<GameId, GameStats>>;
  history: RoundLog[];
  achievements: Record<string, number>; // id → unlocked ts
  missionDay: number;
  missionWeek: number;
  missionProgress: Record<string, number>;
  missionClaimed: Record<string, boolean>;
  varietyToday: GameId[];
  varietyWeek: GameId[];
  favorites: GameId[];
  bjDecisions: { correct: number; total: number };
  toasts: Toast[];
  recordRound: (r: Omit<RoundLog, 'id'>, opts?: { multiStep?: boolean }) => { xp: number; levelUp: number | null };
  addXp: (xp: number, reason?: string) => number | null;
  addSeasonPoints: (n: number) => void;
  syncSeason: () => void;
  /** Marks a pass tier as claimed if it is reached; returns its chips (or null). */
  claimPass: (tier: number, force?: boolean) => number | null;
  missionEvent: (e: MissionEvent) => void;
  claimMission: (m: MissionDef) => { coins: number; xp: number } | null;
  toggleFavorite: (g: GameId) => void;
  recordBjDecisions: (correct: number, total: number) => void;
  checkAchievements: (ctx: { lessons: number; tutorials: number }) => string[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  popToast: (id: string) => void;
  resetAll: () => void;
}

const initial = () => ({
  xp: 0,
  roundXpDay: 0,
  roundXpToday: 0,
  spDay: 0,
  spRoundsToday: 0,
  seasonPoints: 0,
  pointsSeason: null as number | null,
  passClaimed: [] as string[],
  stats: {},
  practiceStats: {},
  history: [] as RoundLog[],
  achievements: {} as Record<string, number>,
  missionDay: 0,
  missionWeek: 0,
  missionProgress: {} as Record<string, number>,
  missionClaimed: {} as Record<string, boolean>,
  varietyToday: [] as GameId[],
  varietyWeek: [] as GameId[],
  favorites: ['poker', 'blackjack', 'crash'] as GameId[],
  bjDecisions: { correct: 0, total: 0 },
  toasts: [] as Toast[],
});

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial(),
      recordRound: (r, opts) => {
        const day = utcDay(r.ts);
        const s = get();
        const key = r.practice ? 'practiceStats' : 'stats';
        const stats = { ...s[key], [r.game]: applyRound(s[key][r.game] ?? emptyStats(), { ...r, practice: r.practice }) };
        const history = [{ ...r, id: uid() }, ...s.history].slice(0, 200);
        set({ [key]: stats, history } as Partial<ProgressState>);
        if (r.practice) return { xp: 0, levelUp: null };
        // XP (daily capped) and season points (daily capped)
        const earned = s.roundXpDay === day ? s.roundXpToday : 0;
        const xp = roundXp(earned, !!opts?.multiStep);
        set({ roundXpDay: day, roundXpToday: earned + xp });
        const spRounds = s.spDay === day ? s.spRoundsToday : 0;
        const sp = spRounds * SP.round < SP.roundDailyCap ? SP.round : 0;
        set((st) => ({ spDay: day, spRoundsToday: spRounds + 1, seasonPoints: st.seasonPoints + sp }));
        const levelUp = get().addXp(xp);
        get().missionEvent({ type: 'round', game: r.game, won: r.payout > r.bet, multiplier: r.bet > 0 ? r.payout / r.bet : 0 });
        return { xp, levelUp };
      },
      addXp: (xp) => {
        if (xp <= 0) return null;
        const before = levelFromXp(get().xp).level;
        set((s) => ({ xp: s.xp + xp }));
        const after = levelFromXp(get().xp).level;
        if (after > before) {
          // Level-up gift (25 × level, local wallet). Accounts get progress rewards from the server.
          let bonus = 0;
          if (!useSession.getState().userId) {
            for (let l = before + 1; l <= after; l++) bonus += levelBonus(l);
            if (bonus > 0) useWallet.getState().credit(bonus, 'level');
          }
          get().pushToast({ kind: 'level', title: `${after}`, body: bonus > 0 ? `${bonus}` : undefined });
          return after;
        }
        return null;
      },
      addSeasonPoints: (n) => set((s) => ({ seasonPoints: s.seasonPoints + Math.max(0, n) })),
      syncSeason: () => {
        const n = seasonAt(Date.now()).number;
        const s = get();
        if (s.pointsSeason === null) set({ pointsSeason: n });
        else if (s.pointsSeason !== n) set({ pointsSeason: n, seasonPoints: 0 });
      },
      claimPass: (tier, force) => {
        get().syncSeason();
        const s = get();
        const key = `s${s.pointsSeason}-t${tier}`;
        const amount = passReward(tier);
        if (!amount || s.passClaimed.includes(key) || (!force && seasonTier(s.seasonPoints) < tier)) return null;
        set({ passClaimed: [...s.passClaimed, key].slice(-120) });
        return amount;
      },
      missionEvent: (e) => {
        const today = utcDay(Date.now());
        const week = Math.floor((today + 3) / 7);
        let s = get();
        if (s.missionDay !== today || s.missionWeek !== week) {
          const keepWeekly = s.missionWeek === week;
          const progress: Record<string, number> = {};
          const claimed: Record<string, boolean> = {};
          if (keepWeekly) for (const m of ALL_WEEKLY_MISSIONS) {
            progress[m.id] = s.missionProgress[m.id] ?? 0;
            claimed[m.id] = s.missionClaimed[m.id] ?? false;
          }
          set({ missionDay: today, missionWeek: week, missionProgress: progress, missionClaimed: claimed, varietyToday: [], varietyWeek: keepWeekly ? s.varietyWeek : [] });
          s = get();
        }
        const progress = { ...s.missionProgress };
        const varietyToday = e.type === 'round' && e.game && !s.varietyToday.includes(e.game) ? [...s.varietyToday, e.game] : s.varietyToday;
        const varietyWeek = e.type === 'round' && e.game && !s.varietyWeek.includes(e.game) ? [...s.varietyWeek, e.game] : s.varietyWeek;
        for (const m of ALL_DAILY_MISSIONS) progress[m.id] = m.kind === 'variety' ? varietyToday.length : (progress[m.id] ?? 0) + missionIncrement(m, e);
        for (const m of ALL_WEEKLY_MISSIONS) progress[m.id] = m.kind === 'variety' ? varietyWeek.length : (progress[m.id] ?? 0) + missionIncrement(m, e);
        set({ missionProgress: progress, varietyToday, varietyWeek });
      },
      claimMission: (m) => {
        const s = get();
        if (s.missionClaimed[m.id] || (s.missionProgress[m.id] ?? 0) < m.target) return null;
        set({ missionClaimed: { ...s.missionClaimed, [m.id]: true }, seasonPoints: s.seasonPoints + m.sp });
        get().addXp(m.xp);
        return { coins: m.coins, xp: m.xp };
      },
      toggleFavorite: (g) => set((s) => ({ favorites: s.favorites.includes(g) ? s.favorites.filter((x) => x !== g) : [...s.favorites, g] })),
      recordBjDecisions: (correct, total) => set((s) => ({ bjDecisions: { correct: s.bjDecisions.correct + correct, total: s.bjDecisions.total + total } })),
      checkAchievements: ({ lessons, tutorials }) => {
        const s = get();
        const totalRounds = GAME_IDS.reduce((n, g) => n + (s.stats[g]?.rounds ?? 0), 0);
        const ctx = { byGame: s.stats, totalRounds, lessons, tutorials, level: levelFromXp(s.xp).level };
        const fresh = newlyUnlocked(ctx, new Set(Object.keys(s.achievements)));
        if (fresh.length === 0) return [];
        const now = Date.now();
        set((st) => ({ achievements: { ...st.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, now])) }, seasonPoints: st.seasonPoints + fresh.length * SP.achievement }));
        for (const a of fresh) {
          get().addXp(a.xp);
          get().pushToast({ kind: 'achievement', title: a.id });
        }
        return fresh.map((a) => a.id);
      },
      pushToast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: uid() }].slice(-4) })),
      popToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      resetAll: () => set(initial()),
    }),
    {
      name: `${STORAGE_PREFIX}progress`,
      storage: persistStorage,
      version: 1,
      partialize: ({ toasts: _t, ...rest }) => rest,
    },
  ),
);

export const levelBonus = (level: number) => ECONOMY.levelUpBonusBase * level;
