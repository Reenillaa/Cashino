import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GameCover, PressableScale, T, formatCoins } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { LIVE_UNLOCKS, SPORT_UNLOCKS, LOCKABLE_GAMES, isUnlocked, type UnlockId } from '@/engine/meta/unlocks.ts';
import { HIDDEN_GAMES } from '@/games/catalog';
import { useOwnedUnlocks, useNextUnlockPrice, useUnlocks } from '@/state/unlocks';
import { unlockInfo } from './UnlockSheet';

/** Shop section with everything that can be unlocked, grouped, with the current price on every locked one. */
export function UnlockList() {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const owned = useOwnedUnlocks();
  const price = useNextUnlockPrice();
  const open = useUnlocks((s) => s.open);
  const colW = (Math.min(width, 560) - SCREEN_PAD * 2 - 20) / 3;
  const groups: { title: string; items: UnlockId[] }[] = [
    { title: `🎮 ${t('unlock.groupGames')}`, items: LOCKABLE_GAMES.filter((g) => !HIDDEN_GAMES.includes(g)).map((g) => `game:${g}` as UnlockId) },
    { title: `🔴 ${t('live.title')}`, items: [...LIVE_UNLOCKS] },
    { title: `🏟️ ${t('sports.title')}`, items: ['sports', ...SPORT_UNLOCKS.map((s) => `sport:${s}` as UnlockId)] },
  ];
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const have = groups.reduce((a, g) => a + g.items.filter((i) => isUnlocked(owned, i)).length, 0);
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.next}>
        <LinearGradient colors={['#FFB938', '#D9741C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1 }}>
          <T variant="footnote" style={{ color: 'rgba(35,26,58,0.8)' }}>{t('unlock.next')}</T>
          <T weight="display" tabular style={{ color: '#231A3A', fontSize: 28 }}>{formatCoins(price)} 🪙</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T weight="display" style={{ color: '#231A3A', fontSize: 22 }}>{have}/{total}</T>
          <T variant="caption" style={{ color: 'rgba(35,26,58,0.8)' }}>{t('unlock.owned')}</T>
        </View>
      </View>
      <T variant="footnote" color="text3">{t('unlock.ladderShort')}</T>
      {groups.map((g) => (
        <View key={g.title} style={{ gap: 8 }}>
          <T weight="display" style={{ color: '#fff', fontSize: 16 }}>{g.title}</T>
          <View style={styles.grid}>
            {g.items.map((id, i) => {
              const info = unlockInfo(id, t);
              const got = isUnlocked(owned, id);
              return (
                <Animated.View key={id} entering={ZoomIn.delay(Math.min(i, 12) * 25)} style={{ width: colW }}>
                  <PressableScale onPress={() => (got ? undefined : open(id))} feedback="select" scaleTo={0.95} accessibilityLabel={`${info.name}, ${got ? t('unlock.owned') : formatCoins(price)}`} style={styles.tile}>
                    <LinearGradient colors={info.colors} style={StyleSheet.absoluteFill} />
                    {info.cover ? <View style={StyleSheet.absoluteFill}><GameCover id={info.cover} width={colW} height={110} /></View> : <T style={styles.emoji}>{info.emoji}</T>}
                    <LinearGradient colors={['rgba(0,0,0,0)', info.colors[1]]} locations={[0.3, 0.95]} style={StyleSheet.absoluteFill} />
                    {!got ? <View style={styles.veil} /> : null}
                    <T weight="displaySemi" numberOfLines={2} style={{ color: '#fff', fontSize: 12 }}>{info.name.replace(`${t('sports.title')} · `, '')}</T>
                    <View style={[styles.tag, { backgroundColor: got ? '#5BE3B0' : '#FFD06B' }]}>
                      <T weight="display" style={{ color: '#231A3A', fontSize: 10 }}>{got ? `✓ ${t('unlock.owned')}` : `🔒 ${formatCoins(price)}`}</T>
                    </View>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  next: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 22, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { height: 110, borderRadius: 18, overflow: 'hidden', padding: 8, justifyContent: 'flex-end', gap: 4 },
  veil: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(8,4,20,0.35)' },
  emoji: { position: 'absolute', alignSelf: 'center', top: 12, fontSize: 36 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 6, height: 18, borderRadius: 9, justifyContent: 'center' },
});
