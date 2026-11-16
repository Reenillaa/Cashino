import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Button, PressableScale, Sheet, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { onlineConfigured } from '@/services/supabase';
import { searchProfiles, useFriends, type MiniProfile } from './useSocial';
import { haptic } from '@/services/haptics';

/** Friends: search by username, send requests, accept them, see your list. */
export function FriendsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const userId = useSession((s) => s.userId);
  const { accepted: friends, incoming, outgoing: sent, request, respond, remove } = useFriends();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<MiniProfile[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  if (!onlineConfigured || !userId) {
    return (
      <Sheet visible={visible} onClose={onClose} title={t('social.friends')}>
        <T color="text2">{t('social.signedOut')}</T>
        <Button title={t('common.signIn')} onPress={() => { onClose(); router.push('/auth'); }} style={{ marginTop: 14 }} />
      </Sheet>
    );
  }
  const search = async () => {
    setMsg(null);
    if (q.trim().length < 2) return;
    const list = await searchProfiles(q);
    setFound(list.filter((p) => p.id !== userId));
    if (!list.length) setMsg(t('social.noResults'));
  };
  const add = async (p: MiniProfile) => {
    try {
      await request(p.id);
      haptic.success();
      setMsg(t('social.requestSent', { name: p.username }));
      setFound((f) => f.filter((x) => x.id !== p.id));
    } catch {
      setMsg(t('social.alreadyAsked'));
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={`👥 ${t('social.friends')}`}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => void search()} placeholder={t('social.searchPlaceholder')} placeholderTextColor={c.text3} autoCapitalize="none" accessibilityLabel={t('social.searchPlaceholder')} style={[styles.input, { backgroundColor: c.surface2, color: c.text }]} />
        <Button title={t('social.search')} size="md" onPress={() => void search()} />
      </View>
      {msg ? <T variant="footnote" color="text2" style={{ marginTop: 8 }}>{msg}</T> : null}
      {found.map((p) => (
        <Row key={p.id} p={p} right={<Button title={`+ ${t('social.addFriend')}`} size="sm" onPress={() => void add(p)} />} />
      ))}
      {incoming.length ? <T weight="display" style={styles.h}>{t('social.requests')} ({incoming.length})</T> : null}
      {incoming.map((r) => (
        <Row key={r.id} p={r.other} right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button title={t('social.accept')} size="sm" onPress={() => void respond(r.id, true)} />
            <Button title="✕" size="sm" kind="secondary" onPress={() => void respond(r.id, false)} />
          </View>
        } />
      ))}
      <T weight="display" style={styles.h}>{t('social.friends')} ({friends.length})</T>
      {friends.length === 0 ? <T variant="footnote" color="text3">{t('social.noFriends')}</T> : friends.map((r) => (
        <Row key={r.friendshipId} p={r} right={<PressableScale onPress={() => void remove(r.friendshipId)} feedback="select" accessibilityLabel={t('social.remove')}><T color="text3">✕</T></PressableScale>} />
      ))}
      {sent.length ? <T variant="footnote" color="text3" style={{ marginTop: 10 }}>{t('social.pendingSent', { n: sent.length })}</T> : null}
    </Sheet>
  );
}

function Row({ p, right }: { p: MiniProfile; right: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: c.surface1 }]}>
      <Avatar id={p.avatar} size={38} />
      <View style={{ flex: 1 }}>
        <T weight="displaySemi" numberOfLines={1}>{p.display_name || p.username}</T>
        <T variant="caption" color="text3">@{p.username}{p.level ? ` · Nv ${p.level}` : ''}</T>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, height: 44, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  h: { color: '#fff', fontSize: 15, marginTop: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, marginTop: 8 },
});
