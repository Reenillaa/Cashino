import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, FillCover, IconButton, PressableScale, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import type { UnlockId } from '@/engine/meta/unlocks.ts';
import { useIsUnlocked, useNextUnlockPrice, useTrialLeft, useUnlocks } from '@/state/unlocks';
import { unlockInfo } from './UnlockSheet';

/** Wraps a screen that has to be bought first: shows its cover and the price until it is unlocked. */
export function LockedGate({ id, children }: { id: UnlockId; children: React.ReactNode }) {
  const unlocked = useIsUnlocked(id);
  const left = useTrialLeft(id);
  // decided when you come in: with trial rounds left you can play (the round in progress is never cut off)
  const [trial] = useState(() => !unlocked && id.startsWith('game:') && left > 0);
  if (unlocked) return <>{children}</>;
  // the game shows how many trial rounds are left under its room chip (see TrialNote)
  if (trial) return <>{children}</>;
  return <LockedScreen id={id} />;
}

/** "Free trial: N rounds left · Unlock", shown by the game screen under the room chip while the game is locked. */
export function TrialNote({ id }: { id: UnlockId }) {
  const { t } = useT();
  const unlocked = useIsUnlocked(id);
  const left = useTrialLeft(id);
  const open = useUnlocks((s) => s.open);
  if (unlocked) return null;
  return (
    <View style={{ alignItems: 'center', marginTop: 6 }}>
      <PressableScale onPress={() => open(id)} scaleTo={0.96} accessibilityLabel={t('unlock.trialBadge', { n: left })} style={styles.badge}>
        <LinearGradient colors={['#FFD06B', '#FF8A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <T weight="displaySemi" style={{ color: '#231A3A', fontSize: 12 }}>🎟️ {t('unlock.trialBadge', { n: left })}</T>
        <T weight="display" style={{ color: '#231A3A', fontSize: 12 }}>· {t('unlock.unlockShort')} ›</T>
      </PressableScale>
    </View>
  );
}

function LockedScreen({ id }: { id: UnlockId }) {
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const price = useNextUnlockPrice();
  const open = useUnlocks((s) => s.open);
  const info = unlockInfo(id, t);
  useEffect(() => {
    const k = setTimeout(() => open(id), 350);
    return () => clearTimeout(k);
  }, [id, open]);
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={info.colors} style={StyleSheet.absoluteFill} />
      {info.cover ? <FillCover id={info.cover} opacity={0.85} /> : null}
      <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(7,4,15,0.6)', '#07040F']} locations={[0, 0.5, 0.85]} style={StyleSheet.absoluteFill} />
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12 }}>
        <IconButton icon="chevronLeft" label={t('common.back')} onPress={() => router.back()} />
      </View>
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <T style={{ fontSize: 54 }}>🔒</T>
        <T weight="display" align="center" style={{ color: '#fff', fontSize: 30 }}>{info.name}</T>
        <T color="text2" align="center">{t('unlock.lockedBody')}</T>
        <Button title={t('unlock.buy', { price: formatCoins(price) })} onPress={() => open(id)} full />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#07040F' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 14, borderRadius: 15, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFF3C4' },
  body: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
});
