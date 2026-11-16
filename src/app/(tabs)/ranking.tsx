import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Chip, GameGlyph, GameLogo, Glass, ListGroup, ListRow, PressableScale, ProgressBar, Screen, Section, Segmented, Sheet, Surface, T } from '@/design/components';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD, radius } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { supabase, onlineConfigured } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useProgress } from '@/state/progress';
import { useLearning, tutorialKey } from '@/state/learning';
import type { GameId } from '@/engine/games/types.ts';
import { seasonAt, seasonTier, SEASON_TIERS, SEASON_TIER_POINTS } from '@/engine/meta/progression.ts';
import { masteryScore, blackjackSkill } from '@/engine/meta/ranking.ts';
import { ACHIEVEMENTS } from '@/engine/meta/achievements.ts';
import { META, VISIBLE_GAMES } from '@/games/catalog';
import { LESSONS } from '@/features/academy/content';
import { WeeklyBoard } from '@/features/ranking/WeeklyBoard';
import { useNow } from '@/features/time/useNow';

const HOW: [string, { es: string; en: string }][] = [
  ['ranking.points', { es: 'Rondas +2 (máx. 200/día) · Lección +30 · Logro +50 · Sit & Go: 1º +120, top 3 +50 · Misiones.', en: 'Rounds +2 (max 200/day) · Lesson +30 · Achievement +50 · Sit & Go: 1st +120, top 3 +50 · Missions.' }],
  ['ranking.rating', { es: 'Elo multijugador entre humanos en Sit & Go online (los bots no cuentan). Mínimo 3 torneos.', en: 'Multiplayer Elo between humans in online Sit & Go (bots never count). Minimum 3 tournaments.' }],
  ['ranking.skill', { es: 'Blackjack: límite inferior de Wilson de tu precisión frente a la estrategia básica.', en: 'Blackjack: Wilson lower bound of your accuracy against basic strategy.' }],
  ['ranking.mastery', { es: 'Juegos de azar: 40 % participación (logarítmica) + 35 % Academy + 20 % logros + 5 % tutorial.', en: 'Games of chance: 40 % participation (log-scaled) + 35 % Academy + 20 % achievements + 5 % tutorial.' }],
];

interface Entry { user_id: string; username: string; avatar: string; value: number; rank: number }
type Scope = 'week' | 'global' | 'game' | 'friends';

