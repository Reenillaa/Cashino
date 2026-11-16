import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AVATAR_COUNT, AchievementBadge, Avatar, useMyAvatar, useMyFrame, useMyTitle, TitleBadge, Button, GameLogo, Icon, PressableScale, Screen, Segmented, Sheet, T, formatCoins, formatMult } from '@/design/components';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '@/state/wallet';
import { FriendsSheet } from '@/features/social/FriendsSheet';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD, radius } from '@/design/tokens';
import { useT } from '@/i18n';
import { useProgress } from '@/state/progress';
import { useLearning } from '@/state/learning';
import { useSession } from '@/state/session';
import { supabase } from '@/services/supabase';
import { levelFromXp } from '@/engine/meta/progression.ts';
import { ACHIEVEMENTS, emptyStats, tierOf } from '@/engine/meta/achievements.ts';
import { GAME_IDS, type GameId } from '@/engine/games/types.ts';
import { VISIBLE_GAMES } from '@/games/catalog';

type Tab = 'stats' | 'achievements' | 'history';

export default function Profile() {
  const { t, lang } = useT();
  const myFrame = useMyFrame();
  const myTitle = useMyTitle(lang);
  const myAvatar = useMyAvatar(useSession((st) => st.profile?.avatar));
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useSession((s) => s.profile);
  const signedIn = useSession((s) => !!s.userId);
  const serverBalance = useSession((s) => s.balance);
  const guestBalance = useWallet((s) => s.balance);
  const xp = useProgress((s) => s.xp);
  const stats = useProgress((s) => s.stats);
  const history = useProgress((s) => s.history);
  const unlocked = useProgress((s) => s.achievements);
  const lessons = useLearning((s) => Object.keys(s.lessons).length);
  const [tab, setTab] = useState<Tab>('stats');
  const [game, setGame] = useState<GameId | 'all'>('all');
  const [edit, setEdit] = useState(false);
  const [friends, setFriends] = useState(false);
  const lvl = levelFromXp(xp);
  const balance = signedIn ? serverBalance ?? 0 : guestBalance;
  const all = GAME_IDS.reduce((acc, g) => {
    const s = stats[g] ?? emptyStats();
    return { rounds: acc.rounds + s.rounds, wins: acc.wins + s.wins, wagered: acc.wagered + s.wagered, returned: acc.returned + s.returned, biggestWin: Math.max(acc.biggestWin, s.biggestWin), bestMultiplier: Math.max(acc.bestMultiplier, s.bestMultiplier), bestStreak: Math.max(acc.bestStreak, s.bestStreak) };
  }, { rounds: 0, wins: 0, wagered: 0, returned: 0, biggestWin: 0, bestMultiplier: 0, bestStreak: 0 });
  const sel = game === 'all' ? all : { ...emptyStats(), ...stats[game] };
  const net = sel.returned - sel.wagered;
  const gotCount = Object.keys(unlocked).length;
  const playedGames = VISIBLE_GAMES.filter((g) => (stats[g.id]?.rounds ?? 0) > 0);
  return (
    <Screen>
      {/* hero: banner, avatar, name, level ring and balance */}
      <View style={[styles.hero, { marginTop: -insets.top, paddingTop: insets.top + 10 }]}>
        <LinearGradient colors={['#7B5CFF', '#B3127A', '#07040F']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.topRow}>
          <View style={{ flex: 1 }} />
          <PressableScale onPress={() => setFriends(true)} accessibilityLabel={t('social.friends')} style={styles.round}>
            <Icon name="userPlus" size={20} color="#fff" />
          </PressableScale>
          <PressableScale onPress={() => router.push('/settings')} accessibilityLabel={t('settings.title')} style={styles.round}>
            <Icon name="settings" size={20} color="#fff" />
          </PressableScale>
        </View>
        <PressableScale onPress={() => setEdit(true)} accessibilityLabel={t('profile.editProfile')} style={{ alignSelf: 'center' }}>
          <View style={styles.ring}>
            <Svg width={124} height={124} style={StyleSheet.absoluteFill}>
              <Circle cx={62} cy={62} r={57} stroke="rgba(255,255,255,0.18)" strokeWidth={6} fill="none" />
              <Circle cx={62} cy={62} r={57} stroke="#FFD06B" strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${(lvl.needed ? lvl.into / lvl.needed : 1) * 358} 358`} transform="rotate(-90 62 62)" />
            </Svg>
            <Avatar id={myAvatar} size={96} frame={myFrame} />
          </View>
          <View style={styles.lvl}><T weight="display" style={{ color: '#231A3A', fontSize: 12 }}>{t('common.level')} {lvl.level}</T></View>
          <View style={[styles.editBadge, { backgroundColor: c.surface3, borderColor: '#2A1A4A' }]}><Icon name="edit" size={13} color={c.text} /></View>
        </PressableScale>
        <T weight="display" align="center" style={{ color: '#fff', fontSize: 24, marginTop: 10 }}>{profile?.display_name || profile?.username || t('profile.guestName')}</T>
        {myTitle ? <View style={{ alignSelf: 'center', marginTop: 4 }}><TitleBadge title={myTitle.text} color={myTitle.color} /></View> : null}
        {profile ? <T variant="footnote" align="center" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>@{profile.username} · {t('profile.memberSince', { date: new Date(profile.created_at).toLocaleDateString() })}</T> : null}
        <View style={styles.balance}>
          <T style={{ fontSize: 16 }}>🪙</T>
          <T weight="display" tabular style={{ color: '#5BE3B0', fontSize: 20 }}>{formatCoins(balance)}</T>
          <T variant="footnote" style={{ color: 'rgba(255,255,255,0.7)' }}>· {lvl.into}/{lvl.needed} XP</T>
        </View>
      </View>
      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 10 }}>
        <View style={styles.tiles}>
          {[
            { k: t('profile.roundsPlayed'), v: formatCoins(all.rounds), e: '🎲', c: ['#7B5CFF', '#4B2BD6'] },
            { k: t('profile.winRate'), v: all.rounds ? `${((all.wins / all.rounds) * 100).toFixed(0)} %` : '—', e: '🎯', c: ['#12C08A', '#0B6E6E'] },
            { k: t('profile.biggestWin'), v: formatCoins(all.biggestWin), e: '💰', c: ['#FFB938', '#D9741C'] },
            { k: t('profile.achievements'), v: `${gotCount}/${ACHIEVEMENTS.length}`, e: '🏅', c: ['#FF4FA3', '#B3127A'] },
          ].map((x) => (
            <View key={x.k} style={styles.tile}>
              <LinearGradient colors={x.c as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <T style={{ fontSize: 20 }}>{x.e}</T>
              <T weight="display" tabular numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontSize: 20 }}>{x.v}</T>
              <T variant="caption" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.85)' }}>{x.k}</T>
            </View>
          ))}
        </View>
        {!signedIn && <Button title={t('profile.createAccount')} subtitle={t('profile.accountBenefits')} onPress={() => router.push('/auth')} full />}
      </View>
      <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 20 }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'stats', label: t('profile.stats') }, { value: 'achievements', label: t('profile.achievements') }, { value: 'history', label: t('profile.history') }]} />
      </View>
      {tab === 'stats' && (
        <>
          {/* game picker by icon */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: SCREEN_PAD, paddingTop: 14, paddingBottom: 4 }}>
            <PressableScale onPress={() => setGame('all')} feedback="select" accessibilityLabel={t('profile.overall')} style={[styles.gameBtn, { backgroundColor: c.surface2 }, game === 'all' && styles.gameOn]}>
              <Icon name="games" size={24} color="#fff" />
            </PressableScale>
            {[...playedGames, ...VISIBLE_GAMES.filter((g) => !playedGames.includes(g))].map(({ id: g }) => (
              <PressableScale key={g} onPress={() => setGame(g)} feedback="select" accessibilityLabel={t(`games.names.${g}`)} style={[styles.gameBtn, { backgroundColor: c.surface2, opacity: stats[g]?.rounds ? 1 : 0.45 }, game === g && styles.gameOn]}>
                <GameLogo game={g} size={38} />
              </PressableScale>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 10 }}>
            <View style={[styles.statCard, { backgroundColor: c.surface1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                {game === 'all' ? <Icon name="games" size={26} color="#fff" /> : <GameLogo game={game} size={34} />}
                <T weight="display" style={{ color: '#fff', fontSize: 18, flex: 1 }}>{game === 'all' ? t('profile.overall') : t(`games.names.${game}`)}</T>
                <T weight="display" tabular style={{ color: net >= 0 ? '#5BE3B0' : '#FF5C7A', fontSize: 18 }}>{net >= 0 ? '+' : '−'}{formatCoins(Math.abs(net))}</T>
              </View>
              <View style={styles.statGrid}>
                {[
                  [t('profile.roundsPlayed'), formatCoins(sel.rounds)],
                  [t('profile.winRate'), sel.rounds ? `${((sel.wins / sel.rounds) * 100).toFixed(1)} %` : '—'],
                  [t('profile.wagered'), formatCoins(sel.wagered)],
                  [t('profile.returned'), formatCoins(sel.returned)],
                  [t('profile.biggestWin'), formatCoins(sel.biggestWin)],
                  [t('profile.bestMultiplier'), sel.bestMultiplier ? formatMult(sel.bestMultiplier) : '—'],
                  [t('profile.bestStreak'), `${sel.bestStreak}`],
                  game === 'blackjack' ? [t('ranking.skill'), (() => { const d = useProgress.getState().bjDecisions; return d.total ? `${((d.correct / d.total) * 100).toFixed(1)} %` : '—'; })()] : [t('profile.lessons'), `${lessons}`],
                ].map(([k, v]) => (
                  <View key={k} style={[styles.stat, { backgroundColor: c.surface2 }]}>
                    <T weight="display" tabular numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontSize: 17 }}>{v}</T>
                    <T variant="caption" color="text3" numberOfLines={1}>{k}</T>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </>
      )}
      {tab === 'achievements' && (
        <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 14, gap: 10 }}>
          <View style={[styles.achHead, { backgroundColor: c.surface1 }]}>
            {(['bronze', 'silver', 'gold', 'diamond'] as const).map((tier) => {
              const list = ACHIEVEMENTS.filter((a) => tierOf(a) === tier);
              return (
                <View key={tier} style={{ flex: 1, alignItems: 'center' }}>
                  <AchievementBadge icon="trophy" tier={tier} got size={34} />
                  <T weight="display" tabular style={{ color: '#fff' }}>{list.filter((a) => unlocked[a.id]).length}/{list.length}</T>
                  <T variant="caption" color="text3">{t(`profile.tier.${tier}`)}</T>
                </View>
              );
            })}
          </View>
          <View style={styles.achGrid}>
            {[...ACHIEVEMENTS].sort((a, b) => Number(!!unlocked[b.id]) - Number(!!unlocked[a.id]) || TIER_ORDER[tierOf(a)] - TIER_ORDER[tierOf(b)]).map((a) => {
              const got = !!unlocked[a.id];
              const [name, desc] = t(`achievements.${a.id}`, { returnObjects: true }) as unknown as [string, string];
              return (
                <View key={a.id} style={[styles.ach, { backgroundColor: c.surface1, borderColor: got ? TIER_COLOR[tierOf(a)] : 'transparent' }]}>
                  <AchievementBadge icon={a.icon} tier={tierOf(a)} got={got} size={58} />
                  <T weight="display" align="center" numberOfLines={1} style={{ color: got ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 13 }}>{name}</T>
                  <T variant="caption" align="center" color="text3" numberOfLines={3}>{desc}</T>
                  <T variant="caption" weight="semibold" style={{ color: got ? TIER_COLOR[tierOf(a)] : 'rgba(255,255,255,0.4)' }}>{got ? `✓ +${a.xp} XP` : `+${a.xp} XP`}</T>
                </View>
              );
            })}
          </View>
        </View>
      )}
      {tab === 'history' && (
        <View style={{ marginHorizontal: SCREEN_PAD, marginTop: 14, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surface1 }}>
          {history.length === 0 ? <T variant="footnote" color="text3" style={{ padding: 16 }}>{t('home.noActivity')}</T> : history.slice(0, 60).map((h, i) => {
            const n = h.payout - h.bet;
            return (
              <View key={h.id} style={[styles.hist, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline }]}>
                <GameLogo game={h.game} size={30} />
                <View style={{ flex: 1 }}>
                  <T variant="footnote" weight="medium" numberOfLines={1}>{h.detail}</T>
                  <T variant="caption" color="text3" style={{ textTransform: 'none', letterSpacing: 0 }}>{new Date(h.ts).toLocaleString()}{h.practice ? ` · ${t('common.practice')}` : ''}{h.fair ? ` · nonce ${h.fair.nonce}` : ''}</T>
                </View>
                <T variant="footnote" weight="semibold" tabular color={n > 0 ? 'win' : 'text3'}>{n > 0 ? '+' : n < 0 ? '−' : ''}{formatCoins(Math.abs(n))}</T>
              </View>
            );
          })}
        </View>
      )}
      <EditProfile visible={edit} onClose={() => setEdit(false)} />
      <FriendsSheet visible={friends} onClose={() => setFriends(false)} />
    </Screen>
  );
}

const TIER_ORDER = { diamond: 0, gold: 1, silver: 2, bronze: 3 } as const;
const TIER_COLOR = { bronze: '#E09A5A', silver: '#C9CEE0', gold: '#FFD06B', diamond: '#7FD8FF' } as const;

function EditProfile({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { c } = useTheme();
  const profile = useSession((s) => s.profile);
  const signedIn = useSession((s) => !!s.userId);
  const [avatar, setAvatar] = useState(profile?.avatar ?? 'a3');
  const [name, setName] = useState(profile?.display_name ?? '');
  const save = async () => {
    if (supabase && signedIn && profile) {
      await supabase.from('profiles').update({ avatar, display_name: name.trim() || null }).eq('id', profile.id);
      await useSession.getState().refresh();
    } else {
      useSession.getState().setProfile(profile ? { ...profile, avatar, display_name: name } : { id: 'guest', username: 'guest', display_name: name || null, avatar, level: 1, xp: 0, created_at: new Date().toISOString() });
    }
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={t('profile.editProfile')}>
      <T variant="caption" color="text3">{t('profile.avatar')}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {Array.from({ length: AVATAR_COUNT }, (_, i) => `a${i}`).map((id) => (
          <PressableScale key={id} onPress={() => setAvatar(id)} accessibilityLabel={id} accessibilityState={{ selected: avatar === id }}>
            <Avatar id={id} size={48} ring={avatar === id ? c.text : undefined} />
          </PressableScale>
        ))}
      </View>
      <T variant="caption" color="text3" style={{ marginTop: 18 }}>{t('profile.displayName')}</T>
      <TextInput value={name} onChangeText={(v) => setName(v.slice(0, 40))} accessibilityLabel={t('profile.displayName')} placeholderTextColor={c.text3} style={{ height: 46, borderRadius: 14, backgroundColor: c.surface2, color: c.text, paddingHorizontal: 14, marginTop: 8, fontFamily: 'Geist_400Regular', fontSize: 16 }} />
      <Button title={t('common.save')} onPress={() => void save()} style={{ marginTop: 18 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 18, marginBottom: 12, overflow: 'hidden' },
  topRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PAD, marginBottom: 4 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  ring: { width: 124, height: 124, alignItems: 'center', justifyContent: 'center' },
  lvl: { position: 'absolute', bottom: -6, alignSelf: 'center', paddingHorizontal: 10, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: '#FFD06B' },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 10, paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, height: 96, borderRadius: 20, padding: 12, overflow: 'hidden', justifyContent: 'space-between' },
  gameBtn: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  gameOn: { borderColor: '#FFD06B', backgroundColor: 'rgba(255,208,107,0.15)' },
  statCard: { borderRadius: 22, padding: 14 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', flexGrow: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  achHead: { flexDirection: 'row', borderRadius: 20, padding: 12 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ach: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 3, padding: 10, borderRadius: 18, borderWidth: 1.5 },
  editBadge: { position: 'absolute', right: 6, bottom: 6, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  fav: { width: 104, height: 84, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
});
