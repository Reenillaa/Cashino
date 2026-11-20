/**
 * `push` Edge Function — web push for the installed web app.
 *   { action: 'subscribe', subscription, prefs }  (signed in) → saves this browser's subscription
 *   { action: 'unsubscribe', endpoint }            (signed in) → forgets it
 *   { action: 'tick' }                             (public, idempotent) → queues what is due and sends the queue:
 *       · yesterday's tournament winners (paid first), · today's gift for players who haven't collected it
 *         (from 17:00 UTC), · chips received from friends (queued by a database trigger).
 * Every notification has a unique `dedupe` key, so calling `tick` more often never sends anything twice.
 */
import webpush from 'npm:web-push@3.6.7';
import { admin, handler, HttpError, json, requireUser } from '../_shared/http.ts';
import { tournamentDay, tournamentGame } from '../_shared/engine/meta/tournament.ts';

const PUB = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const PRIV = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'https://reenillaa.github.io/Cashino/';
if (PUB && PRIV) webpush.setVapidDetails(SUBJECT.startsWith('http') || SUBJECT.startsWith('mailto:') ? SUBJECT : `mailto:${SUBJECT}`, PUB, PRIV);
const BASE = '/Cashino';
const NAMES: Record<string, string> = { roulette: 'Ruleta Llamarada', slots: 'Tragaperras', cascade: 'Dulce Cascada', fishing: 'Lago de Oro', goldmine: 'Mina de Oro', jade: 'Templo de Jade', fruits: 'Fuego Frutal', pirate: 'Noche Pirata', angler: 'Pesca Profunda', penguin: 'Pingüino Saltarín', plinko: 'Plinko', dice: 'Dados', mines: 'Minas', crash: 'Cohete', wheel: 'Rueda', towers: 'Torre del Dragón', diamonds: 'Diamantes', pump: 'Globo', dragontiger: 'Dragon Tiger', baccarat: 'Bacará', limbo: 'Limbo', coinflip: 'Cara o cruz', hilo: 'Mayor o menor', crossing: 'Cruza la calle', videopoker: 'Video Póker', blackjack: 'Blackjack', trader: 'Bolsa', horses: 'Carreras' };

type DB = ReturnType<typeof admin>;

async function queueDue(db: DB, now: number) {
  const day = tournamentDay(now);
  // tournament winners of yesterday (pay first, idempotent)
  await db.rpc('settle_daily', { p_day: day - 1, p_game: tournamentGame(day - 1) });
  const { data: won } = await db.from('daily_awards').select('rank, user_id, prize, game').eq('day', day - 1);
  const medal = ['🥇', '🥈', '🥉'];
  for (const w of won ?? []) {
    await db.from('push_queue').upsert({
      user_id: w.user_id, kind: 'tournaments', dedupe: `tour:${day - 1}:${w.user_id}`,
      title: `${medal[w.rank - 1] ?? '🏆'} ¡Has ganado el torneo de ${NAMES[w.game] ?? w.game}!`,
      body: `Puesto ${w.rank}: +${w.prize} fichas ya están en tu cartera.`, url: `${BASE}/ranking`,
    }, { onConflict: 'dedupe', ignoreDuplicates: true });
  }
  // today's gift, from 17:00 UTC, for subscribed players who have not collected it
  if (new Date(now).getUTCHours() >= 17) {
    const today = new Date(day * 86_400_000).toISOString().slice(0, 10);
    const { data: subs } = await db.from('push_subscriptions').select('user_id').eq('prefs->>daily', 'true').limit(1000);
    const users = [...new Set((subs ?? []).map((s) => s.user_id))];
    if (users.length) {
      const { data: claimed } = await db.from('reward_claims').select('user_id').eq('kind', 'daily').eq('period', today).in('user_id', users);
      const done = new Set((claimed ?? []).map((c) => c.user_id));
      const rows = users.filter((u) => !done.has(u)).map((u) => ({
        user_id: u, kind: 'daily', dedupe: `daily:${today}:${u}`, title: '🎁 Tu regalo de hoy te espera', body: 'Pásate a recogerlo cuando quieras (sin prisa).', url: `${BASE}/`,
      }));
      if (rows.length) await db.from('push_queue').upsert(rows, { onConflict: 'dedupe', ignoreDuplicates: true });
    }
  }
}

async function drain(db: DB, onlyUser?: string) {
  let q = db.from('push_queue').select('*').is('sent_at', null).gt('created_at', new Date(Date.now() - 2 * 86_400_000).toISOString()).order('created_at').limit(200);
  if (onlyUser) q = q.eq('user_id', onlyUser);
  const { data: items } = await q;
  let sent = 0, gone = 0;
  for (const it of items ?? []) {
    // mark first: a notification is never sent twice, even if two ticks overlap
    const { data: claimed } = await db.from('push_queue').update({ sent_at: new Date().toISOString() }).eq('id', it.id).is('sent_at', null).select('id').maybeSingle();
    if (!claimed) continue;
    const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', it.user_id);
    for (const s of subs ?? []) {
      if ((s.prefs as Record<string, boolean>)?.[it.kind] === false) continue;
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: it.title, body: it.body, url: it.url, tag: it.kind }), { TTL: 6 * 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          gone++;
        }
      }
    }
  }
  return { sent, gone };
}

Deno.serve(
  handler(async (req, body) => {
    const db = admin();
    const action = String(body.action ?? '');
    if (action === 'tick') {
      if (!PUB || !PRIV) throw new HttpError('push_not_configured', 503);
      await queueDue(db, Date.now());
      return json({ ok: true, ...(await drain(db)) });
    }
    const userId = await requireUser(req);
    if (action === 'subscribe') {
      const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
      if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth || !/^https:\/\//.test(sub.endpoint)) throw new HttpError('invalid_subscription');
      const p = (body.prefs ?? {}) as Record<string, unknown>;
      const prefs = { daily: p.daily !== false, social: p.social !== false, tournaments: p.tournaments !== false };
      const { error } = await db.from('push_subscriptions').upsert({ endpoint: sub.endpoint, user_id: userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, prefs }, { onConflict: 'endpoint' });
      if (error) throw new Error(error.message);
      return json({ ok: true, publicKey: PUB });
    }
    if (action === 'unsubscribe') {
      await db.from('push_subscriptions').delete().eq('endpoint', String(body.endpoint ?? '')).eq('user_id', userId);
      return json({ ok: true });
    }
    if (action === 'poke') {
      // after sending chips: deliver what was just queued for that friend right away
      const to = String(body.to ?? '');
      if (!/^[0-9a-f-]{36}$/.test(to)) throw new HttpError('invalid_user');
      return json({ ok: true, ...(await drain(db, to)) });
    }
    throw new HttpError('invalid_action');
  }),
);
