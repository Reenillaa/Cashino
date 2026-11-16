import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GameCover, IconButton, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import type { UnlockId } from '@/engine/meta/unlocks.ts';
import { useIsUnlocked, useNextUnlockPrice, useUnlocks } from '@/state/unlocks';
import { unlockInfo } from './UnlockSheet';

/** Wraps a screen that has to be bought first: shows its cover and the price until it is unlocked. */
export function LockedGate({ id, children }: { id: UnlockId; children: React.ReactNode }) {
  const unlocked = useIsUnlocked(id);
  if (unlocked) return <>{children}</>;
  return <LockedScreen id={id} />;
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
      {info.cover ? <View style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}><GameCover id={info.cover} width={440} height={900} /></View> : null}
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
  body: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
});
