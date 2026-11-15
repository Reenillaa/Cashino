import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Button, EmptyState, ListGroup, ListRow, Screen, Section, Segmented, Sheet, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { callFn, onlineConfigured } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useProgress } from '@/state/progress';
import { searchProfiles, useActivity, useFriends, useInvites, useTeams, useTournaments, type MiniProfile } from '@/features/social/useSocial';

type Tab = 'friends' | 'rooms' | 'teams' | 'tournaments';

export default function Social() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const signedIn = useSession((s) => !!s.userId);
  const [tab, setTab] = useState<Tab>('friends');
  if (!signedIn) {
    return (
      <Screen title={t('social.title')}>
        <EmptyState icon="users" title={t('social.signedOut')} body={onlineConfigured ? t('social.signedOutBody') : t('auth.notConfigured')} action={onlineConfigured ? t('profile.createAccount') : undefined} onAction={() => router.push('/auth')} />
        <View style={{ paddingHorizontal: SCREEN_PAD }}>
          <Button title={t('poker.vsBots')} kind="secondary" icon="bot" onPress={() => router.push('/game/poker')} />
        </View>
        <T variant="footnote" color="text3" align="center" style={{ marginTop: 16, paddingHorizontal: 32 }}>{t('social.noChat')}</T>
      </Screen>
    );
  }
  return (
    <Screen title={t('social.title')} subtitle={t('social.noChat')}>
      <View style={{ paddingHorizontal: SCREEN_PAD }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'friends', label: t('social.friends') }, { value: 'rooms', label: t('social.rooms') }, { value: 'teams', label: t('social.teams') }, { value: 'tournaments', label: t('social.tournaments') }]} />
      </View>
      {tab === 'friends' && <FriendsTab />}
      {tab === 'rooms' && <RoomsTab />}
      {tab === 'teams' && <TeamsTab />}
      {tab === 'tournaments' && <TournamentsTab />}
      <ActivitySection />
      <View style={{ height: 1, backgroundColor: c.hairline, marginTop: 24 }} />
    </Screen>
  );
}

function FriendsTab() {
  const { t } = useT();
  const { c } = useTheme();
  const f = useFriends();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MiniProfile[]>([]);
  const [manage, setManage] = useState<(MiniProfile & { friendshipId: string }) | null>(null);
  const toast = (title: string) => useProgress.getState().pushToast({ kind: 'info', title });
  return (
    <>
      <Section title={t('social.addFriend')}>
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 10 }}>
          <TextInput
            value={q}
            onChangeText={(v) => {
              setQ(v);
              void searchProfiles(v).then(setResults);
            }}
            placeholder={t('social.searchPlaceholder')}
            placeholderTextColor={c.text3}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('social.searchPlaceholder')}
            style={{ height: 46, borderRadius: 14, backgroundColor: c.surface2, color: c.text, paddingHorizontal: 14, fontFamily: 'Geist_400Regular', fontSize: 16 }}
          />
        </View>
        {results.length > 0 && (
          <ListGroup style={{ marginTop: 10 }}>
            {results.map((p) => (
              <ListRow key={p.id} title={p.username} subtitle={`${t('common.level')} ${p.level ?? 1}`} right={<Button title={t('social.addFriend')} size="sm" kind="secondary" onPress={() => void f.request(p.id).then(() => toast(t('social.pending'))).catch((e) => toast(e.message))} />} />
            ))}
          </ListGroup>
        )}
      </Section>
      {f.incoming.length > 0 && (
        <Section title={t('social.requests')}>
          <ListGroup>
            {f.incoming.map((r) => (
              <ListRow
                key={r.id}
                title={r.other.username}
                right={
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Button title={t('social.accept')} size="sm" onPress={() => void f.respond(r.id, true)} />
                    <Button title={t('social.decline')} size="sm" kind="ghost" onPress={() => void f.respond(r.id, false)} />
                  </View>
                }
              />
            ))}
          </ListGroup>
        </Section>
      )}
      <Section title={`${t('social.friends')} · ${f.accepted.length}`}>
        {f.accepted.length === 0 ? (
          <T variant="footnote" color="text3" style={{ paddingHorizontal: SCREEN_PAD }}>{t('social.noFriends')}</T>
        ) : (
          <ListGroup>
            {f.accepted.map((p) => (
              <ListRow key={p.id} title={p.display_name || p.username} subtitle={`@${p.username} · ${t('common.level')} ${p.level ?? 1}`} right={<Avatar id={p.avatar} size={30} />} onPress={() => setManage(p)} />
            ))}
          </ListGroup>
        )}
        {f.outgoing.length > 0 && <T variant="footnote" color="text3" style={{ paddingHorizontal: SCREEN_PAD, marginTop: 8 }}>{t('social.pending')}: {f.outgoing.map((o) => o.other.username).join(', ')}</T>}
      </Section>
      <Sheet visible={!!manage} onClose={() => setManage(null)} title={manage?.username}>
        <View style={{ gap: 10 }}>
          <Button title={t('social.leave')} kind="secondary" onPress={() => { void f.remove(manage!.friendshipId); setManage(null); }} />
          <Button title={t('social.block')} kind="danger" onPress={() => { void f.block(manage!.id); setManage(null); }} />
          <Button title={t('social.report')} kind="ghost" onPress={() => { void f.report(manage!.id, 'other'); setManage(null); toast(t('common.done')); }} />
        </View>
      </Sheet>
    </>
  );
}

