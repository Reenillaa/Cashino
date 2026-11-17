import React, { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCosmetics } from '@/state/cosmetics';
import { backById, type CardBackItem } from '@/features/shop/items';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Card, Suit } from '@/engine/cards/cards.ts';
import { rankLabel } from '@/engine/cards/cards.ts';
import { useTheme } from '../theme';
import { CardBackSvg, CardFaceArt } from './CardArt';

const SUIT_NAME: Record<Suit, string> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };

export function SuitIcon({ suit, size, color }: { suit: Suit; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {suit === 's' && <Path fill={color} d="M12 2.5c-3.7 4.6-8 7.3-8 11.3a4.2 4.2 0 0 0 7.1 3L10 21.5h4l-1.1-4.7a4.2 4.2 0 0 0 7.1-3c0-4-4.3-6.7-8-11.3z" />}
      {suit === 'h' && <Path fill={color} d="M12 21c-5.6-4.2-9-7.4-9-11.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 9 2c0 4-3.4 7.2-9 11.4z" />}
      {suit === 'd' && <Path fill={color} d="M12 2.5 19.5 12 12 21.5 4.5 12z" />}
      {suit === 'c' && (
        <>
          <Circle cx="12" cy="7.4" r="3.9" fill={color} />
          <Circle cx="7.3" cy="13.2" r="3.9" fill={color} />
          <Circle cx="16.7" cy="13.2" r="3.9" fill={color} />
          <Path fill={color} d="M11 11h2l1.3 10.5h-4.6z" />
        </>
      )}
    </Svg>
  );
}

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const DIM: Record<CardSize, { w: number; h: number; rank: number; suit: number; r: number }> = {
  xs: { w: 34, h: 48, rank: 16, suit: 13, r: 6 },
  sm: { w: 46, h: 64, rank: 21, suit: 16, r: 8 },
  md: { w: 60, h: 84, rank: 28, suit: 22, r: 10 },
  lg: { w: 84, h: 118, rank: 40, suit: 30, r: 13 },
  xl: { w: 136, h: 190, rank: 62, suit: 48, r: 18 },
};

function Face({ card, dim }: { card: Card; size: CardSize; dim: (typeof DIM)['md'] }) {
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: dim.r, overflow: 'hidden' }]}>
      <CardFaceArt card={card} w={dim.w} h={dim.h} />
    </View>
  );
}

function Back({ dim }: { dim: (typeof DIM)['md'] }) {
  const backId = useCosmetics((st) => st.equipped.back);
  return <CardBackArt item={backById(backId)} dim={dim} />;
}

/** Draws one card-back design (used by the cards and by the shop window). */
export function CardBackArt({ item, dim }: { item: CardBackItem; dim: { w: number; h: number; r: number } }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: dim.r, overflow: 'hidden', backgroundColor: item.colors[1] }]}>
      <CardBackSvg w={dim.w} h={dim.h} colors={item.colors as [string, string]} accent={item.id === 'classic' ? '#C9C4DA' : item.accent} pattern={item.pattern} uid={`bk${u}`} />
    </View>
  );
}

/**
 * Playing card with deal-in and 3D flip animations. The card value is already decided;
 * the animation only reveals it.
 */
export function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  highlight,
  dim: dimmed,
  dealFrom = { x: 0, y: -40 },
}: {
  card?: Card | null;
  faceDown?: boolean;
  size?: CardSize;
  delay?: number;
  highlight?: string;
  dim?: boolean;
  dealFrom?: { x: number; y: number };
}) {
  const { reduceMotion, c } = useTheme();
  const d = DIM[size];
  const appear = useSharedValue(reduceMotion ? 1 : 0);
  const flip = useSharedValue(faceDown || !card ? 0 : 1);
  useEffect(() => {
    appear.set(reduceMotion ? 1 : withDelay(delay, withSpring(1, { damping: 18, stiffness: 200 })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const target = faceDown || !card ? 0 : 1;
    flip.set(reduceMotion ? target : withDelay(delay + 120, withTiming(target, { duration: 320 })));
  }, [faceDown, card, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
  const wrap = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateX: interpolate(appear.value, [0, 1], [dealFrom.x, 0]) },
      { translateY: interpolate(appear.value, [0, 1], [dealFrom.y, 0]) },
      { scale: interpolate(appear.value, [0, 1], [0.85, 1]) },
    ],
  }));
  const front = useAnimatedStyle(() => ({ opacity: flip.value > 0.5 ? 1 : 0, transform: [{ perspective: 600 }, { rotateY: `${(1 - flip.value) * 180}deg` }] }));
  const back = useAnimatedStyle(() => ({ opacity: flip.value > 0.5 ? 0 : 1, transform: [{ perspective: 600 }, { rotateY: `${-flip.value * 180}deg` }] }));
  const label = card && !faceDown ? `${rankLabel(card.rank)} ${SUIT_NAME[card.suit]}` : 'Face-down card';
  return (
    <Animated.View accessible accessibilityLabel={label} style={[{ width: d.w, height: d.h }, wrap, dimmed && { opacity: 0.4 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, back]}>
        <Back dim={d} />
      </Animated.View>
      {card ? (
        <Animated.View style={[StyleSheet.absoluteFill, front]}>
          <Face card={card} size={size} dim={d} />
        </Animated.View>
      ) : null}
      {highlight ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: d.r, borderWidth: 2, borderColor: highlight }]} /> : null}
      {!highlight && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: d.r, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairlineStrong }]} />}
    </Animated.View>
  );
}

export const CARD_DIM = DIM;
