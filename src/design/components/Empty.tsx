import React from 'react';
import { View } from 'react-native';
import { T } from './Text';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import { useTheme } from '../theme';

export function EmptyState({ icon = 'sparkles', title, body, action, onAction }: { icon?: IconName; title: string; body?: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 10 }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={26} color={c.text2} />
      </View>
      <T variant="headline" align="center">{title}</T>
      {body ? <T variant="footnote" color="text3" align="center">{body}</T> : null}
      {action && onAction ? <Button title={action} onPress={onAction} kind="secondary" size="md" style={{ marginTop: 8 }} /> : null}
    </View>
  );
}
