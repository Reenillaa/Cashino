import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, PressableScale, T } from '@/design/components';
import { useT } from '@/i18n';
import { CALL_BETS, callChips, callNumbers, type CallBet, type PlacedBet } from '@/engine/games/roulette.ts';
import { RaceTrack, TableBoard } from './Board';
import { numColor } from './Stage';

export type BoardMode = 'table' | 'zones';
const ZONES: { id: CallBet; colors: [string, string]; icon: string }[] = [
  { id: 'voisins', colors: ['#FF7A3D', '#9A1A06'], icon: '🔥' },
  { id: 'zero', colors: ['#FFD06B', '#C86A00'], icon: '0️⃣' },
  { id: 'tiers', colors: ['#7B5CFF', '#2A0F8A'], icon: '🎯' },
  { id: 'orphelins', colors: ['#12C08A', '#06504A'], icon: '🍀' },
];

/**
 * The betting layer over the wheel. "Table" unfolds every number across the screen; "Zones" shows the
 * racetrack with the French call bets. It folds away by itself when betting closes.
 */
export function BetOverlay({ w, h, vertical, mode, onMode, bets, confirmed, chip, onAdd, last, disabled, onClose, footer, center }: {
  w: number; h: number; vertical: boolean; mode: BoardMode; onMode: (m: BoardMode) => void;
  bets: Record<string, PlacedBet>; confirmed?: Record<string, PlacedBet>; chip: number; onAdd: (list: PlacedBet[], label?: string) => void;
  last?: number | null; disabled?: boolean; onClose: () => void; footer?: React.ReactNode; center?: React.ReactNode;
}) {
  const { t } = useT();
  const [k, setK] = useState(2);
  const head = 46, foot = footer ? 52 : 0, pad = vertical ? 8 : 18;
  const cw = w - pad * 2, ch = h - head - foot - 10;
  // zones: the track next to (phones) or above (computers) the call buttons
  const trackW = vertical ? Math.min(cw * 0.56, ch * 0.5) : Math.min(cw, ch * 3.2);
  const trackH = vertical ? Math.min(ch, trackW * 2.3) : Math.min(ch * 0.62, trackW / 2.6);
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(220)} style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,2,6,0.86)' }]} />
      <Animated.View entering={FadeInDown.duration(320)} exiting={FadeOutDown.duration(220)} style={{ flex: 1 }}>
        {/* tabs */}
        <View style={[styles.head, { height: head, paddingHorizontal: pad }]}>
          <View style={styles.tabs}>
            {(['table', 'zones'] as const).map((m) => {
              const on = m === mode;
              return (
                <PressableScale key={m} onPress={() => onMode(m)} feedback="select" scaleTo={0.95} accessibilityLabel={t(`play.rl.${m}`)} style={[styles.tab, on && styles.tabOn]}>
                  {on ? <LinearGradient colors={['#FFB938', '#FF5A1F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
                  <T weight="display" style={{ color: on ? '#2A0800' : '#FFE3B0', fontSize: 13 }}>{m === 'table' ? '🎯 ' : '🔥 '}{t(`play.rl.${m}`)}</T>
                </PressableScale>
              );
            })}
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>{center}</View>
          <PressableScale onPress={onClose} accessibilityLabel={t('common.close')} hitSlop={8} style={styles.close}>
            <Icon name="close" size={18} color="#FFE3B0" />
          </PressableScale>
        </View>
        <View style={{ flex: 1, paddingHorizontal: pad, alignItems: 'center', justifyContent: 'center' }}>
          {mode === 'table' ? (
            <TableBoard w={cw} h={ch} vertical={vertical} bets={bets} confirmed={confirmed} chip={chip} onAdd={(l) => onAdd(l)} last={last} disabled={disabled} />
          ) : (
            <View style={{ flexDirection: vertical ? 'row' : 'column', gap: vertical ? 10 : 14, alignItems: 'center', justifyContent: 'center', width: cw, height: ch }}>
              <RaceTrack w={trackW} h={trackH} vertical={vertical} chip={chip} k={k} onAdd={onAdd} disabled={disabled} bets={bets} />
              <View style={{ flex: vertical ? 1 : undefined, gap: 8, flexDirection: vertical ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'center', alignSelf: vertical ? 'stretch' : 'center', paddingVertical: vertical ? 4 : 0 }}>
                {ZONES.map((z, i) => (
                  <Animated.View key={z.id} entering={FadeInDown.delay(80 + i * 60)} style={vertical ? { flex: 1, minHeight: 0 } : { width: Math.min(220, (cw - 30) / 4) }}>
                    <PressableScale onPress={() => !disabled && onAdd(CALL_BETS[z.id].map((x) => ({ bet: x.bet, amount: chip * x.chips })), t(`play.rl.${z.id === 'zero' ? 'zeroGame' : z.id}`))} disabled={disabled} feedback="select" scaleTo={0.96} accessibilityLabel={`${t(`play.rl.${z.id === 'zero' ? 'zeroGame' : z.id}`)} · ${callChips(z.id) * chip}`} style={[styles.zone, vertical && { flex: 1, minHeight: 0, paddingVertical: 4, gap: 2 }]}>
                      <LinearGradient colors={z.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                      <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <T style={{ fontSize: 16 }}>{z.icon}</T>
                        <T weight="display" numberOfLines={1} style={{ color: '#fff', fontSize: 13, flexShrink: 1 }}>{t(`play.rl.${z.id === 'zero' ? 'zeroGame' : z.id}`)}</T>
                      </View>
                      {vertical ? null : (
                        <View style={styles.dots}>
                          {callNumbers(z.id).slice(0, 17).map((n) => <View key={n} style={[styles.dot, { backgroundColor: numColor(n) }]} />)}
                        </View>
                      )}
                      <T weight="displaySemi" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11 }}>{t('play.rl.zoneCost', { n: callNumbers(z.id).length, chips: callChips(z.id), amount: callChips(z.id) * chip })}</T>
                    </PressableScale>
                  </Animated.View>
                ))}
                {/* neighbours: how many on each side when a number of the track is tapped */}
                <View style={[styles.neigh, vertical ? { minHeight: 42 } : { width: Math.min(360, cw * 0.4) }]}>
                  <T weight="displaySemi" style={{ color: '#FFE3B0', fontSize: 11.5, flex: 1 }} numberOfLines={2}>{t('play.rl.neighbours', { k })}</T>
                  <PressableScale onPress={() => setK((x) => Math.max(1, x - 1))} accessibilityLabel="−" style={styles.step}><T weight="display" style={{ color: '#fff' }}>−</T></PressableScale>
                  <T weight="display" tabular style={{ color: '#FFD06B', fontSize: 16, minWidth: 14, textAlign: 'center' }}>{k}</T>
                  <PressableScale onPress={() => setK((x) => Math.min(4, x + 1))} accessibilityLabel="+" style={styles.step}><T weight="display" style={{ color: '#fff' }}>+</T></PressableScale>
                </View>
              </View>
            </View>
          )}
        </View>
        {footer ? <View style={[styles.foot, { height: foot, paddingHorizontal: pad }]}>{footer}</View> : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabs: { flexDirection: 'row', gap: 6, padding: 3, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,185,56,0.35)' },
  tab: { height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tabOn: { shadowColor: '#FF6A1F', shadowOpacity: 0.8, shadowRadius: 10 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,185,56,0.35)' },
  zone: { minHeight: 64, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, gap: 4, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,229,138,0.6)', justifyContent: 'center' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)' },
  neigh: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, minHeight: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,185,56,0.3)' },
  step: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
