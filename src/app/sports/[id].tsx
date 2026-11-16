import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Chip, PressableScale, Screen, T } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { buildMarkets, type Market, type SportEvent } from '@/engine/sports/sports.ts';
import { useSports } from '@/features/sports/store';
import { useNow, FormChips, OddsButton, SlipDock, SPORT_EMOJI, StatusPill, TeamLogo, timeLabel } from '@/features/sports/ui';
import { haptic } from '@/services/haptics';

export default function SportEventPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const events = useSports((s) => s.events);
  const load = useSports((s) => s.load);
  const ev = events.find((e) => e.id === decodeURIComponent(String(id)));
  const [group, setGroup] = useState<string | null>(null);
  const now = useNow();
  useEffect(() => {
    if (ev) return;
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [ev, load]);
  const markets = useMemo(() => (ev ? buildMarkets(ev, lang) : []), [ev, lang]);
  if (!ev) return <Screen title={t('sports.title')} back tabBar={false}><T color="text2" align="center">{t('sports.loading')}</T></Screen>;
  const groups = [...new Set(markets.map((m) => m.group))];
  const cur = group && groups.includes(group) ? group : null;
  const shown = cur ? markets.filter((m) => m.group === cur) : markets;
  const open = ev.status === 'pre' && new Date(ev.startsAt).getTime() > now;
  return (
    <View style={{ flex: 1 }}>
      <Screen title={`${SPORT_EMOJI[ev.sport]} ${ev.leagueName}`} back tabBar={false} contentStyle={{ paddingBottom: 110 }}>
        <View style={{ paddingHorizontal: SCREEN_PAD }}>
          <Header ev={ev} markets={markets} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SCREEN_PAD, paddingVertical: 12 }}>
          <Chip label={`${t('sports.all')} (${markets.length})`} selected={!cur} onPress={() => setGroup(null)} />
          {groups.map((g) => <Chip key={g} label={g} selected={cur === g} onPress={() => setGroup(g)} />)}
        </ScrollView>
        {!open ? <T variant="footnote" color="text2" align="center" style={{ marginBottom: 8 }}>{t(ev.status === 'pre' ? 'sports.started' : 'sports.closedMarkets')}</T> : null}
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 10 }}>
          {shown.map((m, i) => <MarketCard key={m.key} ev={ev} m={m} open={open} index={i} />)}
        </View>
        <T variant="caption" color="text3" align="center" style={{ marginTop: 20, paddingHorizontal: 30 }}>{t('sports.priceNote')}</T>
      </Screen>
      <SlipDock />
    </View>
  );
}

function Header({ ev, markets }: { ev: SportEvent; markets: Market[] }) {
  const { t, lang } = useT();
  const score = ev.sport === 'tennis' ? ev.sets : ev.score;
  const main = markets.find((m) => m.key === (ev.sport === 'soccer' ? '1x2' : 'ml'));
  const src = ev.model.source;
  return (
    <View style={styles.header}>
      <LinearGradient colors={ev.sport === 'soccer' ? ['#0B6E52', '#062A24'] : ev.sport === 'f1' ? ['#8A1A2E', '#2A0710'] : ['#2A1A66', '#100A2A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ alignItems: 'center', marginBottom: 8 }}><StatusPill ev={ev} /></View>
      {ev.sport === 'f1' ? (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <T weight="display" align="center" style={{ color: '#fff', fontSize: 20 }}>🏁 {ev.name}</T>
          <T variant="footnote" style={{ color: 'rgba(255,255,255,0.8)' }}>{timeLabel(ev, lang)} · {ev.entrants?.length} {t('sports.drivers')}</T>
          <T variant="caption" style={{ color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>{t('sports.standingsTop')}: {ev.entrants?.slice(0, 3).map((d) => `${d.rank}. ${d.short} ${d.points}`).join(' · ')}</T>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {[ev.home, ev.away].map((s, k) => (
              <React.Fragment key={k}>
                {k === 1 ? (
                  <View style={{ alignItems: 'center', minWidth: 70 }}>
                    {score ? <T weight="display" tabular style={{ color: ev.status === 'live' ? '#FFD06B' : '#fff', fontSize: 34 }}>{score.home} - {score.away}</T> : <T weight="display" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>VS</T>}
                    {ev.sport === 'tennis' && score ? <T variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>sets</T> : null}
                  </View>
                ) : null}
                <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                  <TeamLogo side={s} size={54} />
                  <T weight="displaySemi" numberOfLines={2} align="center" style={{ color: '#fff', fontSize: 14 }}>{s?.name}</T>
                  {s?.rank ? <T variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>ATP/WTA #{s.rank}</T> : null}
                  {s?.record ? <T variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>{t('sports.record')} {s.record}</T> : null}
                  <FormChips form={s?.form} />
                </View>
              </React.Fragment>
            ))}
          </View>
          {main ? (
            <View style={{ marginTop: 14 }}>
              <View style={styles.probBar}>
                {main.sels.map((s, i) => (
                  <View key={s.key} style={{ flex: Math.max(0.04, s.p), backgroundColor: ['#5BE3B0', '#8A8A9A', '#A996FF'][i] ?? '#fff' }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {main.sels.map((s) => <T key={s.key} variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>{s.key === 'X' ? t('sports.draw') : s.label} {(s.p * 100).toFixed(0)}%</T>)}
              </View>
            </View>
          ) : null}
        </>
      )}
      <T variant="caption" align="center" style={{ color: 'rgba(255,255,255,0.6)', marginTop: 10 }}>{t(`sports.src.${src}`)}</T>
    </View>
  );
}

function MarketCard({ ev, m, open, index }: { ev: SportEvent; m: Market; open: boolean; index: number }) {
  const slip = useSports((s) => s.slip);
  const toggle = useSports((s) => s.toggle);
  const [collapsed, setCollapsed] = useState(false);
  const cols = m.sels.length === 2 ? 2 : m.sels.length === 3 ? 3 : ev.sport === 'f1' ? 2 : 3;
  const sels = ev.sport === 'f1' ? m.sels : m.sels;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30)} style={styles.card}>
      <PressableScale onPress={() => setCollapsed((c) => !c)} feedback="select" scaleTo={0.99} accessibilityLabel={m.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T weight="displaySemi" style={{ color: '#fff', fontSize: 14, flex: 1 }}>{m.name}</T>
        <T style={{ color: 'rgba(255,255,255,0.5)' }}>{collapsed ? '▾' : '▴'}</T>
      </PressableScale>
      {!collapsed ? (
        <View style={styles.grid}>
          {sels.map((s) => (
            <View key={s.key} style={{ width: `${100 / cols - 2}%` }}>
              <OddsButton label={s.label} odds={s.odds} disabled={!open} selected={!!slip.find((x) => x.eventId === ev.id && x.market === m.key && x.sel === s.key)}
                onPress={() => { haptic.select(); toggle({ eventId: ev.id, market: m.key, sel: s.key, odds: s.odds, label: s.label, marketName: m.name, eventName: ev.name }); }} />
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { borderRadius: 24, padding: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  probBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  card: { padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: 'space-between' },
});

