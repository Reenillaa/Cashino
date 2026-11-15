import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedNumber, Avatar, Button, GameGlyph, Icon, PressableScale, ProgressBar, Screen, Section, Surface, T, Tag, formatCoins } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { SCREEN_PAD, radius } from '@/design/tokens';
import { useT } from '@/i18n';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { useSession } from '@/state/session';
import { levelFromXp, dailyMissions, seasonAt, seasonTier, SEASON_TIERS } from '@/engine/meta/progression.ts';
import { ECONOMY, dailyRewardAmount, nextStreak, utcDay, DAY_MS } from '@/engine/meta/economy.ts';
import { META } from '@/games/catalog';
import type { GameId } from '@/engine/games/types.ts';
import { MissionRow } from '@/features/progression/MissionRow';
import { claimDailyReward, claimRefill } from '@/features/economy/rewards';
import { useNow } from '@/features/time/useNow';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const FEATURED = ['poker', 'crash', 'blackjack', 'plinko'] as const;

export default function Home() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const signedIn = useSession((s) => !!s.userId);
  const profile = useSession((s) => s.profile);
  const serverBalance = useSession((s) => s.balance);
  const wallet = useWallet();
  const xp = useProgress((s) => s.xp);
  const history = useProgress((s) => s.history);
  const favorites = useProgress((s) => s.favorites);
  const seasonPoints = useProgress((s) => s.seasonPoints);
  const missionProgress = useProgress((s) => s.missionProgress);
  const missionClaimed = useProgress((s) => s.missionClaimed);
  const lvl = levelFromXp(xp);
  const now = useNow();
  const hour = new Date(now).getHours();
  const greeting = hour < 13 ? t('home.morning') : hour < 20 ? t('home.afternoon') : t('home.evening');
  const name = profile?.display_name || profile?.username || t('home.guest');
  const balance = signedIn ? serverBalance ?? 0 : wallet.balance;
  const today = utcDay(now);
  const canClaim = wallet.canClaimDaily();
  const streak = canClaim ? nextStreak(wallet.daily, today) : wallet.daily.streak;
  const msToTomorrow = (today + 1) * DAY_MS - now;
  const season = seasonAt(now);
  const missions = dailyMissions(today);

  const claim = async () => {
    try {
      const amount = await claimDailyReward();
      sfx('cashout');
      haptic.success();
      useProgress.getState().pushToast({ kind: 'info', title: t('home.daily'), body: `+${formatCoins(amount)} Ti` });
    } catch {
      useProgress.getState().pushToast({ kind: 'info', title: t('common.error') });
    }
  };

  return (
    <Screen>
      {/* Header: greeting + avatar */}
      <View style={[styles.header, { paddingHorizontal: SCREEN_PAD }]}>
        <View style={{ flex: 1 }}>
          <T variant="footnote" color="text3">{greeting},</T>
          <T variant="headline" numberOfLines={1}>{name}</T>
        </View>
        <PressableScale onPress={() => router.push('/settings')} accessibilityLabel={t('settings.title')} style={[styles.round, { backgroundColor: c.surface2 }]}>
          <Icon name="settings" size={20} color={c.text} />
        </PressableScale>
        <PressableScale onPress={() => router.push('/(tabs)/profile')} accessibilityLabel={t('tabs.profile')}>
          <Avatar id={profile?.avatar ?? 'a3'} size={40} />
        </PressableScale>
      </View>

      {/* Balance hero */}
      <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 24 }}>
        <T variant="caption" color="text3">{t('home.balance')}</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <AnimatedNumber value={balance} variant="hero" style={{ marginTop: 4 }} />
          <T variant="headline" color="text3" style={{ marginBottom: 10 }}>Ti</T>
        </View>
        <PressableScale onPress={() => router.push('/(tabs)/profile')} scaleTo={0.99} feedback="select" style={{ marginTop: 14 }}>
          <View style={styles.levelRow}>
            <T variant="footnote" weight="semibold">{t('common.level')} {lvl.level}</T>
            <T variant="footnote" color="text3" tabular>{lvl.into} / {lvl.needed} XP</T>
          </View>
          <ProgressBar value={lvl.needed ? lvl.into / lvl.needed : 1} style={{ marginTop: 8 }} />
        </PressableScale>
        {(signedIn ? (serverBalance ?? 0) < ECONOMY.refillThreshold : wallet.canRefill()) && (
          <Surface level={2} style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="refresh" size={20} color={c.text} />
            <T variant="footnote" color="text2" style={{ flex: 1 }}>
              {t('home.refillBody', { amount: formatCoins(ECONOMY.refillAmount), left: ECONOMY.refillsPerDay - (wallet.refill.day === today ? wallet.refill.used : 0) })}
            </T>
            <Button title={t('home.refill')} size="sm" onPress={() => void claimRefill().then(() => sfx('cashout')).catch(() => undefined)} />
          </Surface>
        )}
      </View>

      {/* Featured carousel */}
      <Section title={t('home.featured')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, gap: 12 }} snapToInterval={232} decelerationRate="fast">
          {FEATURED.map((id) => (
            <PressableScale key={id} onPress={() => router.push(`/game/${id}`)} accessibilityLabel={t(`games.names.${id}`)}>
              <View style={[styles.feature, { backgroundColor: c.surface1, borderColor: c.hairline }]}>
                <LinearGradient colors={[alpha(META[id].tint, 0.28), alpha(META[id].tint, 0.02)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <GameGlyph game={id} size={36} color={META[id].tint} />
                <View style={{ flex: 1 }} />
                <T variant="headline">{t(`games.names.${id}`)}</T>
                <T variant="footnote" color="text2" numberOfLines={2} style={{ marginTop: 4 }}>{t(`games.blurbs.${id}`)}</T>
                {id === 'poker' && <View style={{ position: 'absolute', top: 16, right: 16 }}><Tag label={t('games.online')} tint={c.win} /></View>}
              </View>
            </PressableScale>
          ))}
        </ScrollView>
      </Section>

      {/* Quick access: favourites */}
      <Section title={t('home.quick')}>
        <View style={[styles.quickGrid, { paddingHorizontal: SCREEN_PAD }]}>
          {[...favorites, ...(['dice', 'mines', 'limbo', 'roulette', 'plinko'] as GameId[]).filter((g) => !favorites.includes(g))].slice(0, 4).map((id) => (
            <PressableScale key={id} onPress={() => router.push(`/game/${id}`)} style={[styles.quick, { backgroundColor: c.surface1, borderColor: c.hairline }]} accessibilityLabel={t(`games.names.${id}`)}>
              <GameGlyph game={id} size={26} color={META[id].tint} />
              <T variant="footnote" weight="medium" style={{ marginTop: 8 }} numberOfLines={1}>{t(`games.names.${id}`)}</T>
            </PressableScale>
          ))}
        </View>
        <PressableScale onPress={() => router.push('/academy')} style={{ marginHorizontal: SCREEN_PAD, marginTop: 12 }} scaleTo={0.99}>
          <Surface brushed style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="book" size={22} color={c.text} />
            <View style={{ flex: 1 }}>
              <T variant="callout" weight="semibold">{t('academy.title')}</T>
              <T variant="footnote" color="text3">{t('academy.subtitle')}</T>
            </View>
            <Icon name="chevronRight" size={16} color={c.text3} />
          </Surface>
        </PressableScale>
      </Section>

      {/* Daily gift */}
      <Section title={t('home.daily')}>
        <Surface style={{ marginHorizontal: SCREEN_PAD, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[styles.gift, { backgroundColor: c.surface3 }]}>
            <Icon name="gift" size={24} color={c.text} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="callout" weight="semibold" tabular>+{formatCoins(dailyRewardAmount(streak))} Ti</T>
            <T variant="footnote" color="text3">
              {canClaim ? t('home.streakDay', { day: streak }) : t('home.nextIn', { time: `${Math.floor(msToTomorrow / 3_600_000)}h ${Math.floor((msToTomorrow % 3_600_000) / 60_000)}m` })}
            </T>
          </View>
          <Button title={canClaim ? t('home.claim') : t('home.claimed')} size="sm" disabled={!canClaim} onPress={claim} />
        </Surface>
        <View style={{ flexDirection: 'row', gap: 6, marginHorizontal: SCREEN_PAD, marginTop: 10 }}>
          {ECONOMY.dailyRewards.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < (canClaim ? streak - 1 : streak) ? c.text : c.surface3 }} />
          ))}
        </View>
      </Section>

      {/* Challenges */}
      <Section title={t('home.challenges')} action={<T variant="footnote" color="text3">{t('home.season', { n: season.number })} · {t('home.seasonTier', { tier: `${seasonTier(seasonPoints)}/${SEASON_TIERS}` })}</T>}>
        <View style={{ marginHorizontal: SCREEN_PAD, gap: 8 }}>
          {missions.map((m) => (
            <MissionRow key={m.id} mission={m} progress={missionProgress[m.id] ?? 0} claimed={!!missionClaimed[m.id]} />
          ))}
        </View>
      </Section>

      {/* Recent activity */}
      <Section title={t('home.activity')}>
        {history.length === 0 ? (
          <T variant="footnote" color="text3" style={{ paddingHorizontal: SCREEN_PAD }}>{t('home.noActivity')}</T>
        ) : (
          <View style={{ marginHorizontal: SCREEN_PAD, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surface1, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline }}>
            {history.slice(0, 5).map((h, i) => {
              const net = h.payout - h.bet;
              return (
                <View key={h.id} style={[styles.activity, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline }]}>
                  <GameGlyph game={h.game} size={20} color={META[h.game].tint} />
                  <View style={{ flex: 1 }}>
                    <T variant="footnote" weight="medium">{t(`games.names.${h.game}`)}</T>
                    <T variant="footnote" color="text3" numberOfLines={1}>{h.detail}{h.practice ? ` · ${t('common.practice')}` : ''}</T>
                  </View>
                  <T variant="footnote" weight="semibold" tabular color={net > 0 ? 'win' : net < 0 ? 'text3' : 'text2'}>
                    {net > 0 ? '+' : net < 0 ? '−' : ''}{formatCoins(Math.abs(net))}
                  </T>
                </View>
              );
            })}
          </View>
        )}
      </Section>
      <T variant="footnote" color="text3" align="center" style={{ marginTop: 28, paddingHorizontal: 40 }}>{t('common.noMoneyDisclaimer')}</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feature: { width: 220, height: 200, borderRadius: radius.xl, padding: 18, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quick: { flex: 1, aspectRatio: 1, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  gift: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});

