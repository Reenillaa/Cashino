import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, Icon, PressableScale, Screen, Segmented, Skeleton, T, formatCoins } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { onlineConfigured } from '@/services/supabase';
import { useSession } from '@/state/session';
import { buildMarkets, cashOutValue, pricedLegs, type SportEvent } from '@/engine/sports/sports.ts';
import { useProgress } from '@/state/progress';
import { usePlayErrors } from '@/games/shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { useSports, type SportsBet } from '@/features/sports/store';
import { useOwnedUnlocks, useNextUnlockPrice, useUnlocks } from '@/state/unlocks';
import { isUnlocked, type UnlockId } from '@/engine/meta/unlocks.ts';
import { EventRow, GREEN, OddsButton, RaceCard, SlipDock, SPORT_EMOJI, StatusPill, TeamLogo, fmtOdds, timeLabel, useNow } from '@/features/sports/ui';

type Tab = 'sports' | 'live' | 'mine';
type SportKey = 'top' | 'soccer' | 'nba' | 'nfl' | 'nhl' | 'tennis' | 'ufc' | 'f1';
const TOP_LEAGUES = ['esp.1', 'eng.1', 'uefa.champions', 'ita.1', 'ger.1', 'fra.1', 'uefa.nations', 'uefa.euro', 'nfl', 'f1'];
const dayKey = (iso: string) => new Date(iso).toDateString();

