import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Icon, type IconName } from './Icon';
import { T } from './Text';
import { PressableScale } from './Pressable';
import { ChipLogo } from './Logo';
import { Avatar, useMyAvatar, useMyFrame } from './Avatar';
import { AnimatedNumber } from './AnimatedNumber';
import { brand } from '../tokens';
import { SIDEBAR_W } from '../layout';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { levelFromXp } from '@/engine/meta/progression.ts';
import { useHiddenTotal } from '@/features/play/reveal';

export interface SideItem { key: string; label: string; icon: IconName }

/** Computer navigation: a fixed left column with the brand, the sections, your chips and quick links. */
export function DesktopSidebar({ items, active, onSelect }: { items: SideItem[]; active: string; onSelect: (key: string) => void }) {
  const { t } = useT();
  const router = useRouter();
  const signedIn = useSession((s) => !!s.userId);
  const server = useSession((s) => s.balance);
  const profile = useSession((s) => s.profile);
  const guest = useWallet((s) => s.balance);
  const hidden = useHiddenTotal();
  const xp = useProgress((s) => s.xp);
  const lvl = levelFromXp(xp);
  const avatar = useMyAvatar(profile?.avatar);
  const frame = useMyFrame();
  const balance = Math.max(0, (signedIn ? server ?? 0 : guest) - hidden);
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      <LinearGradient colors={['#140C2C', '#0A0616']} style={StyleSheet.absoluteFill} />
      <View style={styles.brand}>
        <ChipLogo size={34} id="side" />
        <T weight="display" style={{ color: '#fff', fontSize: 22, letterSpacing: -0.8 }}>cashino</T>
      </View>
      <View style={styles.wallet}>
        <LinearGradient colors={['rgba(18,192,138,0.22)', 'rgba(18,192,138,0.06)']} style={StyleSheet.absoluteFill} />
        <T variant="caption" style={{ color: 'rgba(255,255,255,0.65)' }}>{t('home.chips')}</T>
        <AnimatedNumber value={balance} variant="title" weight="display" color="win" style={{ fontSize: 28, lineHeight: 34 }} />
        <T variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('common.level')} {lvl.level} · {lvl.into}/{lvl.needed} XP</T>
      </View>
      <View style={{ gap: 4, marginTop: 8 }}>
        {items.map((it) => {
          const on = it.key === active;
          return (
            <PressableScale key={it.key} onPress={() => onSelect(it.key)} feedback="select" scaleTo={0.97} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={it.label} style={[styles.item, on && styles.itemOn]}>
              {on ? <LinearGradient colors={brand.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
              <Icon name={it.icon} size={21} color={on ? '#fff' : 'rgba(255,255,255,0.7)'} strokeWidth={on ? 2.2 : 1.8} />
              <T weight={on ? 'semibold' : 'medium'} style={{ color: on ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: 15 }}>{it.label}</T>
            </PressableScale>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 4 }}>
        <PressableScale onPress={() => router.push('/academy')} feedback="select" scaleTo={0.97} accessibilityLabel={t('home.learn')} style={styles.item}>
          <Icon name="book" size={20} color="rgba(255,255,255,0.7)" />
          <T style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{t('home.learn')}</T>
        </PressableScale>
        <PressableScale onPress={() => router.push('/settings')} feedback="select" scaleTo={0.97} accessibilityLabel={t('settings.title')} style={styles.item}>
          <Icon name="settings" size={20} color="rgba(255,255,255,0.7)" />
          <T style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{t('settings.title')}</T>
        </PressableScale>
      </View>
      <PressableScale onPress={() => onSelect('profile')} feedback="select" scaleTo={0.98} accessibilityLabel={t('tabs.profile')} style={styles.me}>
        <Avatar id={avatar} size={38} frame={frame} />
        <View style={{ flex: 1 }}>
          <T weight="semibold" numberOfLines={1} style={{ color: '#fff' }}>{profile?.display_name || profile?.username || t('profile.guestName')}</T>
          <T variant="caption" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.55)' }}>{signedIn ? `@${profile?.username ?? ''}` : t('profile.createAccount')}</T>
        </View>
      </PressableScale>
      <T variant="caption" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 10 }}>{t('common.noMoneyDisclaimer')}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: SIDEBAR_W, height: '100%', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 16, overflow: 'hidden', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.1)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginBottom: 20 },
  wallet: { borderRadius: 18, padding: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(18,192,138,0.3)', marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 46, paddingHorizontal: 14, borderRadius: 14, overflow: 'hidden' },
  itemOn: { shadowColor: brand.pink, shadowOpacity: 0.5, shadowRadius: 14 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
});
