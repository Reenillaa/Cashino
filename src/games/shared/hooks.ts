import { useCallback, useMemo, useState } from 'react';
import type { GameId } from '@/engine/games/types.ts';
import type { Room } from '@/engine/meta/rooms.ts';
import { useProgress } from '@/state/progress';
import { useT } from '@/i18n';
import { formatMult } from '@/design/components';
import type { HistoryItem } from './HistoryStrip';
import type { ResultInfo } from './ResultBanner';
import { PlayError } from '@/features/play/session';
import { OnlineError } from '@/services/supabase';
import { useHiddenIds, useReveal } from '@/features/play/reveal';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

/** Last results of a game for the history strip (persisted with progress). */
export function useGameHistory(game: GameId, label?: (detail: string, mult: number) => string): HistoryItem[] {
  const history = useProgress((s) => s.history);
  const hidden = useHiddenIds();
  return useMemo(
    () =>
      history
        .filter((h) => h.game === game && !(hidden && hidden.split(',').includes(h.id)))
        .slice(0, 16)
        .map((h) => {
          const mult = h.bet > 0 ? h.payout / h.bet : 0;
          return { id: h.id, label: label ? label(h.detail, mult) : formatMult(mult), win: h.payout > h.bet ? true : h.payout === h.bet && h.bet > 0 ? null : false };
        }),
    [history, game, hidden], // eslint-disable-line react-hooks/exhaustive-deps
  );
}

const lastBets: Partial<Record<string, number>> = {};
/** Bet amount remembered per game and room, always starting inside the room limits. */
export function useBet(game: GameId, room: Room) {
  const key = `${game}:${room.id}`;
  const [state, setState] = useState<{ key: string; bet: number }>({ key, bet: lastBets[key] ?? room.min });
  const bet = state.key === key ? state.bet : lastBets[key] ?? room.min;
  const setBet = useCallback(
    (v: number) => {
      lastBets[key] = v;
      setState({ key, bet: v });
    },
    [key],
  );
  return [bet, setBet] as const;
}

export function useResult() {
  const [result, setResult] = useState<ResultInfo | null>(null);
  const show = useCallback((r: { bet: number; payout: number; multiplier?: number; label?: string }, opts?: { silent?: boolean }) => {
    const net = r.payout - r.bet;
    // the round is on screen now: its chips and its history entry can show
    useReveal.getState().revealOne();
    setResult({ key: `${Date.now()}`, net, payout: r.payout, multiplier: r.multiplier, label: r.label });
    if (opts?.silent) return;
    if (net > 0) {
      sfx(r.multiplier && r.multiplier >= 10 ? 'bigwin' : 'win');
      haptic.success();
    } else if (net < 0) {
      sfx('lose', 0.7);
      haptic.soft();
    }
  }, []);
  return { result, show, clear: () => setResult(null) };
}

export function usePlayErrors() {
  const { t } = useT();
  return useCallback(
    (e: unknown) => {
      haptic.error();
      let code = e instanceof PlayError || e instanceof OnlineError ? (e instanceof OnlineError ? e.code : e.message) : 'error';
      if (code === 'error' && e instanceof Error && /^[a-z_]+$/.test(e.message)) code = e.message;
      if (code === 'busy') return;
      const known = t(`errors.${code}`);
      const msg = code.startsWith('hot_table') ? t('play.hotTableError', { max: code.split(':')[1] ?? '' }) : code.startsWith('room_max:') ? t('rooms.maxReached', { max: code.split(':')[1] }) : code === 'stake_outside_room' ? t('rooms.limits') : code === 'insufficient' ? t('common.insufficient') : code === 'not_configured' ? t('auth.notConfigured') : code === 'network' ? t('common.offline') : known !== `errors.${code}` ? known : `${t('common.error')} (${code})`;
      useProgress.getState().pushToast({ kind: 'info', title: msg });
    },
    [t],
  );
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
