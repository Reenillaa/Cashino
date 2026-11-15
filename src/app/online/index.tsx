import React, { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, EmptyState, ListGroup, ListRow, Screen, Section, Segmented, Surface, T, Tag } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { supabase, callFn, onlineConfigured } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useProgress } from '@/state/progress';

interface Row { id: string; name: string; kind: string; status: string; config: { smallBlind: number; bigBlind: number; buyIn: number; maxSeats: number }; public_state: { seats: (unknown | null)[] } }

export default function OnlineLobby() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const signedIn = useSession((s) => !!s.userId);
  const [tables, setTables] = useState<Row[]>([]);
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'cash' | 'sng'>('cash');
  const [stakes, setStakes] = useState(0);
  const [priv, setPriv] = useState(false);
  const [bots, setBots] = useState(2);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!supabase || !signedIn) return;
    const { data } = await supabase.from('poker_tables').select('id,name,kind,status,config,public_state').eq('is_private', false).neq('status', 'finished').order('created_at', { ascending: false }).limit(30);
    setTables((data as Row[]) ?? []);
  }, [signedIn]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const id = setInterval(() => void load(), 8000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);
  const fail = (e: unknown) => useProgress.getState().pushToast({ kind: 'info', title: `${t('common.error')} (${(e as Error).message})` });
  const join = async (args: Record<string, unknown>) => {
    try {
      setBusy(true);
      const r = await callFn<{ tableId: string }>('poker', { action: 'join', requestId: `${Date.now()}`, ...args });
      router.push(`/online/${r.tableId}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    try {
      setBusy(true);
      const r = await callFn<{ tableId: string; code: string | null }>('poker', { action: 'create', kind, stakes, private: priv, bots, name: priv ? t('poker.private') : t(kind === 'sng' ? 'poker.tournament' : 'poker.cash') });
      await join({ tableId: r.tableId });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  if (!signedIn) {
    return (
      <Screen title={t('poker.online')} back tabBar={false}>
        <EmptyState icon="users" title={t('social.signedOut')} body={onlineConfigured ? t('social.signedOutBody') : t('auth.notConfigured')} action={onlineConfigured ? t('common.signIn') : undefined} onAction={() => router.push('/auth')} />
      </Screen>
    );
  }
  return (
    <Screen title={t('poker.online')} subtitle={t('social.noChat')} back tabBar={false}>
      <Section title={t('poker.joinByCode')}>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PAD }}>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            placeholderTextColor={c.text3}
            autoCapitalize="characters"
            accessibilityLabel={t('poker.code')}
            style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: c.surface2, color: c.text, paddingHorizontal: 14, fontFamily: 'GeistMono_500Medium', fontSize: 16, letterSpacing: 2 }}
          />
          <Button title={t('social.join')} size="md" disabled={code.length !== 6 || busy} onPress={() => join({ code })} />
        </View>
      </Section>
      <Section title={t('poker.createTable')}>
        <Surface style={{ marginHorizontal: SCREEN_PAD, gap: 12 }}>
          <Segmented value={kind} onChange={setKind} options={[{ value: 'cash', label: t('poker.cash') }, { value: 'sng', label: t('poker.tournament') }]} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {['5/10', '25/50', '100/200'].map((s, i) => <Chip key={s} label={s} selected={stakes === i} onPress={() => setStakes(i)} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <T variant="footnote" color="text3">{t('common.bot')}</T>
            {[0, 1, 2, 3, 4].map((n) => <Chip key={n} label={`${n}`} selected={bots === n} onPress={() => setBots(n)} />)}
          </View>
          <Chip label={t('poker.private')} icon="lock" selected={priv} onPress={() => setPriv((p) => !p)} />
          <Button title={t('poker.createTable')} onPress={create} loading={busy} />
        </Surface>
      </Section>
      <Section title={t('poker.online')}>
        {tables.length === 0 ? (
          <EmptyState icon="users" title={t('common.empty')} />
        ) : (
          <ListGroup>
            {tables.map((tb) => {
              const seated = tb.public_state.seats.filter(Boolean).length;
              return (
                <ListRow
                  key={tb.id}
                  icon={tb.kind === 'sng' ? 'medal' : 'users'}
                  title={`${tb.name} · ${tb.config.smallBlind}/${tb.config.bigBlind}`}
                  subtitle={`${seated}/${tb.config.maxSeats} · ${t('poker.buyIn')} ${tb.config.buyIn} Ti`}
                  right={tb.status === 'running' ? <Tag label="LIVE" tint={c.win} /> : undefined}
                  onPress={() => join({ tableId: tb.id })}
                />
              );
            })}
          </ListGroup>
        )}
      </Section>
    </Screen>
  );
}
