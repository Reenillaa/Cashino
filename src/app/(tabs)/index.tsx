import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useContentWidth, useDesktop } from '@/design/layout';
import { useIsFocused, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedNumber, Aurora, Avatar, useMyAvatar, useMyFrame, Button, ChipLogo, GameGlyph, GameLogo, Icon, Marquee, PressableScale, ProgressBar, Screen, Section, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD, brand, onPastel, radius } from '@/design/tokens';
import { useT } from '@/i18n';
import { useWallet } from '@/state/wallet';
import { levelBonus, useProgress } from '@/state/progress';
import { useSession } from '@/state/session';
import { levelFromXp, dailyMissions, weeklyMissions, weeklyDaysLeft } from '@/engine/meta/progression.ts';
import { ECONOMY, dailyRewardAmount, nextStreak, utcDay } from '@/engine/meta/economy.ts';
import { SLOT_HALL, VISIBLE_GAMES } from '@/games/catalog';
import { GameTile } from '@/games/shared/GameTile';
import { MissionRow } from '@/features/progression/MissionRow';
import { LiveRow } from '@/features/home/WhatsNew';
import { useOwnedUnlocks, useNextUnlockPrice, useUnlocks } from '@/state/unlocks';
import { isUnlocked, type UnlockId } from '@/engine/meta/unlocks.ts';
import { claimDailyReward, claimRefill } from '@/features/economy/rewards';
import { useNow } from '@/features/time/useNow';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';


/**
 * Home is also the lobby (Offsuit-style): the balance is the hero, then big pastel game cards.
 * One tap on a game → choose a room → play. Nothing else is required.
 */
