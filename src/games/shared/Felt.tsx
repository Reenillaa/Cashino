import { useCosmetics } from '@/state/cosmetics';
import { feltById } from '@/features/shop/items';
import Svg, { Circle, Defs, Ellipse, G, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '@/design/components';

const RIM = ['#FFE58A', '#C98B12', '#7A4E08'] as const;
const LEATHER = ['#4A2A1E', '#24120C', '#3A1E14'] as const;

/** Felt texture, centre light, printed gold arcs and the house emblem, sized to the table. */
function FeltPrint({ w, h, shape, colors }: { w: number; h: number; shape: 'arc' | 'oval' | 'table'; colors: [string, string] }) {
  const u = `fp${shape}${colors[0].slice(1)}`;
  const arcs = shape !== 'oval';
  return (
    <Svg pointerEvents="none" width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={`${u}lt`} cx="0.5" cy={arcs ? '0.35' : '0.5'} r="0.65">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.42} />
        </RadialGradient>
        <Pattern id={`${u}nz`} width="5" height="5" patternUnits="userSpaceOnUse">
          <Rect x="0.5" y="0.5" width="1" height="1" fill="#FFFFFF" opacity={0.05} />
          <Rect x="3" y="2.5" width="1" height="1" fill="#000000" opacity={0.08} />
          <Rect x="1.5" y="3.8" width="0.8" height="0.8" fill="#FFFFFF" opacity={0.04} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${u}nz)`} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${u}lt)`} />
      {arcs ? (
        <G opacity={0.55}>
          {/* printed arcs like a real blackjack / baccarat layout */}
          <Path d={`M${w * 0.08} ${h * 0.5} Q${w / 2} ${h * 1.02} ${w * 0.92} ${h * 0.5}`} stroke="#FFE58A" strokeWidth={1.4} fill="none" />
          <Path d={`M${w * 0.14} ${h * 0.44} Q${w / 2} ${h * 0.9} ${w * 0.86} ${h * 0.44}`} stroke="#FFE58A" strokeWidth={0.8} strokeDasharray="5 4" fill="none" />
        </G>
      ) : (
        <G opacity={0.45}>
          <Ellipse cx={w / 2} cy={h / 2} rx={w * 0.4} ry={h * 0.32} stroke="#FFE58A" strokeWidth={1.2} fill="none" />
          <Ellipse cx={w / 2} cy={h / 2} rx={w * 0.37} ry={h * 0.28} stroke="#FFE58A" strokeWidth={0.6} strokeDasharray="4 4" fill="none" />
        </G>
      )}
      {/* house emblem, printed faintly on the cloth */}
      <G opacity={0.16} transform={`translate(${w / 2} ${arcs ? h * 0.2 : h / 2})`}>
        <Circle r={16} fill="none" stroke="#FFFFFF" strokeWidth={2} />
        <Circle r={11} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeDasharray="3 3" />
        <Path d="M4 -4 A6 6 0 1 0 4 4" stroke="#FFFFFF" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/**
 * Casino table: a padded leather rail with stitching and a gold trim, cloth with texture, a centre light
 * and printed gold markings. `arc` is the blackjack/baccarat half-moon (flat edge at the top, round edge
 * towards the player); `oval` is the poker table; `table` a rounded rectangle.
 * Without `colors` (or with `themed`) it uses the felt equipped in the shop.
 */
export function Felt({ shape = 'arc', colors: given, themed, label, style, children }: { shape?: 'arc' | 'oval' | 'table'; colors?: [string, string]; themed?: boolean; label?: string; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const feltId = useCosmetics((st) => st.equipped.felt);
  const colors: [string, string] = (themed || !given) && feltId !== 'green' ? feltById(feltId).colors : given ?? ['#14905F', '#075239'];
  const [box, setBox] = React.useState<{ w: number; h: number } | null>(null);
  const round = shape === 'oval' ? { borderRadius: 999 } : shape === 'table' ? { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 90, borderBottomRightRadius: 90 } : { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 999, borderBottomRightRadius: 999 };
  return (
    <View style={[{ padding: 3 }, round, styles.shadow, style]}>
      {/* gold outer moulding */}
      <LinearGradient colors={RIM} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, round]} />
      {/* padded leather rail with stitching */}
      <View style={[{ flex: 1, padding: 9 }, round]}>
        <LinearGradient colors={LEATHER} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[StyleSheet.absoluteFill, round]} />
        <LinearGradient colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.25 }} style={[StyleSheet.absoluteFill, round]} />
        <View pointerEvents="none" style={[styles.stitch, round]} />
        {/* inner gold trim, then the cloth */}
        <View style={[{ flex: 1, padding: 1.5 }, round]}>
          <LinearGradient colors={RIM} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[StyleSheet.absoluteFill, round]} />
          <View style={[styles.felt, round]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <LinearGradient colors={colors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            {box ? <FeltPrint w={box.w} h={box.h} shape={shape} colors={colors} /> : null}
            {label ? (
              <View pointerEvents="none" style={styles.label}>
                <T weight="displaySemi" align="center" style={{ color: 'rgba(255,229,138,0.6)', fontSize: 9.5, letterSpacing: 1.2 }}>{label.toUpperCase()}</T>
              </View>
            ) : null}
            {children}
          </View>
        </View>
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
  stitch: { position: 'absolute', left: 4, top: 4, right: 4, bottom: 4, borderWidth: 1, borderColor: 'rgba(255,229,138,0.35)', borderStyle: 'dashed' },
  label: { position: 'absolute', left: 30, right: 30, top: '71%' },
});