function RoomsTab() {
  const { t } = useT();
  const router = useRouter();
  const inv = useInvites();
  return (
    <>
      <Section title={t('social.invites')}>
        {inv.items.length === 0 ? (
          <T variant="footnote" color="text3" style={{ paddingHorizontal: SCREEN_PAD }}>{t('common.empty')}</T>
        ) : (
          <ListGroup>
            {inv.items.map((i) => (
              <ListRow
                key={i.id}
                icon="mail"
                title={t('poker.private')}
                right={
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Button title={t('social.join')} size="sm" onPress={() => void callFn<{ tableId: string }>('poker', { action: 'join', tableId: i.table_id, requestId: `${Date.now()}` }).then((r) => router.push(`/online/${r.tableId}`)).catch(() => undefined)} />
                    <Button title={t('social.decline')} size="sm" kind="ghost" onPress={() => void inv.decline(i.id)} />
                  </View>
                }
              />
            ))}
          </ListGroup>
        )}
      </Section>
      <Section title={t('social.rooms')}>
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 10 }}>
          <Button title={t('poker.createTable')} icon="plus" onPress={() => router.push('/online')} />
          <Button title={t('poker.joinByCode')} kind="secondary" icon="key" onPress={() => router.push('/online')} />
        </View>
      </Section>
    </>
  );
}

function TeamsTab() {
  const { t } = useT();
  const { c } = useTheme();
  const teams = useTeams();
  const [name, setName] = useState('');
  const toast = (title: string) => useProgress.getState().pushToast({ kind: 'info', title });
  return (
    <>
      {teams.mine ? (
        <Section title={t('social.teams')}>
          <ListGroup>
            <ListRow icon="users" title={teams.mine.name} subtitle={t('social.members', { n: teams.mine.members })} right={<Button title={t('social.leave')} size="sm" kind="ghost" onPress={() => void teams.leave()} />} />
          </ListGroup>
        </Section>
      ) : (
        <Section title={t('social.createTeam')}>
          <View style={{ paddingHorizontal: SCREEN_PAD, flexDirection: 'row', gap: 10 }}>
            <TextInput value={name} onChangeText={setName} placeholder={t('social.teamName')} placeholderTextColor={c.text3} accessibilityLabel={t('social.teamName')} style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: c.surface2, color: c.text, paddingHorizontal: 14, fontFamily: 'Geist_400Regular', fontSize: 16 }} />
            <Button title={t('social.create')} size="md" disabled={name.trim().length < 3} onPress={() => void teams.create(name.trim()).catch((e) => toast(e.message))} />
          </View>
        </Section>
      )}
      <Section title={t('social.teams')}>
        <ListGroup>
          {teams.list.map((tm) => (
            <ListRow key={tm.id} icon="flag" title={tm.name} right={!teams.mine ? <Button title={t('social.join')} size="sm" kind="secondary" onPress={() => void teams.join(tm.id).catch((e) => toast(e.message))} /> : undefined} />
          ))}
        </ListGroup>
      </Section>
    </>
  );
}

function TournamentsTab() {
  const { t } = useT();
  const router = useRouter();
  const tours = useTournaments();
  return (
    <Section title={t('social.tournaments')}>
      <T variant="footnote" color="text3" style={{ paddingHorizontal: SCREEN_PAD, marginBottom: 10 }}>{t('social.prizesNote')}</T>
      {tours.list.length === 0 ? (
        <EmptyState icon="medal" title={t('common.empty')} action={t('poker.createTable')} onAction={() => router.push('/online')} />
      ) : (
        <ListGroup>
          {tours.list.map((tr) => (
            <ListRow
              key={tr.id}
              icon="medal"
              title={tr.name}
              subtitle={`${tr.max_players} · ${tr.entry_fee ? `${tr.entry_fee} Ti` : t('social.freeEntry')} · ${tr.status}`}
              onPress={() => tr.table_id && void callFn<{ tableId: string }>('poker', { action: 'join', tableId: tr.table_id, requestId: `${Date.now()}` }).then((r) => router.push(`/online/${r.tableId}`)).catch(() => router.push(`/online/${tr.table_id}`))}
            />
          ))}
        </ListGroup>
      )}
    </Section>
  );
}

function ActivitySection() {
  const { t } = useT();
  const items = useActivity();
  if (!items.length) return null;
  return (
    <Section title={t('social.activity')}>
      <ListGroup>
        {items.slice(0, 10).map((a) => (
          <ListRow key={a.id} icon={a.kind === 'tournament' ? 'medal' : a.kind === 'friend' ? 'users' : 'sparkles'} title={a.kind} subtitle={new Date(a.created_at).toLocaleString()} />
        ))}
      </ListGroup>
    </Section>
  );
}
