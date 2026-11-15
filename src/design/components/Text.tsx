import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { type as typeScale, type TypeVariant } from '../tokens';
import { useTheme } from '../theme';

export interface TProps extends TextProps {
  variant?: TypeVariant;
  color?: 'text' | 'text2' | 'text3' | 'win' | 'loss' | 'warn' | 'info' | 'onPrimary' | string;
  align?: TextStyle['textAlign'];
  weight?: 'light' | 'regular' | 'medium' | 'semibold';
  tabular?: boolean;
}

const WEIGHT: Record<NonNullable<TProps['weight']>, string> = {
  light: 'Geist_300Light',
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
};

export function T({ variant = 'body', color = 'text', align, weight, tabular, style, ...rest }: TProps) {
  const { c } = useTheme();
  const col = (c as unknown as Record<string, string>)[color] ?? color;
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        typeScale[variant],
        { color: col },
        align ? { textAlign: align } : null,
        weight ? { fontFamily: WEIGHT[weight] } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