export default function Ranking() {
  const { t, lang } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const userId = useSession((s) => s.userId);
  const [scope, setScope] = useState<Scope>('week');
  const [game, setGame] = useState<GameId>('poker');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [how, setHow] = useState(false);
  const now = useNow();
  const season = seasonAt(now);
  const seasonPoints = useProgress((s) => s.seasonPoints);
  const stats = useProgress((s) => s.stats);
  const bj = useProgress((s) => s.bjDecisions);
  const achievements = useProgress((s) => s.achievements);
  const lessons = useLearning((s) => s.lessons);
  const tutorials = useLearning((s) => s.tutorials);

  useEffect(() => {
    if (!supabase || !userId) return;
    let alive = true;
    const run = async () => {
      let rows: Entry[] = [];
      if (scope === 'global' || scope === 'friends') {
        let q = supabase!.from('leaderboard_season').select('user_id, username, avatar, points, rank').eq('season', season.number).order('points', { ascending: false }).limit(50);
        if (scope === 'friends') {
          const { data: fr } = await supabase!.from('friendships').select('requester, addressee').eq('status', 'accepted');
          const ids = [userId, ...(fr ?? []).map((f) => (f.requester === userId ? f.addressee : f.requester))];
          q = q.in('user_id', ids);
        }
        const { data } = await q;
        rows = (data ?? []).map((r, i) => ({ user_id: r.user_id, username: r.username, avatar: r.avatar, value: r.points, rank: scope === 'friends' ? i + 1 : r.rank }));
      } else if (game === 'poker') {
        const { data } = await supabase!.from('leaderboard_poker').select('user_id, username, avatar, rating, rank').order('rating', { ascending: false }).limit(50);
        rows = (data ?? []).map((r) => ({ user_id: r.user_id, username: r.username, avatar: r.avatar, value: r.rating, rank: r.rank }));
      } else {
        const col = game === 'blackjack' ? 'skill' : 'score';
        const { data } = await supabase!.from('leaderboard_games').select(`user_id, username, avatar, ${col}`).eq('game', game).not(col, 'is', null).order(col, { ascending: false }).limit(50);
        rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r, i) => ({ user_id: String(r.user_id), username: String(r.username), avatar: String(r.avatar), value: Number(r[col]), rank: i + 1 }));
      }
      if (alive) setEntries(rows);
    };
    void run().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [scope, game, userId, season.number]);

  // Local preview (also shown offline): same formulas as the server.
  const lessonsFor = (g: GameId) => Object.keys(lessons).filter((k) => k.startsWith(`${g}.`)).length;
  const totalLessons = (g: GameId) => LESSONS.filter((l) => l.game === g).length || 1;
  const gameAch = ACHIEVEMENTS.length ? Object.keys(achievements).length / ACHIEVEMENTS.length : 0;
  const localValue =
    scope === 'game'
      ? game === 'blackjack'
        ? blackjackSkill(bj.correct, bj.total)
        : masteryScore({ rounds: stats[game]?.rounds ?? 0, academyProgress: lessonsFor(game) / totalLessons(game), achievementRatio: gameAch, tutorialDone: !!tutorials[tutorialKey(game)] })
      : seasonPoints;
  const list = userId ? entries : [];
  const me = list.find((e) => e.user_id === userId);
  const metricLabel = scope !== 'game' ? t('ranking.points') : game === 'poker' ? t('ranking.rating') : game === 'blackjack' ? t('ranking.skill') : t('ranking.mastery');
  return (
    <Screen title={t('ranking.title')} subtitle={`${t('home.season', { n: season.number })} · ${new Date(season.end).toLocaleDateString()}`} right={<Chip label={t('ranking.how')} icon="info" onPress={() => setHow(true)} />}>
      <View style={{ paddingHorizontal: SCREEN_PAD }}>
        <Segmented value={scope} onChange={setScope} options={[{ value: 'week', label: t('ranking.weekly') }, { value: 'global', label: t('ranking.seasonShort') }, { value: 'game', label: t('ranking.perGame') }, { value: 'friends', label: t('ranking.friends') }]} />
      </View>
      {scope === 'game' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SCREEN_PAD, paddingTop: 12 }}>
          {VISIBLE_GAMES.map(({ id: g }) => (
            <PressableScale key={g} onPress={() => setGame(g)} feedback="select" accessibilityLabel={t(`games.names.${g}`)} style={[styles.gameBtn, game === g && styles.gameOn]}>
              <GameLogo game={g} size={36} />
            </PressableScale>
          ))}
        </ScrollView>
      )}
      {scope === 'week' ? <View style={{ marginTop: 16 }}><WeeklyBoard /></View> : null}
      {scope !== 'week' ? (<>
      {/* "You" card floats (glass) like the user's row in Offsuit's leaderboard, but in titanium. */}
      <Glass radius={radius.lg} style={{ marginHorizontal: SCREEN_PAD, marginTop: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <T variant="display" tabular style={{ minWidth: 56 }}>{me ? `#${me.rank}` : '—'}</T>
        <View style={{ flex: 1 }}>
          <T variant="caption" color="text3">{t('ranking.you')}</T>
          <T variant="headline" tabular>{(me?.value ?? localValue).toLocaleString('es-ES')} <T variant="footnote" color="text3">{metricLabel}</T></T>
        </View>
        {scope === 'game' ? <GameGlyph game={game} size={28} color={META[game].tint} /> : null}
      </Glass>
      {/* season pass and friend leagues */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: SCREEN_PAD, marginTop: 10 }}>
        <PressableScale onPress={() => router.push('/pass')} feedback="select" scaleTo={0.97} accessibilityLabel={t('pass.title')} style={styles.promo}>
          <LinearGradient colors={['#7B5CFF', '#FF4FA3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <T style={{ fontSize: 24 }}>🎟️</T>
          <T weight="display" style={{ color: '#fff' }}>{t('pass.title')}</T>
          <T variant="caption" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('home.seasonTier', { tier: `${seasonTier(seasonPoints)}/${SEASON_TIERS}` })}</T>
          <ProgressBar value={(seasonPoints % SEASON_TIER_POINTS) / SEASON_TIER_POINTS} tint="#FFD06B" height={5} style={{ marginTop: 6 }} />
        </PressableScale>
        <PressableScale onPress={() => router.push('/leagues')} feedback="select" scaleTo={0.97} accessibilityLabel={t('leagues.title')} style={styles.promo}>
          <LinearGradient colors={['#12C08A', '#0B6E6E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <T style={{ fontSize: 24 }}>🏆</T>
          <T weight="display" style={{ color: '#fff' }}>{t('leagues.banner')}</T>
          <T variant="caption" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('leagues.bannerBody')}</T>
        </PressableScale>
      </View>
      <Section title={userId ? metricLabel : t('ranking.localPreview')}>
        {!userId ? (
          <T variant="footnote" color="text3" style={{ paddingHorizontal: SCREEN_PAD }}>{onlineConfigured ? t('ranking.offlineNote') : t('auth.notConfigured')}</T>
        ) : list.length === 0 ? (
          <T variant="footnote" color="text3" style={{ paddingHorizontal: SCREEN_PAD }}>{t('common.empty')}</T>
        ) : (
          <View style={{ marginHorizontal: SCREEN_PAD, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surface1, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline }}>
            {list.map((e, i) => (
              <View key={e.user_id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline }, e.user_id === userId && { backgroundColor: c.surface3 }]} accessible accessibilityLabel={`${e.rank}. ${e.username}, ${e.value}`}>
                <T variant="callout" weight="semibold" tabular style={{ width: 34 }} color={e.rank <= 3 ? 'text' : 'text3'}>{e.rank}</T>
                <Avatar id={e.avatar} size={32} />
                <T variant="body" style={{ flex: 1 }} numberOfLines={1}>{e.username}</T>
                <T variant="callout" weight="semibold" tabular>{e.value.toLocaleString('es-ES')}</T>
              </View>
            ))}
          </View>
        )}
      </Section>
      </>) : null}
      {!userId && onlineConfigured && scope !== 'week' && (
        <ListGroup style={{ marginTop: 16 }}>
          <ListRow icon="profile" title={t('profile.createAccount')} subtitle={t('profile.accountBenefits')} onPress={() => router.push('/auth')} />
        </ListGroup>
      )}
      <Sheet visible={how} onClose={() => setHow(false)} title={t('ranking.how')}>
        <T variant="body" color="text2">{t('ranking.howBody')}</T>
        <View style={{ gap: 8, marginTop: 16 }}>
          {HOW.map(([k, v]) => (
            <Surface key={k} level={2}>
              <T variant="callout" weight="semibold">{t(k)}</T>
              <T variant="footnote" color="text2" style={{ marginTop: 4 }}>{tr(v, lang)}</T>
            </Surface>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  promo: { flex: 1, minHeight: 112, padding: 12, borderRadius: 20, overflow: 'hidden', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 56 },
  gameBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 2, borderColor: 'transparent' },
  gameOn: { borderColor: '#FFD06B', backgroundColor: 'rgba(255,208,107,0.15)' },
});
