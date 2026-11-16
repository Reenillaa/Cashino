import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { distanceFit, goingFit, oddsFor, type BetType, type Horse, type RaceCard } from '@/engine/games/horses.ts';
import { GOING_ICON, Saddle, Silks } from './Art';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';

const fmtOdds = (x: number) => x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formColor = (p: number) => (p === 1 ? '#FFD06B' : p <= 3 ? '#5BE3B0' : 'rgba(255,255,255,0.22)');

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <T variant="caption" color="text2" style={{ width: 74 }}>{label}</T>
      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(4, ((value - 40) / 60) * 100)}%`, backgroundColor: color }]} /></View>
      <T weight="displaySemi" tabular style={{ width: 26, fontSize: 12, color: '#fff', textAlign: 'right' }}>{value}</T>
    </View>
  );
}

/**
 * The race card: every runner with what a punter studies. Tap the number to back a horse (the order of
 * taps is the order for exactas and trifectas); tap the row to open its full profile.
 */
export function RaceCardView({ card, betType, picks, onPick }: { card: RaceCard; betType: BetType; picks: number[]; onPick: (n: number) => void }) {
  const { t } = useT();
  const { c } = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  const oddsType: BetType = betType === 'place' ? 'place' : 'win';
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T weight="display" numberOfLines={1} style={{ color: '#fff', fontSize: 17 }}>{card.race}</T>
          <T variant="footnote" color="text2">{card.distance} m · {GOING_ICON[card.going]} {t(`play.going.${card.going}`)} · {card.horses.length} {t('play.runners')}</T>
        </View>
        <View style={styles.oddsHead}><T variant="caption" color="text3">{t(`play.betTypes.${oddsType}`)}</T></View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {card.horses.map((h, k) => {
          const order = picks.indexOf(h.n);
          const isOpen = open === h.n;
          const gFit = goingFit(h, card.going) === 1;
          const dFit = distanceFit(h, card.distance) === 1;
          return (
            <Animated.View key={h.n} entering={FadeInDown.delay(k * 45)} style={[styles.row, { backgroundColor: c.surface1, borderColor: order >= 0 ? '#FFD06B' : 'transparent' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {k === 0 ? (
                  <TutorialTarget id="horses:pick">
                    <SaddleButton h={h} order={order} onPick={onPick} label={t('play.backHorse', { name: h.name })} />
                  </TutorialTarget>
                ) : <SaddleButton h={h} order={order} onPick={onPick} label={t('play.backHorse', { name: h.name })} />}
                <PressableScale onPress={() => setOpen(isOpen ? null : h.n)} feedback="select" scaleTo={0.98} accessibilityLabel={`${h.name}, ${t('play.profile')}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Silks colors={h.silks} size={26} />
                  <View style={{ flex: 1 }}>
                    <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff', fontSize: 15 }}>{h.name}</T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      {h.form.map((p, i) => (
                        <View key={i} style={[styles.formDot, { backgroundColor: formColor(p) }]}>
                          <T style={{ fontSize: 9, color: p <= 3 ? '#231A3A' : '#fff', fontWeight: '800' }}>{p}</T>
                        </View>
                      ))}
                      {gFit ? <View style={styles.tag}><T style={styles.tagText}>{GOING_ICON[card.going]}✓</T></View> : null}
                      {dFit ? <View style={styles.tag}><T style={styles.tagText}>{card.distance}✓</T></View> : null}
                    </View>
                  </View>
                  <T weight="display" tabular style={{ color: '#FFD06B', fontSize: 20 }}>{fmtOdds(oddsFor(card, oddsType, [h.n]))}</T>
                </PressableScale>
              </View>
              {isOpen ? (
                <Animated.View entering={FadeIn} style={{ marginTop: 10, gap: 6 }}>
                  <Bar label={t('play.stat.speed')} value={h.speed} color="#FF4FA3" />
                  <Bar label={t('play.stat.stamina')} value={h.stamina} color="#5BE3B0" />
                  <Bar label={t('play.stat.accel')} value={h.accel} color="#FFB938" />
                  <Bar label={t('play.stat.jockey')} value={h.jockey.skill} color="#A996FF" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    <Chip text={`🏃 ${t(`play.style.${h.style}`)}`} />
                    <Chip text={`${GOING_ICON[h.likesGoing]} ${t('play.likes')} ${t(`play.going.${h.likesGoing}`).toLowerCase()}`} good={gFit} />
                    <Chip text={`📏 ${t('play.bestTrip')} ${h.bestDistance} m`} good={dFit} />
                    <Chip text={`🧑 ${h.jockey.name} · ${h.age} ${t('play.years')}`} />
                  </View>
                </Animated.View>
              ) : null}
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SaddleButton({ h, order, onPick, label }: { h: Horse; order: number; onPick: (n: number) => void; label: string }) {
  return (
    <PressableScale onPress={() => onPick(h.n)} feedback="select" scaleTo={0.9} accessibilityLabel={label} style={{ alignItems: 'center' }}>
      <Saddle n={h.n} silks={h.silks} size={38} selected={order >= 0 ? order + 1 : undefined} />
      {order >= 0 ? <View style={styles.order}><T weight="display" style={{ fontSize: 10, color: '#231A3A' }}>{order + 1}º</T></View> : null}
    </PressableScale>
  );
}

function Chip({ text, good }: { text: string; good?: boolean }) {
  return (
    <View style={[styles.chip, good ? { backgroundColor: 'rgba(91,227,176,0.2)', borderColor: '#5BE3B0' } : null]}>
      <T variant="caption" style={{ color: good ? '#5BE3B0' : 'rgba(255,255,255,0.8)' }}>{text}{good ? ' ✓' : ''}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8, paddingHorizontal: 2 },
  oddsHead: { paddingBottom: 2 },
  row: { borderRadius: 18, padding: 10, borderWidth: 2 },
  formDot: { width: 16, height: 16, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 5, height: 16, borderRadius: 5, backgroundColor: 'rgba(91,227,176,0.25)', justifyContent: 'center' },
  tagText: { fontSize: 9, color: '#5BE3B0', fontWeight: '800' },
  barTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4 },
  chip: { paddingHorizontal: 8, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'transparent' },
  order: { position: 'absolute', bottom: -6, paddingHorizontal: 4, borderRadius: 6, backgroundColor: '#FFD06B' },
});
