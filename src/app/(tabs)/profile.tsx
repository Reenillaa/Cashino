import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AVATAR_COUNT, Avatar, Button, Chip, GameGlyph, Icon, IconButton, ListGroup, ListRow, PressableScale, ProgressBar, Screen, Segmented, Sheet, Surface, T, formatCoins, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { SCREEN_PAD, radius } from '@/design/tokens';
import { useT } from '@/i18n';
import { useProgress } from '@/state/progress';
import { useLearning } from '@/state/learning';
import { useSession } from '@/state/session';
import { supabase, onlineConfigured } from '@/services/supabase';
import { levelFromXp } from '@/engine/meta/progression.ts';
import { ACHIEVEMENTS, emptyStats } from '@/engine/meta/achievements.ts';
import { GAME_IDS, type GameId } from '@/engine/games/types.ts';
import { META } from '@/games/catalog';

type Tab = 'stats' | 'achievements' | 'history';

export default function Profile() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const profile = useSession((s) => s.profile);
  const signedIn = useSession((s) => !!s.userId);
  const xp = useProgress((s) => s.xp);
  const stats = useProgress((s) => s.stats);
  const history = useProgress((s) => s.history);
  const unlocked = useProgress((s) => s.achievements);
  const lessons = useLearning((s) => Object.keys(s.lessons).length);
  const tutorials = useLearning((s) => Object.values(s.tutorials).filter(Boolean).length);
  const [tab, setTab] = useState<Tab>('stats');
  const [game, setGame] = useState<GameId | 'all'>('all');
  const [edit, setEdit] = useState(false);
  const lvl = levelFromXp(xp);
  const all = GAME_IDS.reduce((acc, g) => {
    const s = stats[g] ?? emptyStats();
    return { rounds: acc.rounds + s.rounds, wins: acc.wins + s.wins, wagered: acc.wagered + s.wagered, returned: acc.returned + s.returned, biggestWin: Math.max(acc.biggestWin, s.biggestWin), bestMultiplier: Math.max(acc.bestMultiplier, s.bestMultiplier) };
  }, { rounds: 0, wins: 0, wagered: 0, returned: 0, biggestWin: 0, bestMultiplier: 0 });
  const sel = game === 'all' ? all : { ...emptyStats(), ...stats[game] };
  return (
    <Screen title={t('profile.title')} right={<IconButton icon="settings" label={t('settings.title')} onPress={() => router.push('/settings')} />}>
      <View style={{ alignItems: 'center', paddingHorizontal: SCREEN_PAD, gap: 8 }}>
        <PressableScale onPress={() => setEdit(true)} accessibilityLabel={t('profile.editProfile')}>
          <Avatar id={profile?.avatar ?? 'a3'} size={88} />
          <View style={[styles.editBadge, { backgroundColor: c.surface3, borderColor: c.bg }]}><Icon name="edit" size={14} color={c.text} /></View>
        </PressableScale>
        <T variant="title">{profile?.display_name || profile?.username || t('profile.guestName')}</T>
        {profile ? <T variant="footnote" color="text3">@{profile.username} · {t('profile.memberSince', { date: new Date(profile.created_at).toLocaleDateString() })}</T> : null}
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="footnote" weight="semibold">{t('common.level')} {lvl.level}</T>
            <T variant="footnote" color="text3" tabular>{lvl.into}/{lvl.needed} XP</T>
          </View>
          <ProgressBar value={lvl.needed ? lvl.into / lvl.needed : 1} style={{ marginTop: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: 12, paddingVertical: 14, borderRadius: 22, backgroundColor: c.surface1 }}>
          {[[t('profile.roundsPlayed'), formatCoins(all.rounds)], [t('profile.lessons'), `${lessons}`], [t('profile.tutorials'), `${tutorials}/14`], [t('profile.achievements'), `${Object.keys(unlocked).length}/${ACHIEVEMENTS.length}`]].map(([k, v], i) => (
            <View key={k} style={[{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.hairline }]}>
              <T variant="headline" weight="medium" tabular>{v}</T>
              <T variant="footnote" color="text3" style={{ fontSize: 11, textAlign: 'center' }} numberOfLines={2}>{k}</T>
            </View>
          ))}
        </View>
        {!signedIn && onlineConfigured && <Button title={t('profile.createAccount')} subtitle={t('profile.accountBenefits')} onPress={() => router.push('/auth')} full style={{ marginTop: 8 }} />}
      </View>
      <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 28 }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'stats', label: t('profile.stats') }, { value: 'achievements', label: t('profile.achievements') }, { value: 'history', label: t('profile.history') }]} />
      </View>
      {tab === 'stats' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SCREEN_PAD, paddingTop: 14 }}>
            <Chip label={t('profile.overall')} selected={game === 'all'} onPress={() => setGame('all')} />
            {GAME_IDS.map((g) => <Chip key={g} label={t(`games.names.${g}`)} selected={game === g} tint={META[g].tint} onPress={() => setGame(g)} />)}
          </ScrollView>
          <ListGroup style={{ marginTop: 12 }}>
            <ListRow title={t('profile.roundsPlayed')} value={formatCoins(sel.rounds)} />
            <ListRow title={t('profile.winRate')} value={sel.rounds ? `${((sel.wins / sel.rounds) * 100).toFixed(1)} %` : '—'} />
            <ListRow title={t('profile.wagered')} value={`${formatCoins(sel.wagered)}`} />
            <ListRow title={t('profile.returned')} value={`${formatCoins(sel.returned)}`} />
            <ListRow title={t('profile.netResult')} value={`${sel.returned - sel.wagered >= 0 ? '+' : '−'}${formatCoins(Math.abs(sel.returned - sel.wagered))}`} />
            <ListRow title={t('profile.biggestWin')} value={`${formatCoins(sel.biggestWin)}`} />
            <ListRow title={t('profile.bestMultiplier')} value={sel.bestMultiplier ? formatMult(sel.bestMultiplier) : '—'} />
            {game === 'blackjack' && <ListRow title={t('ranking.skill')} value={(() => { const d = useProgress.getState().bjDecisions; return d.total ? `${((d.correct / d.total) * 100).toFixed(1)} % (${d.total})` : '—'; })()} />}
          </ListGroup>
        </>
      )}
      {tab === 'achievements' && (
        <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 14, gap: 8 }}>
          {ACHIEVEMENTS.map((a) => {
            const got = !!unlocked[a.id];
            const [name, desc] = t(`achievements.${a.id}`, { returnObjects: true }) as unknown as [string, string];
            return (
              <Surface key={a.id} padded={false} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: got ? 1 : 0.6 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: got ? alpha(c.win, 0.16) : c.surface2 }}>
                  <Icon name={got ? 'medal' : 'lock'} size={18} color={got ? c.win : c.text3} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="callout" weight="semibold">{name}</T>
                  <T variant="footnote" color="text3">{desc}</T>
                </View>
                <T variant="footnote" color={got ? 'win' : 'text3'}>+{a.xp} XP</T>
              </Surface>
            );
          })}
        </View>
      )}
      {tab === 'history' && (
        <View style={{ marginHorizontal: SCREEN_PAD, marginTop: 14, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surface1 }}>
          {history.length === 0 ? <T variant="footnote" color="text3" style={{ padding: 16 }}>{t('home.noActivity')}</T> : history.slice(0, 60).map((h, i) => {
            const net = h.payout - h.bet;
            return (
              <View key={h.id} style={[styles.hist, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline }]}>
                <GameGlyph game={h.game} size={18} color={META[h.game].tint} />
                <View style={{ flex: 1 }}>
                  <T variant="footnote" weight="medium">{t(`games.names.${h.game}`)} · {h.detail}</T>
                  <T variant="caption" color="text3" style={{ textTransform: 'none', letterSpacing: 0 }}>{new Date(h.ts).toLocaleString()}{h.practice ? ` · ${t('common.practice')}` : ''}{h.fair ? ` · nonce ${h.fair.nonce}` : ''}</T>
                </View>
                <T variant="footnote" weight="semibold" tabular color={net > 0 ? 'win' : 'text3'}>{net > 0 ? '+' : net < 0 ? '−' : ''}{formatCoins(Math.abs(net))}</T>
              </View>
            );
          })}
        </View>
      )}
      <EditProfile visible={edit} onClose={() => setEdit(false)} />
    </Screen>
  );
}

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
  editBadge: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  fav: { width: 104, height: 84, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
});
