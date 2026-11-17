import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Button, PressableScale, Sheet, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { onlineConfigured, supabase } from '@/services/supabase';
import { useProgress } from '@/state/progress';
import { sfx } from '@/services/audio';
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
  const [sendTo, setSendTo] = useState<string | null>(null);
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
        <View key={r.friendshipId}>
          <Row p={r} right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Button title={`🎁 ${t('social.sendChips')}`} size="sm" kind={sendTo === r.id ? 'primary' : 'secondary'} onPress={() => setSendTo(sendTo === r.id ? null : r.id)} />
              <PressableScale onPress={() => void remove(r.friendshipId)} feedback="select" accessibilityLabel={t('social.remove')}><T color="text3">✕</T></PressableScale>
            </View>
          } />
          {sendTo === r.id ? <SendChips to={r} onDone={() => setSendTo(null)} /> : null}
        </View>
      ))}
      <T variant="caption" color="text3" style={{ marginTop: 10 }}>{t('social.sendRules')}</T>
      {sent.length ? <T variant="footnote" color="text3" style={{ marginTop: 10 }}>{t('social.pendingSent', { n: sent.length })}</T> : null}
    </Sheet>
  );
}

const QUICK = [100, 500, 1000, 5000];

/** Sends chips to a friend (server rules: accepted friends only, daily limits, never twice for one tap). */
function SendChips({ to, onDone }: { to: MiniProfile; onDone: () => void }) {
  const { t } = useT();
  const { c } = useTheme();
  const balance = useSession((s) => s.balance) ?? 0;
  const [amount, setAmount] = useState(500);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // one key per send attempt: a retried request is applied only once
  const [key] = useState(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  const value = text ? Math.floor(Number(text.replace(/\D/g, '')) || 0) : amount;
  const send = async () => {
    if (busy || !supabase) return;
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase.rpc('send_chips', { p_to: to.id, p_amount: value, p_note: note.slice(0, 80), p_key: key });
    setBusy(false);
    if (error) {
      haptic.warning();
      const code = ['daily_send_limit', 'daily_receive_limit', 'insufficient', 'not_friends', 'invalid_amount'].find((k) => error.message.includes(k)) ?? 'error';
      setErr(t(`social.sendErr.${code}`));
      return;
    }
    haptic.success();
    sfx('cashout');
    useSession.getState().setBalance(Number(data));
    useProgress.getState().pushToast({ kind: 'info', title: t('social.sent', { amount: formatCoins(value), name: to.display_name || to.username }) });
    onDone();
  };
  return (
    <View style={[styles.send, { backgroundColor: c.surface2 }]}>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {QUICK.map((v) => (
          <PressableScale key={v} onPress={() => { setAmount(v); setText(''); }} feedback="select" style={[styles.quick, { backgroundColor: !text && amount === v ? '#FFD06B' : c.surface3 }]}>
            <T weight="displaySemi" style={{ color: !text && amount === v ? '#231A3A' : c.text, fontSize: 13 }}>{formatCoins(v)}</T>
          </PressableScale>
        ))}
        <TextInput value={text} onChangeText={setText} keyboardType="number-pad" placeholder={t('social.other')} placeholderTextColor={c.text3} accessibilityLabel={t('social.other')} style={[styles.amountInput, { backgroundColor: c.surface3, color: c.text }]} />
      </View>
      <TextInput value={note} onChangeText={setNote} maxLength={80} placeholder={t('social.notePlaceholder')} placeholderTextColor={c.text3} accessibilityLabel={t('social.notePlaceholder')} style={[styles.input, { backgroundColor: c.surface3, color: c.text, marginTop: 8, flex: 0 }]} />
      {err ? <T variant="footnote" style={{ color: '#FF5C7A', marginTop: 6 }}>{err}</T> : null}
      <Button title={t('social.sendCta', { amount: formatCoins(value), name: to.display_name || to.username })} onPress={() => void send()} loading={busy} disabled={value < 10 || value > 10000 || value > balance} style={{ marginTop: 8 }} />
    </View>
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
  send: { padding: 12, borderRadius: 16, marginTop: 6 },
  quick: { paddingHorizontal: 12, height: 36, borderRadius: 18, justifyContent: 'center' },
  amountInput: { width: 90, height: 36, borderRadius: 18, paddingHorizontal: 12, fontSize: 14 },
});
