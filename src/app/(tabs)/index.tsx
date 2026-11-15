import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedNumber, Avatar, Button, Icon, PressableScale, ProgressBar, Screen, Section, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD, onPastel, radius } from '@/design/tokens';
import { useT } from '@/i18n';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { useSession } from '@/state/session';
import { levelFromXp, dailyMissions } from '@/engine/meta/progression.ts';
import { ECONOMY, dailyRewardAmount, nextStreak, utcDay } from '@/engine/meta/economy.ts';
import { CATALOG } from '@/games/catalog';
import { GameTile } from '@/games/shared/GameTile';
import { MissionRow } from '@/features/progression/MissionRow';
import { claimDailyReward, claimRefill } from '@/features/economy/rewards';
import { useNow } from '@/features/time/useNow';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const TOP = ['poker', 'blackjack', 'roulette', 'crash'] as const;

/**
 * Home is also the lobby (Offsuit-style): the balance is the hero, then big pastel game cards.
 * One tap on a game → choose a room → play. Nothing else is required.
 */
export default function Home() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const signedIn = useSession((s) => !!s.userId);
  const profile = useSession((s) => s.profile);
  const serverBalance = useSession((s) => s.balance);
  const wallet = useWallet();
  const xp = useProgress((s) => s.xp);
  const missionProgress = useProgress((s) => s.missionProgress);
  const missionClaimed = useProgress((s) => s.missionClaimed);
  const lvl = levelFromXp(xp);
  const now = useNow();
  const balance = signedIn ? serverBalance ?? 0 : wallet.balance;
  const today = utcDay(now);
  const canClaim = wallet.canClaimDaily();
  const streak = canClaim ? nextStreak(wallet.daily, today) : wallet.daily.streak;
  const missions = dailyMissions(today);
  const low = signedIn ? (serverBalance ?? 0) < ECONOMY.refillThreshold : wallet.canRefill();
  const tileW = (Math.min(width, 640) - SCREEN_PAD * 2 - 12) / 2;
  const open = (id: string) => router.push(`/game/${id}`);

  const claim = async () => {
    try {
      const amount = await claimDailyReward();
      sfx('cashout');
      haptic.success();
      useProgress.getState().pushToast({ kind: 'info', title: t('home.gift'), body: `+${formatCoins(amount)} ${t('common.coins')}` });
    } catch {
      useProgress.getState().pushToast({ kind: 'info', title: t('common.error') });
    }
  };

  return (
    <Screen>
      {/* Header: wordmark + settings + avatar */}
      <View style={[styles.header, { paddingHorizontal: SCREEN_PAD }]}>
        <T variant="headline" weight="semibold" style={{ flex: 1, fontSize: 22, letterSpacing: -0.6 }} accessibilityRole="header">cashino</T>
        <PressableScale onPress={() => router.push('/settings')} accessibilityLabel={t('settings.title')} style={[styles.round, { backgroundColor: c.surface2 }]}>
          <Icon name="settings" size={20} color={c.text} />
        </PressableScale>
        <PressableScale onPress={() => router.push('/(tabs)/profile')} accessibilityLabel={t('tabs.profile')}>
          <Avatar id={profile?.avatar ?? 'a3'} size={42} />
        </PressableScale>
      </View>

      {/* Balance hero */}
      <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 28 }}>
        <AnimatedNumber value={balance} variant="hero" accessibilityLabel={`${formatCoins(balance)} ${t('home.chips')}`} />
        <PressableScale onPress={() => router.push('/(tabs)/profile')} scaleTo={0.98} feedback="select" style={styles.levelRow} accessibilityLabel={`${t('common.level')} ${lvl.level}`}>
          <T variant="body" color="text2">{t('home.chips')}</T>
          <T variant="body" color="text3">·</T>
          <T variant="body" color="text2">{t('common.level')} {lvl.level}</T>
          <ProgressBar value={lvl.needed ? lvl.into / lvl.needed : 1} height={4} style={{ width: 64, marginLeft: 4 }} />
        </PressableScale>
      </View>

      {/* Refill when the balance is almost gone */}
      {low && (
        <View style={[styles.notice, { backgroundColor: c.surface1, marginHorizontal: SCREEN_PAD }]}>
          <Text style={styles.noticeEmoji} accessible={false}>🪫</Text>
          <T variant="footnote" color="text2" style={{ flex: 1 }}>
            {t('home.refillBody', { amount: formatCoins(ECONOMY.refillAmount), left: ECONOMY.refillsPerDay - (wallet.refill.day === today ? wallet.refill.used : 0) })}
          </T>
          <Button title={t('home.refill')} size="sm" onPress={() => void claimRefill().then(() => sfx('cashout')).catch(() => undefined)} />
        </View>
      )}

      {/* Daily gift: only shown when there is something to collect */}
      {canClaim && (
        <PressableScale onPress={claim} scaleTo={0.98} style={{ marginHorizontal: SCREEN_PAD, marginTop: 24 }} accessibilityLabel={`${t('home.gift')}: +${dailyRewardAmount(streak)} ${t('common.coins')}`}>
          <View style={styles.gift}>
            <LinearGradient colors={['#FFE6A7', '#FFC6D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={{ fontSize: 40 }} accessible={false}>🎁</Text>
            <View style={{ flex: 1 }}>
              <T variant="callout" weight="semibold" style={{ color: onPastel.text }}>{t('home.gift')}</T>
              <T variant="headline" weight="semibold" tabular style={{ color: onPastel.text }}>+{formatCoins(dailyRewardAmount(streak))} {t('common.coins')}</T>
              <T variant="footnote" style={{ color: onPastel.text2 }}>{t('home.giftDay', { day: streak })}</T>
            </View>
            <View style={[styles.giftBtn, { backgroundColor: onPastel.text }]}>
              <T variant="footnote" weight="semibold" style={{ color: '#fff' }}>{t('home.claim')}</T>
            </View>
          </View>
        </PressableScale>
      )}

      {/* Most played: wide cards */}
      <Section title={t('home.top')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, gap: 12 }} snapToInterval={282} decelerationRate="fast">
          {TOP.map((id, i) => (
            <GameTile key={id} id={id} big index={i} badge={id === 'poker' ? t('games.online') : undefined} onPress={() => open(id)} />
          ))}
        </ScrollView>
      </Section>

      {/* Every game, two per row */}
      <Section title={t('home.allGames')}>
        <View style={[styles.grid, { paddingHorizontal: SCREEN_PAD }]}>
          {CATALOG.map((g, i) => (
            <GameTile key={g.id} id={g.id} index={i + 2} style={{ width: tileW }} onPress={() => open(g.id)} />
          ))}
        </View>
      </Section>

      {/* Academy */}
      <PressableScale onPress={() => router.push('/academy')} scaleTo={0.98} style={{ marginHorizontal: SCREEN_PAD, marginTop: 28 }} accessibilityLabel={t('home.learn')}>
        <View style={[styles.row, { backgroundColor: c.surface1 }]}>
          <Text style={{ fontSize: 30 }} accessible={false}>📚</Text>
          <View style={{ flex: 1 }}>
            <T variant="callout" weight="semibold">{t('home.learn')}</T>
            <T variant="footnote" color="text3">{t('home.learnBody')}</T>
          </View>
          <Icon name="chevronRight" size={18} color={c.text3} />
        </View>
      </PressableScale>

      {/* Today's challenges */}
      <Section title={t('home.challenges')}>
        <View style={{ marginHorizontal: SCREEN_PAD, borderRadius: radius.lg, backgroundColor: c.surface1, paddingHorizontal: 16 }}>
          {missions.map((m, i) => (
            <View key={m.id} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline } : null}>
              <MissionRow mission={m} progress={missionProgress[m.id] ?? 0} claimed={!!missionClaimed[m.id]} />
            </View>
          ))}
        </View>
      </Section>
      <T variant="footnote" color="text3" align="center" style={{ marginTop: 28, paddingHorizontal: 40 }}>{t('common.noMoneyDisclaimer')}</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, alignSelf: 'flex-start' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, marginTop: 20 },
  noticeEmoji: { fontSize: 26 },
  gift: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: radius.xl, overflow: 'hidden' },
  giftBtn: { height: 40, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg },
});
