/**
 * `rewards` Edge Function — daily gift, balance refill, mission and season-pass rewards, decided by server rules
 * (same constants as src/engine/meta/economy.ts) and recorded once per period via `claim_reward`.
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';
import { ECONOMY, dailyRewardAmount, nextStreak, utcDay } from '../_shared/engine/meta/economy.ts';
import { dailyMissions, weeklyMissions, passReward, seasonAt, seasonTier, type MissionDef } from '../_shared/engine/meta/progression.ts';

const dayKey = (d: number) => new Date(d * 86_400_000).toISOString().slice(0, 10);

async function missionProgress(db: ReturnType<typeof admin>, userId: string, m: MissionDef, weekly: boolean, today: number): Promise<number> {
  const from = new Date((weekly ? today - ((today + 3) % 7) : today) * 86_400_000).toISOString();
  const { data: rounds } = await db.from('game_rounds').select('game, bet, payout').eq('user_id', userId).gte('created_at', from).limit(5000);
  const list = rounds ?? [];
  switch (m.kind) {
    case 'playRounds': return list.length;
    case 'playGame': return list.filter((r) => r.game === m.game).length;
    case 'pokerHands': return list.filter((r) => r.game === 'poker').length;
    case 'winRounds': return list.filter((r) => r.payout > r.bet).length;
    case 'multiplier': return list.filter((r) => r.bet > 0 && r.payout / r.bet >= 2).length;
    case 'variety': return new Set(list.map((r) => r.game)).size;
    case 'lesson':
    case 'quiz': {
      const { data } = await db.from('progress').select('lessons').eq('user_id', userId).single();
      const since = Date.parse(from);
      return Object.values((data?.lessons ?? {}) as Record<string, number>).filter((ts) => Number(ts) >= since).length;
    }
  }
}

Deno.serve(
  handler(async (req, body) => {
    const userId = await requireUser(req);
    const db = admin();
    const today = utcDay(Date.now());
    const action = String(body.action ?? '');
    if (action === 'daily') {
      const { data: last } = await db.from('reward_claims').select('period, amount').eq('user_id', userId).eq('kind', 'daily').order('period', { ascending: false }).limit(8);
      // Reconstruct the streak from the claim history (no client input involved).
      let state = { lastClaimDay: null as number | null, streak: 0 };
      for (const c of (last ?? []).slice().reverse()) {
        const d = Math.floor(Date.parse(`${c.period}T00:00:00Z`) / 86_400_000);
        state = { lastClaimDay: d, streak: nextStreak(state, d) };
      }
      const streak = nextStreak(state, today);
      const amount = dailyRewardAmount(streak);
      const { data: balance, error } = await db.rpc('claim_reward', { p_user: userId, p_kind: 'daily', p_period: dayKey(today), p_amount: amount });
      rpcError(error);
      return json({ amount, streak, balance });
    }
    if (action === 'refill') {
      const { data: w } = await db.from('wallets').select('balance').eq('user_id', userId).single();
      if (!w || w.balance >= ECONOMY.refillThreshold) throw new HttpError('not_eligible', 409);
      const { count } = await db.from('reward_claims').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'refill').like('period', `${dayKey(today)}#%`);
      if ((count ?? 0) >= ECONOMY.refillsPerDay) throw new HttpError('limit_reached', 409);
      const amount = ECONOMY.refillAmount - Number(w.balance);
      const { data: balance, error } = await db.rpc('claim_reward', { p_user: userId, p_kind: 'refill', p_period: `${dayKey(today)}#${(count ?? 0) + 1}`, p_amount: amount });
      rpcError(error);
      return json({ amount, balance });
    }
    if (action === 'mission') {
      const id = String(body.missionId ?? '');
      const daily = dailyMissions(today).find((m) => m.id === id);
      const weekly = weeklyMissions(today).find((m) => m.id === id);
      const m = daily ?? weekly;
      if (!m) throw new HttpError('unknown_mission', 404);
      const progress = await missionProgress(db, userId, m, !!weekly, today);
      if (progress < m.target) throw new HttpError('not_completed', 409);
      const period = weekly ? `${id}@w${Math.floor((today + 3) / 7)}` : `${id}@${dayKey(today)}`;
      const { data: balance, error } = await db.rpc('claim_reward', { p_user: userId, p_kind: 'mission', p_period: period, p_amount: m.coins });
      rpcError(error);
      await db.rpc('award_progress', { p_user: userId, p_xp: m.xp, p_sp: m.sp, p_round: false });
      return json({ amount: m.coins, balance });
    }
    if (action === 'pass') {
      const tier = Number(body.tier);
      const season = seasonAt(Date.now()).number;
      const amount = passReward(tier);
      if (!amount) throw new HttpError('unknown_tier', 404);
      const { data: sc } = await db.from('season_scores').select('points').eq('user_id', userId).eq('season', season).maybeSingle();
      if (seasonTier(sc?.points ?? 0) < tier) throw new HttpError('not_completed', 409);
      const { data: balance, error } = await db.rpc('claim_reward', { p_user: userId, p_kind: 'pass', p_period: `s${season}-t${tier}`, p_amount: amount });
      rpcError(error);
      return json({ amount, balance });
    }
    throw new HttpError('unknown_action');
  }),
);
