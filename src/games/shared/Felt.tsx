import { useCosmetics } from '@/state/cosmetics';
import { feltById } from '@/features/shop/items';
import Svg, { Ellipse, G, Rect } from 'react-native-svg';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '@/design/components';

const RIM = ['#FFE58A', '#C98B12', '#7A4E08'] as const;

/**
 * Card-table felt with a gold rim. `arc` is the blackjack/baccarat half-moon (flat edge at the top,
 * round edge towards the player); `oval` is the poker table. A printed line of text sits on the felt.
 */
/** Table felt. Without `colors` (or with `themed`) it uses the felt equipped in the shop. */
export function Felt({ shape = 'arc', colors: given, themed, label, style, children }: { shape?: 'arc' | 'oval' | 'table'; colors?: [string, string]; themed?: boolean; label?: string; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const feltId = useCosmetics((st) => st.equipped.felt);
  const colors: [string, string] = (themed || !given) && feltId !== 'green' ? feltById(feltId).colors : given ?? ['#14905F', '#075239'];
  const round = shape === 'oval' ? { borderRadius: 999 } : shape === 'table' ? { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 90, borderBottomRightRadius: 90 } : { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 999, borderBottomRightRadius: 999 };
  return (
    <View style={[{ padding: 5 }, round, styles.shadow, style]}>
      <LinearGradient colors={RIM} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, round]} />
      <View style={[styles.felt, round]}>
        <LinearGradient colors={colors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.45 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[styles.inner, round]} />
        {label ? (
          <View pointerEvents="none" style={styles.label}>
            <T weight="displaySemi" align="center" style={{ color: 'rgba(255,229,138,0.55)', fontSize: 9.5, letterSpacing: 1.2 }}>{label.toUpperCase()}</T>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

/** A small stack of chips showing an amount on the felt (side view: clay edges with white inserts). */
export function ChipStack({ amount, color = '#FF4FA3' }: { amount: number; color?: string }) {
  if (!amount) return null;
  const n = Math.min(5, 1 + Math.floor(Math.log10(Math.max(1, amount))));
  const h = 22 + n * 5;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={40} height={h} viewBox={`0 0 40 ${h}`}>
        {Array.from({ length: n }, (_, i) => {
          const y = h - 8 - i * 5;
          const c = i === n - 1 ? color : i % 2 ? '#2A1E40' : color;
          return (
            <G key={i}>
              <Ellipse cx={20} cy={y + 2} rx={17} ry={6} fill="rgba(0,0,0,0.35)" />
              <Rect x={3} y={y - 3} width={34} height={5} fill={c} />
              {[6, 14, 22, 30].map((x) => <Rect key={x} x={x} y={y - 3} width={3} height={5} fill="#FFFFFF" opacity={0.9} />)}
              <Ellipse cx={20} cy={y + 2} rx={17} ry={6} fill="none" />
              <Ellipse cx={20} cy={y - 3} rx={17} ry={6} fill={c} stroke="rgba(255,255,255,0.5)" strokeWidth={0.8} />
              {i === n - 1 ? (
                <G>
                  <Ellipse cx={20} cy={y - 3} rx={12} ry={4} fill="none" stroke="#FFFFFF" strokeWidth={1.3} strokeDasharray="3 2.4" />
                  <Ellipse cx={20} cy={y - 3} rx={7} ry={2.4} fill="#FFFFFF" opacity={0.9} />
                </G>
              ) : null}
            </G>
          );
        })}
      </Svg>
      <T weight="displaySemi" style={{ color: '#fff', fontSize: 11, marginTop: 2 }}>{amount.toLocaleString('es-ES')}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
  felt: { flex: 1, overflow: 'hidden' },
  inner: { position: 'absolute', left: 10, top: 10, right: 10, bottom: 10, borderWidth: 1.5, borderColor: 'rgba(255,229,138,0.35)', borderStyle: 'dashed' },
  label: { position: 'absolute', left: 30, right: 30, top: '71%' },
});
