import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, PressableScale, Segmented, Sheet, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { buildMarkets, SLIP, type Side, type SlipSel, type SportEvent } from '@/engine/sports/sports.ts';
import { BetInput } from '@/games/shared/BetInput';
import { useSession } from '@/state/session';
import { useProgress } from '@/state/progress';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { slipOdds, useSports } from './store';

export const GREEN = '#12C08A';

/** Current time, refreshed every 30 s (so 'is it open?' checks stay pure during render). */
export function useNow(every = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}
export const fmtOdds = (x: number) => x.toFixed(2).replace('.', ',');
export const SPORT_EMOJI: Record<string, string> = { soccer: '⚽', nba: '🏀', nfl: '🏈', nhl: '🏒', tennis: '🎾', ufc: '🥊', f1: '🏎️' };

export function timeLabel(ev: SportEvent, lang: 'es' | 'en') {
  const d = new Date(ev.startsAt);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: 'numeric' })} ${time}`;
}

/** A price you can tap: it turns green when it is in your slip. */
export function OddsButton({ label, odds, selected, onPress, disabled, wide }: { label?: string; odds: number; selected: boolean; onPress: () => void; disabled?: boolean; wide?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} feedback="none" scaleTo={0.94} accessibilityLabel={`${label ?? ''} ${fmtOdds(odds)}`} accessibilityState={{ selected }}
      style={[styles.odds, wide && { flexBasis: '48%' }, selected && styles.oddsOn, disabled && { opacity: 0.35 }]}>
      {label ? <T numberOfLines={1} style={{ fontSize: 11, color: selected ? '#04201A' : 'rgba(255,255,255,0.7)', maxWidth: '100%' }}>{label}</T> : null}
      <T weight="display" tabular style={{ fontSize: 15, color: selected ? '#04201A' : '#FFD06B' }}>{fmtOdds(odds)}</T>
    </PressableScale>
  );
}

export function TeamLogo({ side, size = 22 }: { side?: Side; size?: number }) {
  if (!side?.logo) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />;
  return <Image source={{ uri: side.logo }} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

/** W/D/L boxes for recent form (ESPN gives it most recent last). */
export function FormChips({ form }: { form?: string }) {
  if (!form) return null;
  const map: Record<string, [string, string]> = { W: ['V', '#12C08A'], D: ['E', '#8A8A9A'], L: ['D', '#FF5C7A'] };
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {form.split('').slice(-5).map((c, i) => (
        <View key={i} style={[styles.formBox, { backgroundColor: map[c]?.[1] ?? '#444' }]}><T style={{ fontSize: 9, color: '#fff', fontWeight: '800' }}>{map[c]?.[0] ?? c}</T></View>
      ))}
    </View>
  );
}

export function StatusPill({ ev }: { ev: SportEvent }) {
  const { t, lang } = useT();
  if (ev.status === 'live') return <View style={styles.live}><View style={styles.liveDot} /><T style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{t('sports.live')} {ev.clock ?? ''}</T></View>;
  if (ev.status === 'final') return <T style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{t('sports.final')}</T>;
  if (ev.status === 'void') return <T style={{ color: '#FF5C7A', fontSize: 11 }}>{t('sports.void')}</T>;
  return <T style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{timeLabel(ev, lang)}</T>;
}

const mainMarket = (ev: SportEvent) => (ev.sport === 'soccer' ? '1x2' : 'ml');

/** One fixture in a league list: status, both sides, the main market prices and a link to every market. */
export function EventRow({ ev }: { ev: SportEvent }) {
  const { lang } = useT();
  const router = useRouter();
  const slip = useSports((s) => s.slip);
  const toggle = useSports((s) => s.toggle);
  const markets = buildMarkets(ev, lang);
  const main = markets.find((m) => m.key === mainMarket(ev));
  const now = useNow();
  const open = ev.status === 'pre' && new Date(ev.startsAt).getTime() > now;
  const extra = markets.reduce((n, m) => n + m.sels.length, 0) - (main?.sels.length ?? 0);
  const score = ev.sport === 'tennis' ? ev.sets : ev.score;
  return (
    <PressableScale onPress={() => router.push(`/sports/${encodeURIComponent(ev.id)}`)} feedback="select" scaleTo={0.99} accessibilityLabel={ev.name} style={styles.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <StatusPill ev={ev} />
        <T style={{ color: GREEN, fontSize: 11, fontWeight: '700' }}>{extra > 0 ? `+${extra} ` : ''}›</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          {[ev.home, ev.away].map((sd, k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TeamLogo side={sd} size={20} />
              <T numberOfLines={1} style={{ color: '#fff', fontSize: 14, flex: 1 }}>{sd?.name}{sd?.rank ? <T style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}> ({sd.rank})</T> : null}</T>
              {score ? <T weight="display" tabular style={{ color: ev.status === 'live' ? '#FFD06B' : '#fff', fontSize: 15 }}>{k === 0 ? score.home : score.away}</T> : null}
            </View>
          ))}
        </View>
        {main && open ? (
          <View style={{ flexDirection: 'row', gap: 6, width: main.sels.length === 3 ? 168 : 116 }}>
            {main.sels.map((s) => (
              <View key={s.key} style={{ flex: 1 }}>
                <OddsButton label={main.sels.length === 3 ? s.key : undefined} odds={s.odds} selected={!!slip.find((x) => x.eventId === ev.id && x.market === main.key && x.sel === s.key)}
                  onPress={() => { haptic.select(); toggle({ eventId: ev.id, market: main.key, sel: s.key, odds: s.odds, label: s.label, marketName: main.name, eventName: ev.name }); }} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

/** F1: the Grand Prix with the three favourites to win. */
export function RaceCard({ ev }: { ev: SportEvent }) {
  const { t, lang } = useT();
  const router = useRouter();
  const slip = useSports((s) => s.slip);
  const toggle = useSports((s) => s.toggle);
  const win = buildMarkets(ev, lang).find((m) => m.key === 'win');
  if (!win) return null;
  const open = ev.status === 'pre';
  return (
    <PressableScale onPress={() => router.push(`/sports/${encodeURIComponent(ev.id)}`)} feedback="select" scaleTo={0.99} accessibilityLabel={ev.name} style={[styles.row, { overflow: 'hidden' }]}>
      <LinearGradient colors={['rgba(232,48,79,0.35)', 'rgba(232,48,79,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T weight="display" style={{ color: '#fff', fontSize: 15, flex: 1 }} numberOfLines={1}>🏁 {ev.name}</T>
        <StatusPill ev={ev} />
      </View>
      <T variant="caption" color="text2" style={{ marginVertical: 6 }}>{t('sports.raceWinner')}</T>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {win.sels.slice(0, 3).map((s) => (
          <View key={s.key} style={{ flex: 1 }}>
            <OddsButton label={s.label} odds={s.odds} disabled={!open} selected={!!slip.find((x) => x.eventId === ev.id && x.market === 'win' && x.sel === s.key)}
              onPress={() => toggle({ eventId: ev.id, market: 'win', sel: s.key, odds: s.odds, label: s.label, marketName: win.name, eventName: ev.name })} />
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

/** Floating slip bar + the slip sheet (singles or a combo, stake, potential return, place). */
export function SlipDock({ aboveTabs }: { aboveTabs?: boolean } = {}) {
  const { t } = useT();
  const router = useRouter();
  const slip = useSports((s) => s.slip);
  const mode = useSports((s) => s.mode);
  const setMode = useSports((s) => s.setMode);
  const remove = useSports((s) => s.remove);
  const clear = useSports((s) => s.clear);
  const place = useSports((s) => s.place);
  const balance = useSession((s) => s.balance) ?? 0;
  const signedIn = useSession((s) => !!s.userId);
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState(50);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!slip.length) return null;
  const { odds, comboOk } = slipOdds(slip);
  const m = mode === 'combo' && comboOk ? 'combo' : 'single';
  const total = m === 'combo' ? stake : stake * slip.length;
  const ret = m === 'combo' ? Math.floor(stake * odds) : slip.reduce((a, s) => a + Math.floor(stake * s.odds), 0);
  const submit = async () => {
    if (!signedIn) return router.push('/auth');
    setBusy(true);
    setMsg(null);
    if (useSports.getState().mode !== m) setMode(m);
    const r = await place(stake);
    setBusy(false);
    if (r.ok) {
      sfx('cashout');
      haptic.success();
      setOpen(false);
      useProgress.getState().pushToast({ kind: 'info', title: t('sports.placed') });
    } else setMsg(r.code === 'odds_changed' ? t('sports.oddsChanged') : r.code === 'insufficient' ? t('common.insufficient') : r.code === 'event_started' ? t('sports.started') : `${t('common.error')} (${r.code})`);
  };
  return (
    <>
      <Animated.View entering={FadeInUp} style={[styles.dock, aboveTabs && { bottom: 104 }]}>
        <PressableScale onPress={() => setOpen(true)} feedback="medium" scaleTo={0.97} accessibilityLabel={t('sports.slip')} style={styles.dockBtn}>
          <View style={styles.count}><T weight="display" style={{ color: '#04201A', fontSize: 13 }}>{slip.length}</T></View>
          <T weight="display" style={{ color: '#fff', fontSize: 16, flex: 1 }}>{t('sports.slip')}</T>
          {slip.length > 1 && comboOk ? <T weight="display" tabular style={{ color: '#FFD06B', fontSize: 16 }}>{fmtOdds(odds)}</T> : null}
        </PressableScale>
      </Animated.View>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('sports.slip')}>
        <View style={{ gap: 10 }}>
          {slip.length > 1 ? (
            <Segmented value={m} onChange={(v) => setMode(v)} options={[{ value: 'single', label: `${t('sports.singles')} (${slip.length})` }, ...(comboOk ? [{ value: 'combo' as const, label: `${t('sports.combo')} ${fmtOdds(odds)}` }] : [])]} />
          ) : null}
          <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 8 }}>
            {slip.map((s: SlipSel) => (
              <Animated.View key={`${s.eventId}-${s.market}`} entering={FadeIn} style={styles.leg}>
                <View style={{ flex: 1 }}>
                  <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff', fontSize: 14 }}>{s.label}</T>
                  <T variant="caption" color="text2" numberOfLines={1}>{s.marketName}</T>
                  <T variant="caption" color="text3" numberOfLines={1}>{s.eventName}</T>
                </View>
                <T weight="display" tabular style={{ color: '#FFD06B', fontSize: 16 }}>{fmtOdds(s.odds)}</T>
                <PressableScale onPress={() => remove(s.eventId, s.market)} feedback="select" accessibilityLabel={t('common.remove')} style={styles.x}><T style={{ color: '#fff' }}>✕</T></PressableScale>
              </Animated.View>
            ))}
          </ScrollView>
          {!comboOk && slip.length > 1 ? <T variant="caption" color="text3">{t('sports.comboRule')}</T> : null}
          <BetInput value={stake} onChange={setStake} balance={balance || SLIP.maxStake} min={SLIP.minStake} max={SLIP.maxStake} label={m === 'single' && slip.length > 1 ? t('sports.stakeEach') : t('sports.stake')} />
          <View style={styles.sum}>
            <T variant="footnote" color="text2">{t('sports.total')} <T variant="footnote" weight="semibold" style={{ color: '#fff' }}>{formatCoins(total)}</T></T>
            <T variant="footnote" color="text2">{t('sports.return')} <T weight="display" style={{ color: GREEN, fontSize: 18 }}>{formatCoins(ret)}</T></T>
          </View>
          {msg ? <T variant="footnote" style={{ color: '#FFD06B' }}>{msg}</T> : null}
          <Button title={signedIn ? `${t('sports.place')} · ${formatCoins(total)}` : t('sports.signInToBet')} onPress={submit} loading={busy} disabled={signedIn && total > balance} />
          <Button title={t('sports.clear')} kind="ghost" size="sm" onPress={() => { clear(); setOpen(false); }} />
          <T variant="caption" color="text3" align="center">{t('sports.disclaimer')}</T>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  odds: { minHeight: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  oddsOn: { backgroundColor: GREEN, borderColor: '#5BE3B0' },
  row: { padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  formBox: { width: 16, height: 16, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: '#E8304F' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  dock: { position: 'absolute', left: 12, right: 12, bottom: 18 },
  dockBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, borderRadius: 28, paddingHorizontal: 14, backgroundColor: '#0B6E52', borderWidth: 2, borderColor: GREEN, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14 },
  count: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD06B', alignItems: 'center', justifyContent: 'center' },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' },
  x: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  sum: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
