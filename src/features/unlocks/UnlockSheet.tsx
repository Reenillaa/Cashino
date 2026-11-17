import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, FillCover, Sheet, T, formatCoins } from '@/design/components';
import { gameVivid } from '@/design/tokens';
import { useT } from '@/i18n';
import type { GameId } from '@/engine/games/types.ts';
import { unlockPrice, unlockRequires, type UnlockId } from '@/engine/meta/unlocks.ts';
import { useOwnedUnlocks, useNextUnlockPrice, useUnlocks } from '@/state/unlocks';
import { useSession } from '@/state/session';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { accountShop } from '@/features/shop/accountShop';
import { OnlineError } from '@/services/supabase';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

export const SPORT_ICON: Record<string, string> = { soccer: '⚽', nba: '🏀', nfl: '🏈', nhl: '🏒', tennis: '🎾', ufc: '🥊', f1: '🏎️' };

/** Name, cover game and colours of an unlockable item. */
export function unlockInfo(id: UnlockId, t: (k: string) => string): { name: string; cover?: GameId; emoji?: string; colors: [string, string] } {
  if (id.startsWith('game:')) {
    const g = id.slice(5) as GameId;
    return { name: t(`games.names.${g}`), cover: g, colors: gameVivid[g] };
  }
  if (id.startsWith('live:')) {
    const g = id.slice(5) as 'horses' | 'roulette' | 'crash';
    return { name: t(`live.${g}`), cover: g, colors: gameVivid[g] };
  }
  if (id === 'sports') return { name: t('sports.title'), emoji: '🏟️', colors: ['#0B6E52', '#062A24'] };
  const s = id.slice(6);
  return { name: `${t('sports.title')} · ${t(`sports.sport.${s}`)}`, emoji: SPORT_ICON[s] ?? '🏅', colors: ['#12C08A', '#0B4E3E'] };
}

/** The "unlock" sheet: shows what you are buying, its price and what the next purchase will cost. */
export function UnlockSheet() {
  const { t } = useT();
  const id = useUnlocks((s) => s.prompt);
  const open = useUnlocks((s) => s.open);
  const owned = useOwnedUnlocks();
  const price = useNextUnlockPrice();
  const signedIn = useSession((s) => !!s.userId);
  const balance = useSession((s) => s.balance);
  const guestBalance = useWallet((s) => s.balance);
  const peak = useWallet((s) => s.peak ?? s.balance);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!id) return <Sheet visible={false} onClose={() => open(null)}>{null}</Sheet>;
  const info = unlockInfo(id, t);
  const have = signedIn ? balance ?? 0 : guestBalance;
  const need = unlockRequires(id);
  const blocked = need && !owned.includes(need) ? need : null;
  const next = unlockPrice(owned.length + 1, signedIn ? 0 : peak);
  const close = () => {
    setMsg(null);
    open(null);
  };
  const buy = async () => {
    if (busy) return;
    setMsg(null);
    try {
      setBusy(true);
      if (signedIn) await accountShop.unlock(id, price);
      else {
        const r = useUnlocks.getState().buyLocal(id);
        if (r === 'insufficient') throw new OnlineError('insufficient');
        if (r === 'needs') throw new OnlineError(`locked:${need}`);
      }
      sfx('cashout');
      haptic.success();
      useProgress.getState().pushToast({ kind: 'info', title: t('unlock.done', { name: info.name }) });
      close();
    } catch (e) {
      haptic.warning();
      const code = e instanceof OnlineError ? e.code : 'error';
      if (code === 'price_changed') void accountShop.sync().catch(() => undefined);
      setMsg(code === 'insufficient' ? t('unlock.notEnough') : code === 'price_changed' ? t('unlock.priceChanged') : `${t('common.error')} (${code})`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible onClose={close}>
      <View style={styles.hero}>
        <LinearGradient colors={info.colors} style={StyleSheet.absoluteFill} />
        {info.cover ? <FillCover id={info.cover} /> : <T style={styles.emoji}>{info.emoji}</T>}
        <LinearGradient colors={['rgba(0,0,0,0)', info.colors[1]]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.lock}><T style={{ fontSize: 20 }}>🔒</T></View>
        <T weight="display" style={styles.name}>{info.name}</T>
      </View>
      <View style={{ gap: 10, marginTop: 14 }}>
        {blocked ? (
          <>
            <T color="text2" align="center">{t('unlock.needsFirst', { name: unlockInfo(blocked, t).name })}</T>
            <Button title={t('unlock.goFirst', { name: unlockInfo(blocked, t).name })} onPress={() => open(blocked)} />
          </>
        ) : (
          <>
            <View style={styles.row}>
              <T color="text2">{t('unlock.price')}</T>
              <T weight="display" tabular style={{ color: '#FFD06B', fontSize: 26 }}>{formatCoins(price)}</T>
            </View>
            <View style={styles.row}>
              <T color="text2">{t('unlock.youHave')}</T>
              <T weight="displaySemi" tabular style={{ color: have >= price ? '#5BE3B0' : '#FF5C7A' }}>{formatCoins(have)}</T>
            </View>
            <T variant="footnote" color="text3">{t('unlock.ladder', { n: owned.length, next: formatCoins(next) })}</T>
            {msg ? <T variant="footnote" align="center" style={{ color: '#FF5C7A' }}>{msg}</T> : null}
            <Button title={have >= price ? t('unlock.buy', { price: formatCoins(price) }) : t('unlock.notEnoughShort', { missing: formatCoins(price - have) })} onPress={buy} loading={busy} disabled={have < price} />
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { height: 170, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', padding: 16 },
  emoji: { position: 'absolute', alignSelf: 'center', top: 22, fontSize: 70 },
  lock: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  name: { color: '#fff', fontSize: 26 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
