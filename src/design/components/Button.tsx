import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { Shine } from './Effects';
import { PressableScale } from './Pressable';
import { T } from './Text';
import { Icon, type IconName } from './Icon';
import { useTheme, alpha } from '../theme';
import { brand, radius } from '../tokens';

/** Colours of the big action buttons below. Games provide their own gradient; the app uses the brand one. */
export const AccentContext = React.createContext<readonly string[]>(brand.grad);

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'tinted' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  tint?: string;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  subtitle?: string;
  /** Id the guided tutorial can highlight (usually the event this button triggers). */
  spot?: string;
}

const OUTER = new Set(['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'width', 'minWidth', 'maxWidth', 'position', 'top', 'left', 'right', 'bottom']);

export function Button(props: ButtonProps) {
  if (!props.spot) return <ButtonBody {...props} />;
  // Highlightable: the wrapper takes the outer layout (flex, margins), the button keeps its look.
  const flat = (StyleSheet.flatten(props.style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {}, inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (OUTER.has(k) ? outer : inner)[k] = v;
  if (props.full) outer.alignSelf = 'stretch';
  return (
    <TutorialTarget id={props.spot} style={outer as ViewStyle}>
      <ButtonBody {...props} style={inner as ViewStyle} />
    </TutorialTarget>
  );
}

function ButtonBody({ title, onPress, kind = 'primary', size = 'lg', icon, tint, disabled, loading, full, style, accessibilityHint, subtitle }: ButtonProps) {
  const { c } = useTheme();
  const accent = React.useContext(AccentContext);
  const h = size === 'lg' ? 60 : size === 'md' ? 48 : 38;
  // Big primary buttons are the "action": vivid gradient (the game's colours inside a game), glint and display type.
  const hero = kind === 'primary' && size !== 'sm';
  const bg =
    kind === 'primary' ? c.primary : kind === 'secondary' ? c.surface2 : kind === 'tinted' ? alpha(tint ?? c.info, 0.16) : kind === 'danger' ? alpha(c.loss, 0.14) : 'transparent';
  const fg = hero ? '#FFFFFF' : kind === 'primary' ? c.onPrimary : kind === 'tinted' ? tint ?? c.info : kind === 'danger' ? c.loss : c.text;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      feedback={kind === 'primary' ? 'medium' : 'light'}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        styles.base,
        { height: subtitle ? h + 10 : h, backgroundColor: hero ? accent[0] : bg, borderRadius: radius.pill, paddingHorizontal: size === 'sm' ? 16 : 24 },
        hero && !disabled && { shadowColor: accent[accent.length - 1], shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {hero ? (
        <>
          <LinearGradient pointerEvents="none" colors={accent as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} end={{ x: 0, y: 0.6 }} style={StyleSheet.absoluteFill} />
          {!disabled && !loading ? <Shine every={4800} delay={1200} opacity={0.38} /> : null}
        </>
      ) : null}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={size === 'sm' ? 16 : 20} color={fg} />}
          <View style={{ alignItems: 'center' }}>
            <T variant={size === 'sm' ? 'footnote' : 'body'} weight={hero ? 'displaySemi' : 'semibold'} style={{ color: fg, fontSize: hero ? (size === 'lg' ? 16 : 14) : size === 'lg' ? 17 : undefined, letterSpacing: hero ? 0.2 : undefined }} numberOfLines={1}>
              {title}
            </T>
            {subtitle ? (
              <T variant="footnote" style={{ color: fg, opacity: 0.7 }} numberOfLines={1} tabular>
                {subtitle}
              </T>
            ) : null}
          </View>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