export default function Sportsbook() {
  const { t, lang } = useT();
  const events = useSports((s) => s.events);
  const loading = useSports((s) => s.loading);
  const bets = useSports((s) => s.bets);
  const load = useSports((s) => s.load);
  const loadBets = useSports((s) => s.loadBets);
  const balance = useSession((s) => s.balance);
  const signedIn = useSession((s) => !!s.userId);
  const [tab, setTab] = useState<Tab>('sports');
  const [sport, setSport] = useState<SportKey>('top');
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    const first = setTimeout(() => { void load(); void loadBets(); }, 0);
    const id = setInterval(() => void load(), 60_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [load, loadBets]);

  const now = useNow();
  const owned = useOwnedUnlocks();
  const unlockPrice = useNextUnlockPrice();
  const openUnlock = useUnlocks((s) => s.open);
  const sportsOpen = isUnlocked(owned, 'sports');
  const sportOpen = (s: string) => isUnlocked(owned, `sport:${s}` as UnlockId);
  const upcoming = useMemo(() => events.filter((e) => e.status === 'pre' && new Date(e.startsAt).getTime() > now && isUnlocked(owned, `sport:${e.sport}` as UnlockId)), [events, now, owned]);
  const live = useMemo(() => events.filter((e) => e.status === 'live' && isUnlocked(owned, `sport:${e.sport}` as UnlockId)), [events, owned]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of upcoming) c[e.sport] = (c[e.sport] ?? 0) + 1;
    return c;
  }, [upcoming]);
  const ofSport = sport === 'top' ? [] : upcoming.filter((e) => e.sport === sport);
  const days = [...new Set(ofSport.map((e) => dayKey(e.startsAt)))];
  const curDay = day && days.includes(day) ? day : days[0];
  const shown = ofSport.filter((e) => dayKey(e.startsAt) === curDay || sport === 'f1');
  const byLeague = groupBy(shown, (e) => e.leagueName);
  const featured = upcoming.filter((e) => TOP_LEAGUES.includes(e.league)).slice(0, 8);

  return (
    <View style={{ flex: 1 }}>
      <Screen title={t('sports.title')} subtitle={signedIn ? `${formatCoins(balance ?? 0)} ${t('common.coins')}` : t('sports.subtitle')} contentStyle={{ paddingBottom: 60 }}>
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 12 }}>
          {!onlineConfigured ? <T color="text2">{t('auth.notConfigured')}</T> : null}
          <Segmented value={tab} onChange={(v) => { setTab(v); if (v === 'mine') void loadBets(); }} options={[{ value: 'sports', label: t('sports.tabSports') }, { value: 'live', label: `${t('sports.tabLive')}${live.length ? ` (${live.length})` : ''}` }, { value: 'mine', label: t('sports.tabMine') }]} />
        </View>

        {!sportsOpen ? (
          <View style={styles.lockedHero}>
            <LinearGradient colors={['#0B6E52', '#062A24']} style={StyleSheet.absoluteFill} />
            <T style={{ fontSize: 56 }}>🏟️</T>
            <T weight="display" align="center" style={{ color: '#fff', fontSize: 22 }}>🔒 {t('sports.lockedTitle')}</T>
            <T align="center" style={{ color: 'rgba(255,255,255,0.85)' }}>{t('sports.lockedBody')}</T>
            <Button title={t('unlock.buy', { price: formatCoins(unlockPrice) })} onPress={() => openUnlock('sports')} />
          </View>
        ) : tab === 'sports' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SCREEN_PAD, paddingVertical: 12 }}>
              {(['top', 'soccer', 'nba', 'nfl', 'nhl', 'tennis', 'ufc', 'f1'] as SportKey[]).map((k) => (
                <PressableScale key={k} onPress={() => { if (k !== 'top' && !sportOpen(k)) return openUnlock(`sport:${k}` as UnlockId); setSport(k); setDay(null); }} feedback="select" scaleTo={0.95} accessibilityLabel={t(`sports.sport.${k}`)} style={[styles.sport, sport === k && styles.sportOn, k !== 'top' && !sportOpen(k) && { opacity: 0.55 }]}>
                  {k !== 'top' && !sportOpen(k) ? <View style={styles.sportLock}><Icon name="lock" size={11} color="#231A3A" strokeWidth={2.6} /></View> : null}
                  <T style={{ fontSize: 20 }}>{k === 'top' ? '⭐' : SPORT_EMOJI[k]}</T>
                  <T weight="displaySemi" style={{ color: sport === k ? '#04201A' : '#fff', fontSize: 12 }}>{t(`sports.sport.${k}`)}</T>
                  {k !== 'top' && counts[k] ? <T style={{ color: sport === k ? '#04201A' : 'rgba(255,255,255,0.55)', fontSize: 10 }}>{counts[k]}</T> : null}
                </PressableScale>
              ))}
            </ScrollView>

            {sport === 'top' ? (
              <>
                <T weight="display" style={styles.h}>{t('sports.featured')}</T>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={292} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingHorizontal: SCREEN_PAD }}>
                  {featured.map((e, i) => <Featured key={e.id} ev={e} index={i} />)}
                </ScrollView>
                <T weight="display" style={styles.h}>{t('sports.soon')}</T>
                <View style={{ paddingHorizontal: SCREEN_PAD, gap: 8 }}>
                  {upcoming.filter((e) => e.sport !== 'f1').slice(0, 12).map((e, i) => (
                    <Animated.View key={e.id} entering={FadeInDown.delay(i * 30)}>
                      <T variant="caption" color="text3" style={{ marginBottom: 4 }}>{SPORT_EMOJI[e.sport]} {e.leagueName}</T>
                      <EventRow ev={e} />
                    </Animated.View>
                  ))}
                </View>
              </>
            ) : (
              <>
                {sport !== 'f1' && days.length > 1 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SCREEN_PAD, paddingBottom: 8 }}>
                    {days.map((d) => <Chip key={d} label={dayLabel(d, lang, t)} selected={d === curDay} onPress={() => setDay(d)} />)}
                  </ScrollView>
                ) : null}
                <View style={{ paddingHorizontal: SCREEN_PAD, gap: 16 }}>
                  {Object.entries(byLeague).map(([league, evs]) => (
                    <View key={league} style={{ gap: 8 }}>
                      <View style={styles.league}>
                        <T weight="display" style={{ color: '#fff', fontSize: 14, flex: 1 }}>{SPORT_EMOJI[evs[0].sport]} {league}</T>
                        {evs[0].sport === 'soccer' ? <View style={{ flexDirection: 'row', width: 168, justifyContent: 'space-around' }}>{['1', 'X', '2'].map((x) => <T key={x} variant="caption" color="text3">{x}</T>)}</View> : null}
                      </View>
                      {evs.map((e) => (e.sport === 'f1' ? <RaceCard key={e.id} ev={e} /> : <EventRow key={e.id} ev={e} />))}
                    </View>
                  ))}
                  {!shown.length ? (loading ? <Skeleton rows={5} height={64} avatar={false} style={{ marginTop: 8 }} /> : <T color="text2" align="center" style={{ marginTop: 24 }}>{t('sports.none')}</T>) : null}
                </View>
              </>
            )}
          </>
        ) : tab === 'live' ? (
          <View style={{ paddingHorizontal: SCREEN_PAD, gap: 8, paddingTop: 12 }}>
            {live.map((e) => <EventRow key={e.id} ev={e} />)}
            {!live.length ? <T color="text2" align="center" style={{ marginTop: 24 }}>{t('sports.noLive')}</T> : null}
            <T variant="caption" color="text3" align="center" style={{ marginTop: 8 }}>{t('sports.liveNote')}</T>
          </View>
        ) : (
          <View style={{ paddingHorizontal: SCREEN_PAD, gap: 10, paddingTop: 12 }}>
            {!signedIn ? <T color="text2" align="center">{t('sports.signInToBet')}</T> : null}
            {bets.map((b) => <MyBet key={b.id} b={b} />)}
            {signedIn && !bets.length ? <T color="text2" align="center" style={{ marginTop: 24 }}>{t('sports.noBets')}</T> : null}
          </View>
        )}
        <T variant="caption" color="text3" align="center" style={{ marginTop: 24, paddingHorizontal: 30 }}>{t('sports.source')}</T>
      </Screen>
      <SlipDock aboveTabs />
    </View>
  );
}