export default function Home() {
  const { t } = useT();
  const myFrame = useMyFrame();
  const myAvatar = useMyAvatar(useSession((st) => st.profile?.avatar));
  const { c } = useTheme();
  const router = useRouter();
  const width = useContentWidth();
  const desktop = useDesktop();
  const focused = useIsFocused();
  const signedIn = useSession((s) => !!s.userId);
  const serverBalance = useSession((s) => s.balance);
  const wallet = useWallet();
  const xp = useProgress((s) => s.xp);
  const missionProgress = useProgress((s) => s.missionProgress);
  const missionClaimed = useProgress((s) => s.missionClaimed);
  const stats = useProgress((s) => s.stats);
  const practiceStats = useProgress((s) => s.practiceStats);
  const lvl = levelFromXp(xp);
  const now = useNow();
  const balance = signedIn ? serverBalance ?? 0 : wallet.balance;
  const today = utcDay(now);
  const canClaim = wallet.canClaimDaily();
  const streak = canClaim ? nextStreak(wallet.daily, today) : wallet.daily.streak;
  const missions = dailyMissions(today);
  const weekly = weeklyMissions(today);
  const low = signedIn ? (serverBalance ?? 0) < ECONOMY.refillThreshold : wallet.canRefill();
  // phones: two per row; computers: as many ~230 px cards as fit
  const cols = desktop ? Math.max(3, Math.floor((width - SCREEN_PAD * 2 + 12) / 242)) : 2;
  const tileW = ((desktop ? width : Math.min(width, 640)) - SCREEN_PAD * 2 - 12 * (cols - 1)) / cols;
  // 7 stamps per row: screen − page padding − card padding − 6 gaps.
  const perRow = desktop ? 12 : 7;
  const stampW = Math.floor(((desktop ? width : Math.min(width, 640)) - SCREEN_PAD * 2 - 32 - (perRow - 1) * 8) / perRow);
  const open = (id: string) => router.push(`/game/${id}`);
  const owned = useOwnedUnlocks();
  const unlockPrice = useNextUnlockPrice();
  const openUnlock = useUnlocks((st) => st.open);
  // what you can play first, then what is still to unlock
  const lobby = [...VISIBLE_GAMES].sort((a, b) => Number(!isUnlocked(owned, `game:${a.id}` as UnlockId)) - Number(!isUnlocked(owned, `game:${b.id}` as UnlockId)));
  const tried = VISIBLE_GAMES.filter((g) => (stats[g.id]?.rounds ?? 0) + (practiceStats[g.id]?.rounds ?? 0) > 0).map((g) => g.id);
  const runStreak = wallet.daily.streak > 0 && wallet.daily.lastClaimDay !== null && today - wallet.daily.lastClaimDay <= 1 ? wallet.daily.streak : 0;

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
      <Aurora colors={[brand.violet, brand.pink, brand.money]} height={460} alpha={0.38} active={focused} />
      {/* Header: wordmark + settings + avatar (computers have all this in the sidebar) */}
      {desktop ? null : <View style={[styles.header, { paddingHorizontal: SCREEN_PAD }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ChipLogo size={30} id="home" />
          <T weight="display" style={{ fontSize: 21, lineHeight: 26, letterSpacing: -0.8, color: '#fff' }} accessibilityRole="header">cashino</T>
        </View>
        <PressableScale onPress={() => router.push('/academy')} accessibilityLabel={t('home.learn')} style={[styles.round, { backgroundColor: c.surface2 }]}>
          <Icon name="book" size={20} color={c.text} />
        </PressableScale>
        <PressableScale onPress={() => router.push('/settings')} accessibilityLabel={t('settings.title')} style={[styles.round, { backgroundColor: c.surface2 }]}>
          <Icon name="settings" size={20} color={c.text} />
        </PressableScale>
        <PressableScale onPress={() => router.push('/(tabs)/profile')} accessibilityLabel={t('tabs.profile')}>
          <Avatar id={myAvatar} size={42} frame={myFrame} />
        </PressableScale>
      </View>}

      {/* computers: the sign and today's gift side by side */}
      <View style={desktop ? { flexDirection: 'row', gap: 20, paddingHorizontal: SCREEN_PAD, marginTop: 34, alignItems: 'flex-start' } : null}>

      {/* Balance hero */}
      <View style={desktop ? { flex: 1.35 } : { paddingHorizontal: SCREEN_PAD, marginTop: 22 }}>
        <Marquee>
          <T weight="displaySemi" align="center" style={{ color: '#FFD873', fontSize: 11, letterSpacing: 3 }}>{t('home.welcome')}</T>
          <T weight="display" align="center" style={{ color: '#FFE58A', fontSize: 30, lineHeight: 36, letterSpacing: 1, textShadowColor: 'rgba(255,185,56,0.8)', textShadowRadius: 16 }}>CASHINO</T>
          <View style={styles.signRule} />
          <AnimatedNumber value={balance} variant="hero" weight="display" color="win" align="center" style={{ fontSize: 48, lineHeight: 56, letterSpacing: -1.6, textShadowColor: 'rgba(59,227,154,0.55)', textShadowRadius: 22 }} accessibilityLabel={`${formatCoins(balance)} ${t('home.chips')}`} />
          <PressableScale onPress={() => router.push('/(tabs)/profile')} scaleTo={0.98} feedback="select" style={[styles.levelRow, { alignSelf: 'center' }]} accessibilityLabel={`${t('common.level')} ${lvl.level}`}>
            <T variant="body" style={{ color: 'rgba(255,255,255,0.8)' }}>{t('home.chips')}</T>
            <T variant="body" style={{ color: 'rgba(255,255,255,0.5)' }}>·</T>
            <T variant="body" style={{ color: 'rgba(255,255,255,0.8)' }}>{t('common.level')} {lvl.level}</T>
            <ProgressBar value={lvl.needed ? lvl.into / lvl.needed : 1} height={4} tint={c.win} style={{ width: 56, marginLeft: 4 }} />
          </PressableScale>
        </Marquee>
        <View style={styles.hookRow}>
          {runStreak > 0 && (
            <View style={[styles.pill, { backgroundColor: c.surface1 }]}>
              <T variant="footnote" weight="semibold">{t('home.streak', { n: runStreak })}</T>
            </View>
          )}
          <T variant="footnote" color="text3" style={{ flexShrink: 1 }}>
            {t('home.nextLevel', { xp: Math.max(0, lvl.needed - lvl.into), level: lvl.level + 1, bonus: levelBonus(lvl.level + 1) })}
          </T>
        </View>
      </View>

      {desktop && canClaim ? (
        <PressableScale onPress={claim} scaleTo={0.98} style={{ flex: 1 }} accessibilityLabel={`${t('home.gift')}: +${dailyRewardAmount(streak)} ${t('common.coins')}`}>
          <View style={[styles.gift, { minHeight: 214, justifyContent: 'space-between' }]}>
            <LinearGradient colors={['#FFE6A7', '#FFC6D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ fontSize: 52 }} accessible={false}>🎁</Text>
              <View style={{ flex: 1 }}>
                <T variant="callout" weight="semibold" style={{ color: onPastel.text }}>{t('home.gift')}</T>
                <T variant="title" weight="semibold" tabular style={{ color: onPastel.text }}>+{formatCoins(dailyRewardAmount(streak))} {t('common.coins')}</T>
                <T variant="footnote" style={{ color: onPastel.text2 }}>{t('home.giftDay', { day: streak })}</T>
              </View>
            </View>
            <View style={[styles.giftBtn, { backgroundColor: onPastel.text }]}>
              <T variant="callout" weight="semibold" style={{ color: '#fff' }}>{t('home.claim')}</T>
            </View>
          </View>
        </PressableScale>
      ) : null}
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
      {canClaim && !desktop && (
        <PressableScale onPress={claim} scaleTo={0.98} style={{ marginHorizontal: SCREEN_PAD, marginTop: 24 }} accessibilityLabel={`${t('home.gift')}: +${dailyRewardAmount(streak)} ${t('common.coins')}`}>
          <View style={styles.gift}>
            <LinearGradient colors={['#FFE6A7', '#FFC6D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ fontSize: 40 }} accessible={false}>🎁</Text>
              <View style={{ flex: 1 }}>
                <T variant="callout" weight="semibold" style={{ color: onPastel.text }}>{t('home.gift')}</T>
                <T variant="headline" weight="semibold" tabular style={{ color: onPastel.text }}>+{formatCoins(dailyRewardAmount(streak))} {t('common.coins')}</T>
                <T variant="footnote" style={{ color: onPastel.text2 }}>{t('home.giftDay', { day: streak })}</T>
              </View>
            </View>
            <View style={[styles.giftBtn, { backgroundColor: onPastel.text }]}>
              <T variant="callout" weight="semibold" style={{ color: '#fff' }}>{t('home.claim')}</T>
            </View>
          </View>
        </PressableScale>
      )}

      {/* The live tables */}
      <Section title={`🔴 ${t('live.title')}`}>
        <LiveRow />
      </Section>

      {/* The slot hall: every slot machine in one big cabinet */}
      <PressableScale onPress={() => router.push('/slots')} scaleTo={0.98} accessibilityLabel={t('home.hall')} style={{ marginHorizontal: SCREEN_PAD, marginTop: 28 }}>
        <View style={styles.hall}>
          <LinearGradient colors={['#FF4FA3', '#7B1FA2', '#1A0624']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.hallLogos}>
            {SLOT_HALL.map((m, i) => (
              <View key={m.id} style={[styles.hallLogo, { transform: [{ rotate: `${(i - 1.5) * 9}deg` }, { translateY: Math.abs(i - 1.5) * 5 }] }]}>
                <GameLogo game={m.id} size={desktop ? 54 : 40} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <T variant="caption" weight="semibold" style={{ color: '#FFE58A', letterSpacing: 1.5 }}>🎰 {t('home.hall').toUpperCase()}</T>
            <T variant="headline" weight="semibold" style={{ color: '#fff' }}>{t('home.hallBody', { n: SLOT_HALL.length })}</T>
          </View>
          <View style={styles.hallGo}><T weight="display" style={{ color: '#231A3A', fontSize: 14 }}>{t('home.hallEnter')} ›</T></View>
        </View>
      </PressableScale>

      {/* Every game, two per row */}
      <Section title={t('home.allGames')}>
        <View style={[styles.grid, { paddingHorizontal: SCREEN_PAD }]}>
          {lobby.map((g, i) => {
            const locked = !isUnlocked(owned, `game:${g.id}` as UnlockId);
            return <GameTile key={g.id} id={g.id} index={i} style={{ width: tileW }} locked={locked} price={locked ? unlockPrice : undefined} onPress={() => (locked ? openUnlock(`game:${g.id}` as UnlockId) : open(g.id))} />;
          })}
        </View>
      </Section>

      {/* Collection: try every game (an honest exploration goal, no luck involved) */}
      <Section title={t('home.album')} action={<T variant="footnote" weight="semibold" color={tried.length === VISIBLE_GAMES.length ? 'win' : 'text2'}>{tried.length}/{VISIBLE_GAMES.length}</T>}>
        <View style={[styles.album, { backgroundColor: c.surface1, marginHorizontal: SCREEN_PAD }]}>
          <View style={styles.albumGrid}>
            {VISIBLE_GAMES.map((g) => {
              const got = tried.includes(g.id);
              return (
                <PressableScale key={g.id} onPress={() => open(g.id)} scaleTo={0.9} feedback="select" accessibilityLabel={`${t(`games.names.${g.id}`)}${got ? ' ✓' : ''}`} style={[styles.stamp, { width: stampW, backgroundColor: got ? c.surface3 : c.surface2 }]}>
                  <View style={{ opacity: got ? 1 : 0.25 }}><GameGlyph game={g.id} size={stampW - 6} /></View>
                  {got ? <View style={[styles.check, { backgroundColor: c.win }]} /> : null}
                </PressableScale>
              );
            })}
          </View>
          <ProgressBar value={tried.length / VISIBLE_GAMES.length} height={5} tint={c.win} style={{ marginTop: 14 }} />
          <T variant="footnote" color="text2" style={{ marginTop: 8 }}>{tried.length === VISIBLE_GAMES.length ? t('home.albumDone') : t('home.albumBody', { n: tried.length, total: VISIBLE_GAMES.length })}</T>
        </View>
      </Section>

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
      {/* This week's challenges: bigger goals, bigger gifts */}
      <Section title={`🏆 ${t('home.weekly')}`} action={<T variant="footnote" color="text2">{t('home.daysLeft', { count: weeklyDaysLeft(today) })}</T>}>
        <View style={{ marginHorizontal: SCREEN_PAD, borderRadius: radius.lg, overflow: 'hidden', paddingHorizontal: 16 }}>
          <LinearGradient colors={['rgba(255,185,56,0.16)', 'rgba(255,185,56,0.04)']} style={StyleSheet.absoluteFill} />
          {weekly.map((m, i) => (
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
  liveRou: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  shopCard: { marginTop: 28, height: 84, borderRadius: 24, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, alignSelf: 'flex-start' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, marginTop: 20 },
  noticeEmoji: { fontSize: 26 },
  gift: { gap: 14, padding: 18, borderRadius: radius.xl, overflow: 'hidden' },
  giftBtn: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  hall: { borderRadius: 24, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 2, borderColor: '#FFD06B' },
  hallLogos: { flexDirection: 'row' },
  hallLogo: { marginHorizontal: -6 },
  hallGo: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#FFD06B', justifyContent: 'center' },
  signRule: { height: 1, marginVertical: 10, marginHorizontal: 30, backgroundColor: 'rgba(255,214,120,0.35)' },
  hookRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center' },
  album: { borderRadius: radius.lg, padding: 16 },
  albumGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stamp: { aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', right: 3, top: 3, width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg },
});
