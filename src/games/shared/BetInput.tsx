import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

/** Bet amount control: editable value, ½ / 2× / max and quick presets. Integers only. */
export function BetInput({ value, onChange, balance, disabled, tint, label, min = 1, max = Number.MAX_SAFE_INTEGER }: { value: number; onChange: (v: number) => void; balance: number; disabled?: boolean; tint?: string; label?: string; min?: number; max?: number }) {
  const { t } = useT();
  const { c } = useTheme();
  const [editing, setEditing] = useState<string | null>(null);
  // Always inside the room limits; the balance can only lower the maximum.
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.max(min, Math.floor(balance)), Math.floor(v || min)));
  const set = (v: number) => {
    haptic.select();
    sfx('chip', 0.5);
    onChange(clamp(v));
  };
  const over = value > balance;
  const outside = value < min || value > max;
  return (
    <View style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <View style={styles.row}>
        <View style={[styles.field, { backgroundColor: c.surface2, borderColor: over ? c.loss : c.hairline }]}>
          <T variant="caption" color="text3" style={{ fontSize: 10 }}>{label ?? t('common.bet')}</T>
          <TextInput
            value={editing ?? String(value)}
            onFocus={() => setEditing(String(value))}
            onChangeText={(s) => setEditing(s.replace(/[^0-9]/g, '').slice(0, 9))}
            onBlur={() => {
              if (editing !== null) onChange(clamp(Number(editing)));
              setEditing(null);
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            accessibilityLabel={label ?? t('common.bet')}
            selectionColor={tint ?? c.text}
            style={[styles.input, { color: over ? c.loss : c.text }]}
          />
        </View>
        <Step label={t('common.min')} onPress={() => set(min)} c={c} />
        <Step label={t('common.half')} onPress={() => set(value / 2)} c={c} />
        <Step label={t('common.double')} onPress={() => set(value * 2)} c={c} />
        <Step label={t('common.max')} onPress={() => set(max)} c={c} />
      </View>
      {over ? <T variant="footnote" color="loss" style={{ marginTop: 6 }}>{t('common.insufficient')}</T> : outside ? <T variant="footnote" color="warn" style={{ marginTop: 6 }}>{t('rooms.limits')}: {min}–{max}</T> : null}
    </View>
  );
}

function Step({ label, onPress, c }: { label: string; onPress: () => void; c: ReturnType<typeof useTheme>['c'] }) {
  return (
    <PressableScale onPress={onPress} feedback="none" accessibilityLabel={label} style={[styles.step, { backgroundColor: c.surface2, borderColor: c.hairline }]}>
      <T variant="footnote" weight="semibold">{label}</T>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  field: { flex: 1, height: 52, borderRadius: radius.md, paddingHorizontal: 14, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  input: { fontFamily: 'GeistMono_500Medium', fontSize: 18, padding: 0, marginTop: 2 },
  step: { width: 46, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
