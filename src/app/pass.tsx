import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale, ProgressBar, Screen, T, formatCoins } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { supabase } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useProgress } from '@/state/progress';
import { passReward, seasonAt, seasonTier, SEASON_TIERS, SEASON_TIER_POINTS } from '@/engine/meta/progression.ts';
import { claimPassReward } from '@/features/economy/rewards';
import { usePlayErrors } from '@/games/shared/hooks';
import { useNow } from '@/features/time/useNow';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

/**
 * Season pass: 30 free tiers. Season points come from playing a little every day (capped), lessons,
 * missions and achievements — never from betting more. Every tier gives chips; every 5th is a big one.
 */
export default function SeasonPass() {
  const { t } = useT();
  const now = useNow();
  const season = seasonAt(now);
  const userId = useSession((s) => s.userId);
  const localPoints = useProgress((s) => s.seasonPoints);
  const localClaimed = useProgress((s) => s.passClaimed);
  const syncSeason = useProgress((s) => s.syncSeason);
  const [server, setServer] = useState<{ points: number; claimed: string[] } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const onError = usePlayErrors();

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const [{ data: sc }, { data: cl }] = await Promise.all([
      supabase.from('season_scores').select('points').eq('user_id', userId).eq('season', season.number).maybeSingle(),
      supabase.from('reward_claims').select('period').eq('user_id', userId).eq('kind', 'pass').like('period', `s${season.number}-%`),
    ]);
    setServer({ points: sc?.points ?? 0, claimed: (cl ?? []).map((r) => r.period as string) });
  }, [userId, season.number]);
  useEffect(() => {
    syncSeason();
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load, syncSeason]);

  const points = server?.points ?? localPoints;
  const claimed = new Set(server?.claimed ?? localClaimed);
  const tier = seasonTier(points);
  const into = points % SEASON_TIER_POINTS;
  const daysLeft = Math.max(0, Math.ceil((season.end - now) / 86_400_000));
  const ready = Array.from({ length: tier }, (_, i) => i + 1).filter((k) => !claimed.has(`s${season.number}-t${k}`));

  const claim = async (k: number) => {
    if (busy) return;
    try {
      setBusy(k);
      const got = await claimPassReward(k);
      if (got > 0) {
        sfx('cashout');
        haptic.success();
      }
      await load();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title={t('pass.title')} back tabBar={false}>
      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 14 }}>
        <View style={styles.hero}>
          <LinearGradient colors={['#7B5CFF', '#FF4FA3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <T weight="displaySemi" style={{ color: 'rgba(255,255,255,0.85)' }}>{t('pass.season', { n: season.number })} · {t('pass.daysLeft', { n: daysLeft })}</T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
            <T weight="display" tabular style={{ color: '#fff', fontSize: 52, lineHeight: 56 }}>{tier}</T>
            <T weight="display" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20, marginBottom: 8 }}>/ {SEASON_TIERS}</T>
          </View>
          {tier < SEASON_TIERS ? (
            <>
              <ProgressBar value={into / SEASON_TIER_POINTS} tint="#FFD06B" height={10} style={{ marginTop: 6 }} />
              <T variant="footnote" style={{ color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>{t('pass.toNext', { n: SEASON_TIER_POINTS - into, tier: tier + 1 })}</T>
            </>
          ) : <T weight="displaySemi" style={{ color: '#FFD06B' }}>{t('pass.done')}</T>}
          {ready.length ? (
            <PressableScale onPress={() => void claim(ready[0])} feedback="none" scaleTo={0.97} accessibilityLabel={t('pass.claim')} style={styles.claimAll}>
              <T weight="display" style={{ color: '#231A3A' }}>🎁 {t('pass.claimN', { n: ready.length })}</T>
            </PressableScale>
          ) : null}
        </View>
        <View style={styles.howBox}>
          <T weight="displaySemi" style={{ color: '#fff' }}>{t('pass.howTitle')}</T>
          <T variant="footnote" color="text2">{t('pass.how')}</T>
        </View>
        {Array.from({ length: SEASON_TIERS }, (_, i) => i + 1).map((k) => {
          const got = claimed.has(`s${season.number}-t${k}`);
          const open = k <= tier;
          const big = k % 5 === 0;
          return (
            <Animated.View key={k} entering={FadeInDown.delay(Math.min(k, 10) * 25)} style={[styles.tier, big && styles.tierBig, open && !got && { borderColor: '#FFD06B' }]}>
              <View style={[styles.badge, { backgroundColor: open ? (big ? '#FFD06B' : '#7B5CFF') : 'rgba(255,255,255,0.08)' }]}>
                <T weight="display" style={{ color: open && big ? '#231A3A' : '#fff' }}>{k}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="displaySemi" style={{ color: '#fff' }}>{big ? '💰 ' : '🪙 '}{formatCoins(passReward(k))} {t('common.coins')}</T>
                <T variant="caption" color="text3">{formatCoins(k * SEASON_TIER_POINTS)} {t('pass.points')}</T>
              </View>
              {got ? <T weight="display" style={{ color: '#5BE3B0' }}>✓</T> : open ? (
                <PressableScale onPress={() => void claim(k)} disabled={busy !== null} feedback="none" scaleTo={0.95} accessibilityLabel={`${t('pass.claim')} ${k}`} style={styles.claim}>
                  <T weight="display" style={{ color: '#231A3A', fontSize: 13 }}>{busy === k ? '…' : t('pass.claim')}</T>
                </PressableScale>
              ) : <T style={{ fontSize: 16, opacity: 0.5 }}>🔒</T>}
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 26, padding: 18, overflow: 'hidden' },
  claimAll: { marginTop: 14, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD06B' },
  howBox: { padding: 14, borderRadius: 18, gap: 4, backgroundColor: 'rgba(255,255,255,0.05)' },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'transparent' },
  tierBig: { backgroundColor: 'rgba(255,208,107,0.1)' },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  claim: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: '#FFD06B' },
});
