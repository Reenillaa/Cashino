import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Button, EmptyState, IconButton, PressableScale, Screen, Sheet, T, Tag } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { PokerTableView } from '@/games/poker/Table';
import { useOnlineTable, REACTIONS } from '@/features/online/useOnlineTable';
import { useFriends } from '@/features/social/useSocial';
import { useSession } from '@/state/session';
import { haptic } from '@/services/haptics';

export default function OnlineTableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useSession((s) => s.userId);
  const o = useOnlineTable(id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const friends = useFriends();
  if (!o.table) {
    return (
      <Screen back tabBar={false}>
        <EmptyState icon="hourglass" title={o.status === 'reconnecting' ? t('poker.reconnecting') : t('common.loading')} />
      </Screen>
    );
  }
  const seatReactions: Record<number, string> = {};
  o.table.seats.forEach((s, i) => {
    if (s && o.reactions[s.id]) seatReactions[i] = o.reactions[s.id];
  });
  const names: Record<number, string> = {};
  o.table.seats.forEach((s, i) => s && !s.isBot && (names[i] = s.name));
  const waiting = !o.table.hand || (o.table.hand.complete && o.row?.status === 'open');
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 10) }}>
      <View style={styles.header}>
        <IconButton icon="chevronLeft" label={t('poker.leave')} onPress={() => void o.leave().finally(() => router.back())} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T variant="callout" weight="semibold">{o.row?.name}</T>
          <T variant="footnote" color="text3">{t('poker.blinds', { sb: o.table.config.smallBlind, bb: o.table.config.bigBlind })}{o.row?.code ? ` · ${o.row.code}` : ''}</T>
        </View>
        {o.status !== 'live' ? <Tag label={t('poker.reconnecting')} tint={c.warn} /> : <IconButton icon="users" label={t('social.invite')} onPress={() => setInviteOpen(true)} />}
      </View>
      {o.heroSeat < 0 ? <EmptyState icon="users" title={t('poker.waiting')} /> : (
        <PokerTableView table={o.table} heroSeat={o.heroSeat} onAction={o.act} names={names} reactions={seatReactions} />
      )}
      {waiting && o.row?.owner === me && (
        <Button title={t('common.start')} size="md" onPress={() => void o.start().catch(() => undefined)} style={{ marginHorizontal: 16, marginTop: 8 }} />
      )}
      {o.error ? <T variant="footnote" color="loss" align="center">{o.error}</T> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 10 }} style={{ flexGrow: 0 }}>
        {REACTIONS.map((e) => (
          <PressableScale key={e} onPress={() => { haptic.select(); void o.react(e).catch(() => undefined); }} accessibilityLabel={`${t('social.reactions')} ${e}`} style={[styles.reaction, { backgroundColor: c.surface2 }]}>
            <T style={{ fontSize: e.length > 2 ? 13 : 20, fontFamily: 'Geist_600SemiBold' }}>{e}</T>
          </PressableScale>
        ))}
      </ScrollView>
      <Sheet visible={inviteOpen} onClose={() => setInviteOpen(false)} title={t('social.invite')}>
        {o.row?.code ? (
          <PressableScale onPress={() => void Clipboard.setStringAsync(o.row!.code!)} style={{ padding: 16, borderRadius: 16, backgroundColor: c.surface2, alignItems: 'center', marginBottom: 12 }}>
            <T variant="caption" color="text3">{t('social.roomCode')}</T>
            <T variant="title" style={{ letterSpacing: 6, fontFamily: 'GeistMono_500Medium' }}>{o.row.code}</T>
          </PressableScale>
        ) : null}
        {friends.accepted.length === 0 ? <T color="text3">{t('social.noFriends')}</T> : friends.accepted.map((f) => (
          <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 }}>
            <T style={{ flex: 1 }}>{f.username}</T>
            <Button title={t('social.invite')} size="sm" kind="secondary" onPress={() => void o.invite(f.id).catch(() => undefined)} />
          </View>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  reaction: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
