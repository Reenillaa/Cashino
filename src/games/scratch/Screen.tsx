import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { AnimatedNumber, Button, IconButton, PressableScale, Sheet, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { SCRATCH, SCRATCH_CARDS, scratchHit, type ScratchCardId, type ScratchResult } from '@/engine/games/scratch.ts';
import { roomById } from '@/engine/meta/rooms.ts';
import { useGameSession } from '@/features/play/session';
import { useRooms } from '@/features/play/rooms';
import { RULES } from '@/games/rules';
import { useBigWin } from '../lineslot/BigWin';
import { ResultBanner } from '../shared/ResultBanner';
import { usePlayErrors, useResult } from '../shared/hooks';
import { Ticket } from './Ticket';
import { amount } from './geometry';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

export const isCard = (x: unknown): x is ScratchCardId => SCRATCH_CARDS.includes(x as ScratchCardId);
const top = (c: ScratchCardId) => SCRATCH[c].prizes[SCRATCH[c].prizes.length - 1][0];

/** Ink stamp pressed on the ticket at the end. */
function Stamp({ win, text }: { win: boolean; text: string }) {
  const col = win ? '#D8203A' : '#5A5A6A';
  return (
    <Animated.View entering={ZoomIn.springify().damping(9)} exiting={FadeOut} pointerEvents="none" style={[styles.stamp, { transform: [{ rotate: '-12deg' }] }]}>
      <Svg width={230} height={92} viewBox="0 0 230 92">
        <Rect x={4} y={4} width={222} height={84} rx={14} fill="rgba(255,255,255,0.86)" stroke={col} strokeWidth={5} />
        <Rect x={12} y={12} width={206} height={68} rx={9} fill="none" stroke={col} strokeWidth={1.6} strokeDasharray="4 3" />
        <SvgText x={115} y={44} fontSize={win ? 27 : 22} fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" textAnchor="middle" fill={col} letterSpacing={2}>{win ? '¡PREMIADO!' : 'SIN PREMIO'}</SvgText>
        <SvgText x={115} y={70} fontSize={17} fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" textAnchor="middle" fill={col}>{text}</SvgText>
        <Path d="M30 20 L40 24 M190 70 L204 66" stroke={col} strokeWidth={2} opacity={0.5} />
      </Svg>
    </Animated.View>
  );
}

type Phase = 'shop' | 'scratch' | 'done';

export default function ScratchScreen() {
  const { t, lang } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ card?: string }>();
  const [card, setCard] = useState<ScratchCardId>(isCard(params.card) ? params.card : 'tapas');
  const s = useGameSession('scratch');
  const [phase, setPhase] = useState<Phase>('shop');
  const [res, setRes] = useState<ScratchResult | null>(null);
  const [serial, setSerial] = useState('00-000000');
  const [all, setAll] = useState(0);
  const [box, setBox] = useState({ w: 360, h: 520 });
  const [rules, setRules] = useState(false);
  const { result, show, clear } = useResult();
  const big = useBigWin('coin');
  const onError = usePlayErrors();
  const price = SCRATCH[card].price;

  // tickets are always bought with real chips at their fixed price
  useEffect(() => {
    const cur = useRooms.getState().byGame.scratch;
    if (!cur || roomById(cur)?.practice) useRooms.getState().choose('scratch', 'r1');
  }, []);

  const buy = async () => {
    try {
      clear();
      haptic.medium();
      const r = await s.op('play', { card });
      const v = r.view as unknown as ScratchResult;
      sfx('card');
      setRes(v);
      setSerial(`${String(SCRATCH_CARDS.indexOf(card) + 1).padStart(2, '0')}-${String(Date.now() % 1000000).padStart(6, '0')}`);
      setPhase('scratch');
    } catch (e) {
      onError(e);
    }
  };

  const finished = async () => {
    if (!res) return;
    setPhase('done');
    await big.celebrate(res.multiplier, res.payout);
    show({ bet: res.price, payout: res.payout, multiplier: res.multiplier || undefined });
  };

  const pick = (k: ScratchCardId) => {
    if (phase === 'scratch') return;
    setCard(k);
    setPhase('shop');
    setRes(null);
    clear();
    sfx('chip', 0.5);
  };

  const tw = Math.max(200, Math.min(box.w - 24, (box.h - 12) * (300 / 440), 420));
  const howTo = t(`scratch.how.${card}`);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 6 }}>
      <View style={styles.header}>
        <IconButton icon="chevronLeft" onPress={() => (router.canGoBack() ? router.back() : router.replace('/shop'))} label={t('common.back')} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T variant="callout" weight="semibold">🎟️ {t('scratch.title')}</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <AnimatedNumber value={s.balance} variant="footnote" weight="semibold" color={s.mode === 'practice' ? 'text2' : 'win'} />
            <T variant="footnote" color="text3">{t('common.coins')}</T>
          </View>
        </View>
        <IconButton icon="info" onPress={() => setRules(true)} label={t('tutorial.help')} />
      </View>
      {/* ticket picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
        {SCRATCH_CARDS.map((k) => {
          const on = k === card;
          return (
            <PressableScale key={k} onPress={() => pick(k)} disabled={phase === 'scratch'} scaleTo={0.94} feedback="none" accessibilityLabel={`${t(`scratch.names.${k}`)} · ${SCRATCH[k].price}`} style={[styles.pick, { backgroundColor: on ? 'rgba(255,208,107,0.16)' : c.surface1, borderColor: on ? '#FFD06B' : 'transparent', opacity: phase === 'scratch' && !on ? 0.4 : 1 }]}>
              <T weight="displaySemi" numberOfLines={1} style={{ fontSize: 12, color: on ? '#FFD06B' : c.text }}>{t(`scratch.names.${k}`)}</T>
              <T variant="caption" color="text3">{amount(SCRATCH[k].price)} 🪙</T>
            </PressableScale>
          );
        })}
      </ScrollView>
      <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <View>
          <Ticket
            key={`${card}-${serial}-${phase === 'shop' ? 'new' : 'bought'}`}
            card={card}
            width={tw}
            layout={phase === 'shop' ? null : res?.layout}
            live={phase === 'scratch'}
            revealAll={all}
            ticketKey={`${card}-${serial}`}
            serial={serial}
            howTo={howTo}
            showWins={phase === 'done'}
            onDone={finished}
          />
          {phase === 'done' && res ? <Stamp win={res.payout > 0} text={res.payout > 0 ? `+${amount(res.payout)} 🪙` : t('scratch.again')} /> : null}
        </View>
        <ResultBanner result={result} compact />
        {big.node}
      </View>
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {phase === 'scratch' ? (
          <Animated.View entering={FadeIn}><T weight="displaySemi" align="center" style={{ color: '#FFD06B', fontSize: 12 }}>👆 {t('scratch.hint')}</T></Animated.View>
        ) : <T variant="caption" color="text3" align="center">
          {t('scratch.odds', { top: amount(top(card) * price), p: `1/${(1 / scratchHit(card)).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 })}` })}
        </T>}
        {phase === 'scratch' ? (
          <Button kind="secondary" title={`✨ ${t('scratch.all')}`} onPress={() => setAll((n) => n + 1)} />
        ) : (
          <Button title={phase === 'done' ? t('scratch.buyAgain', { price: amount(price) }) : t('scratch.buy', { price: amount(price) })} onPress={buy} loading={s.busy} disabled={price > s.balance} />
        )}
        {price > s.balance && phase !== 'scratch' ? <T variant="caption" color="warn" align="center">{t('shop.notEnough')}</T> : null}
      </View>
      <Sheet visible={rules} onClose={() => setRules(false)} title={t('scratch.title')}>
        <View style={{ gap: 10 }}>
          <T variant="body">{RULES.scratch.summary[lang]}</T>
          {RULES.scratch.rules.map((r, i) => <T key={i} variant="footnote" color="text2">• {r[lang]}</T>)}
          <T variant="footnote" color="text3">{t('scratch.noCap')}</T>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  pick: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 2, alignItems: 'center', minWidth: 92 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  stamp: { position: 'absolute', left: 0, right: 0, top: '38%', alignItems: 'center' },
  controls: { paddingHorizontal: 16, gap: 8, paddingTop: 6 },
});
