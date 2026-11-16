import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, CardBackArt, Chip, PressableScale, Screen, T, TitleBadge, formatCoins, useMyAvatar } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { useWallet } from '@/state/wallet';
import { useCosmetics, type Slot } from '@/state/cosmetics';
import { CARD_BACKS, FELTS, FRAMES, PREMIUM_AVATARS, TITLES } from '@/features/shop/items';
import { useSession } from '@/state/session';
import { accountShop } from '@/features/shop/accountShop';
import { sfx } from '@/services/audio';
import { UnlockList } from '@/features/unlocks/UnlockList';
import { haptic } from '@/services/haptics';

/** Cosmetic shop: spend play chips on looks. Nothing here changes any game's odds. */
export default function Shop() {
  const { t, lang } = useT();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Slot | 'unlock'>('unlock');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const guestBalance = useWallet((s) => s.balance);
  const accountBalance = useSession((s) => s.balance);
  const account = useCosmetics((s) => s.account) && accountShop.active();
  const balance = account ? accountBalance ?? 0 : guestBalance;
  const [busy, setBusy] = useState(false);
  const owned = useCosmetics((s) => s.owned);
  const equipped = useCosmetics((s) => s.equipped);
  const myAvatar = useMyAvatar(useSession((st) => st.profile?.avatar));
  const colW = (Math.min(width, 560) - SCREEN_PAD * 2 - 12) / 2;

  const act = (slot: Slot, id: string, price: number) => {
    setMsg(null);
    const key = `${slot}:${id}`;
    if (owned.includes(key)) {
      const optional = slot === 'avatar' || slot === 'frame' || slot === 'title';
      const next = optional && equipped[slot] === id ? null : id;
      if (account) void accountShop.equip(slot, next).catch(() => setMsg(t('common.offline')));
      else useCosmetics.getState().equip(slot, next);
      sfx('chip', 0.6);
      haptic.select();
      return;
    }
    if (price > balance) {
      setMsg(t('shop.notEnough'));
      haptic.warning();
      return;
    }
    // two taps to buy, so nobody spends chips by accident
    if (confirm !== key) {
      setConfirm(key);
      haptic.select();
      return;
    }
    setConfirm(null);
    if (account) {
      if (busy) return;
      setBusy(true);
      void accountShop
        .buy(slot, id)
        .then(() => {
          sfx('cashout');
          haptic.success();
        })
        .catch((e: { code?: string }) => setMsg(e.code === 'insufficient' ? t('shop.notEnough') : t('common.offline')))
        .finally(() => setBusy(false));
      return;
    }
    if (useCosmetics.getState().buy(slot, id, price)) {
      sfx('cashout');
      haptic.success();
    }
  };

  const items =
    tab === 'unlock' ? []
    : tab === 'back' ? CARD_BACKS.map((b) => ({ id: b.id, name: b.name, price: b.price, preview: <CardBackArt item={b} dim={{ w: 64, h: 90, r: 10 }} />, w: 64, h: 90 }))
      : tab === 'felt' ? FELTS.map((f) => ({ id: f.id, name: f.name, price: f.price, preview: <FeltSwatch colors={f.colors} />, w: 120, h: 80 }))
        : tab === 'avatar' ? PREMIUM_AVATARS.map((a) => ({ id: a.id, name: a.name, price: a.price, preview: <Avatar id={a.id} size={76} />, w: 76, h: 76 }))
          : tab === 'frame' ? FRAMES.map((f) => ({ id: f.id, name: f.name, price: f.price, preview: <Avatar id={myAvatar} size={70} frame={f.id} />, w: 84, h: 84 }))
            : TITLES.map((x) => ({ id: x.id, name: x.name, price: x.price, preview: <TitleBadge title={x.name[lang]} color={x.color} />, w: 150, h: 40 }));

  return (
    <Screen title={t('shop.title')} subtitle={t('shop.subtitle')}>
      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 14 }}>
        <View style={[styles.wallet, { backgroundColor: c.surface1 }]}>
          <T variant="footnote" color="text2">{t('shop.yourChips')}</T>
          <T weight="display" tabular style={{ color: c.win, fontSize: 30, lineHeight: 36 }}>{formatCoins(balance)}</T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={`🔓 ${t('unlock.title')}`} selected={tab === 'unlock'} onPress={() => { setTab('unlock'); setConfirm(null); setMsg(null); }} />
          {(['back', 'felt', 'avatar', 'frame', 'title'] as Slot[]).map((k) => (
            <Chip key={k} label={t(`shop.tabs.${k}`)} selected={tab === k} onPress={() => { setTab(k); setConfirm(null); setMsg(null); }} />
          ))}
        </ScrollView>
        {msg ? <Animated.View entering={FadeIn}><T variant="footnote" color="warn" align="center">{msg}</T></Animated.View> : null}
        {tab === 'unlock' ? <UnlockList /> : null}
        <View style={styles.grid}>
          {tab !== 'unlock' && items.map((it, i) => {
            const key = `${tab}:${it.id}`;
            const has = owned.includes(key);
            const on = equipped[tab] === it.id;
            const asking = confirm === key;
            return (
              <Animated.View key={key} entering={ZoomIn.delay(i * 40)} style={{ width: colW }}>
                <PressableScale onPress={() => act(tab, it.id, it.price)} feedback="none" scaleTo={0.96} accessibilityLabel={`${it.name[lang]}, ${has ? (on ? t('shop.equipped') : t('shop.equip')) : `${formatCoins(it.price)} ${t('common.coins')}`}`}
                  style={[styles.item, { backgroundColor: c.surface1, borderColor: on ? '#FFD06B' : asking ? c.win : 'transparent' }]}>
                  <View style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: it.w, height: it.h, alignItems: 'center', justifyContent: 'center' }}>{it.preview}</View>
                  </View>
                  <T variant="callout" weight="semibold" align="center" numberOfLines={1}>{it.name[lang]}</T>
                  <View style={[styles.cta, { backgroundColor: on ? 'rgba(255,208,107,0.18)' : has ? c.surface2 : asking ? c.win : c.surface3 }]}>
                    <T weight="displaySemi" style={{ fontSize: 13, color: on ? '#FFD06B' : asking ? '#06140E' : c.text }}>
                      {on ? `✓ ${t('shop.equipped')}` : has ? t('shop.equip') : asking ? t('shop.confirm') : it.price === 0 ? t('shop.free') : `${formatCoins(it.price)} 🪙`}
                    </T>
                  </View>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>
        <T variant="footnote" color="text3" align="center" style={{ marginTop: 4 }}>{t('shop.disclaimer')}</T>
      </View>
    </Screen>
  );
}

function FeltSwatch({ colors }: { colors: [string, string] }) {
  return (
    <View style={{ width: 120, height: 80, borderRadius: 40, padding: 4, overflow: 'hidden' }}>
      <LinearGradient colors={['#F7D774', '#A8741A']} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, borderRadius: 36, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 8, right: 8, top: 8, bottom: 8, borderRadius: 30, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,229,138,0.4)' }} />
        <T weight="display" style={{ color: 'rgba(255,229,138,0.6)', fontSize: 11, letterSpacing: 2 }}>CASHINO</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wallet: { borderRadius: 20, padding: 14, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { borderRadius: 22, padding: 12, gap: 8, borderWidth: 2 },
  cta: { height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
