import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, IconButton, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { useDesktop } from '@/design/layout';
import { mmss, type LiveBetRow, type LivePhase } from './useLive';

/** Dark full-screen frame for live games: back, title, balance and the round clock. */
export function LiveFrame({ title, phase, closesAt, endsAt, now, children, footer, hideClock, wide }: { title: string; phase: LivePhase; closesAt: number; endsAt: number; now: number; children: React.ReactNode; footer?: React.ReactNode; /** The game draws its own clock. */ hideClock?: boolean; /** Computers: use the whole width (the roulette table). */ wide?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const balance = useSession((s) => s.balance);
  const desktop = useDesktop();
  const urgent = phase === 'betting' && closesAt - now < 10_000;
  const label = phase === 'betting' ? `${t('live.open')} · ${mmss(closesAt - now)}` : phase === 'waiting' ? t('live.closed') : phase === 'show' ? t('live.running') : `${t('live.next')} ${mmss(endsAt - now)}`;
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }, desktop && styles.deskWrap, desktop && wide && styles.deskWide]}>
      <LinearGradient colors={['#1A0F3A', '#07040F']} style={StyleSheet.absoluteFill} />
      <View style={styles.head}>
        <IconButton icon="chevronLeft" label={t('common.back')} onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.dot} />
            <T weight="display" style={{ color: '#fff', fontSize: 16 }}>{title}</T>
          </View>
          <T weight="displaySemi" tabular style={{ color: '#5BE3B0', fontSize: 12 }}>{formatCoins(balance ?? 0)} {t('common.coins')}</T>
        </View>
        <View style={{ width: 44 }} />
      </View>
      {hideClock ? <View style={{ height: 8 }} /> : <View style={[styles.clock, { backgroundColor: phase === 'betting' ? (urgent ? '#FF5C7A' : '#12C08A') : '#2A1A66' }]} accessibilityLiveRegion="polite">
        <T weight="display" tabular style={{ color: '#fff', fontSize: 14 }}>{label}</T>
      </View>}
      <View style={{ flex: 1 }}>{children}</View>
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{footer}</View> : null}
    </View>
  );
}

/** Everybody's bets in this round, newest first; your own are highlighted, winners in green. */
export function BetsFeed({ bets, myId, describe }: { bets: LiveBetRow[]; myId: string | null; describe: (b: LiveBetRow) => string }) {
  const { t } = useT();
  if (!bets.length) return <T variant="footnote" color="text3" align="center" style={{ marginVertical: 6 }}>{t('live.noBets')}</T>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
      {bets.map((b) => (
        <Animated.View key={b.id} entering={FadeInRight} style={[styles.bet, b.user_id === myId && { borderColor: '#FFD06B' }, b.payout ? { backgroundColor: 'rgba(91,227,176,0.18)' } : null]}>
          <Avatar id={b.avatar} size={26} />
          <View>
            <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff', fontSize: 11, maxWidth: 110 }}>{b.user_id === myId ? t('common.you') : b.username}</T>
            <T variant="caption" numberOfLines={1} style={{ color: b.payout ? '#5BE3B0' : 'rgba(255,255,255,0.7)', maxWidth: 130 }}>
              {describe(b)} · {formatCoins(b.amount)}{b.payout ? ` → ${formatCoins(b.payout)}` : b.payout === 0 ? ' ✗' : ''}
            </T>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#07040F' },
  // computers: the live table is a centred column with room around it
  deskWrap: { width: '100%', maxWidth: 640, alignSelf: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  deskWide: { maxWidth: 1180 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF3B5C' },
  clock: { alignSelf: 'center', marginTop: 6, marginBottom: 8, paddingHorizontal: 16, height: 30, borderRadius: 15, justifyContent: 'center' },
  footer: { paddingHorizontal: 12, paddingTop: 10, backgroundColor: 'rgba(16,14,24,0.95)', borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 10 },
  bet: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'transparent' },
});