function Featured({ ev, index }: { ev: SportEvent; index: number }) {
  const { t, lang } = useT();
  const router = useRouter();
  const slip = useSports((s) => s.slip);
  const toggle = useSports((s) => s.toggle);
  const ms = buildMarkets(ev, lang);
  const main = ms.find((m) => m.key === (ev.sport === 'soccer' ? '1x2' : ev.sport === 'f1' ? 'win' : 'ml'));
  const colors: [string, string] = ev.sport === 'soccer' ? ['#0B6E52', '#062A24'] : ev.sport === 'f1' ? ['#8A1A2E', '#2A0710'] : ['#2A1A66', '#100A2A'];
  return (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <PressableScale onPress={() => router.push(`/sports/${encodeURIComponent(ev.id)}`)} feedback="select" scaleTo={0.98} accessibilityLabel={ev.name} style={styles.feat}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>{SPORT_EMOJI[ev.sport]} {ev.leagueName}</T>
          <StatusPill ev={ev} />
        </View>
        {ev.sport === 'f1' ? (
          <T weight="display" numberOfLines={2} style={{ color: '#fff', fontSize: 18, marginVertical: 10 }}>🏁 {ev.name}</T>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 10 }}>
            {[ev.home, ev.away].map((s, k) => (
              <React.Fragment key={k}>
                {k === 1 ? <T weight="display" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>VS</T> : null}
                <View style={{ alignItems: 'center', gap: 4, width: 100 }}>
                  <TeamLogo side={s} size={40} />
                  <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff', fontSize: 12 }}>{s?.short}</T>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}
        {main ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {main.sels.slice(0, 3).map((s) => (
              <View key={s.key} style={{ flex: 1 }}>
                <OddsButton label={ev.sport === 'soccer' ? s.key : s.label} odds={s.odds} selected={!!slip.find((x) => x.eventId === ev.id && x.market === main.key && x.sel === s.key)}
                  onPress={() => toggle({ eventId: ev.id, market: main.key, sel: s.key, odds: s.odds, label: s.label, marketName: main.name, eventName: ev.name })} />
              </View>
            ))}
          </View>
        ) : null}
        <T variant="caption" style={{ color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>{timeLabel(ev, lang)} · {t('sports.markets', { n: ms.length })}</T>
      </PressableScale>
    </Animated.View>
  );
}

function MyBet({ b }: { b: SportsBet }) {
  const { t } = useT();
  const events = useSports((s) => s.events);
  const cashOut = useSports((s) => s.cashOut);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const onError = usePlayErrors();
  const quote = b.status === 'pending' ? cashOutValue(Number(b.stake), pricedLegs(b.legs, (id) => events.find((e) => e.id === id), now)) : null;
  const doCash = async () => {
    if (!quote || busy) return;
    try {
      setBusy(true);
      const v = await cashOut(b.id, quote);
      sfx('cashout');
      haptic.success();
      useProgress.getState().pushToast({ kind: 'info', title: t('sports.cashoutDone', { v: formatCoins(v) }) });
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const color = b.status === 'won' ? GREEN : b.status === 'lost' ? '#FF5C7A' : b.status === 'void' ? '#8A8A9A' : b.status === 'cashout' ? '#A996FF' : '#FFD06B';
  return (
    <View style={[styles.bet, { borderColor: color }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <T weight="display" style={{ color: '#fff', fontSize: 14 }}>{b.legs.length > 1 ? `${t('sports.combo')} (${b.legs.length})` : t('sports.single')} · {fmtOdds(Number(b.odds))}</T>
        <View style={[styles.badge, { backgroundColor: color }]}><T style={{ color: '#04201A', fontSize: 11, fontWeight: '800' }}>{t(`sports.status.${b.status}`)}</T></View>
      </View>
      {b.legs.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 }}>
          <T style={{ width: 16, color: l.status === 'won' ? GREEN : l.status === 'lost' ? '#FF5C7A' : 'rgba(255,255,255,0.5)' }}>{l.status === 'won' ? '✓' : l.status === 'lost' ? '✗' : l.status === 'void' ? '–' : '•'}</T>
          <T variant="footnote" numberOfLines={1} style={{ color: '#fff', flex: 1 }}>{l.label} <T variant="caption" color="text3">· {l.marketName} · {l.eventName}</T></T>
          <T variant="footnote" tabular style={{ color: '#FFD06B' }}>{fmtOdds(l.odds)}</T>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <T variant="footnote" color="text2">{t('sports.stake')}: {formatCoins(Number(b.stake))}</T>
        <T variant="footnote" weight="semibold" style={{ color }}>{b.status === 'pending' ? `${t('sports.return')} ${formatCoins(Math.floor(Number(b.stake) * Number(b.odds)))}` : `${formatCoins(Number(b.payout ?? 0))}`}</T>
      </View>
      {quote ? (
        <PressableScale onPress={() => void doCash()} disabled={busy} feedback="none" scaleTo={0.97} accessibilityLabel={t('sports.cashoutFor', { v: formatCoins(quote) })} accessibilityHint={t('sports.cashoutHelp')} style={styles.cashout}>
          <T weight="display" style={{ color: '#231A3A' }}>💸 {busy ? '…' : t('sports.cashoutFor', { v: formatCoins(quote) })}</T>
        </PressableScale>
      ) : null}
    </View>
  );
}

function groupBy<T>(xs: T[], f: (x: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const x of xs) (out[f(x)] ??= []).push(x);
  return out;
}
function dayLabel(d: string, lang: 'es' | 'en', t: (k: string) => string) {
  const date = new Date(d);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400_000);
  if (date.toDateString() === today.toDateString()) return t('sports.today');
  if (date.toDateString() === tomorrow.toDateString()) return t('sports.tomorrow');
  return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  lockedHero: { margin: SCREEN_PAD, marginTop: 16, padding: 20, borderRadius: 26, overflow: 'hidden', alignItems: 'center', gap: 10 },
  sportLock: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFD06B', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  cashout: { marginTop: 10, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD06B' },
  sport: { alignItems: 'center', justifyContent: 'center', width: 74, height: 70, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', gap: 1 },
  sportOn: { backgroundColor: GREEN },
  h: { color: '#fff', fontSize: 18, paddingHorizontal: SCREEN_PAD, marginTop: 8, marginBottom: 10 },
  feat: { width: 280, borderRadius: 22, padding: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  league: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  bet: { padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderLeftWidth: 4 },
  badge: { paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center' },
});
