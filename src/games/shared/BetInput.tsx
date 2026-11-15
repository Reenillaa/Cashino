import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Icon, PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

/** A friendly step for the − / + buttons: half the room minimum (20 → 10, 200 → 100, 2000 → 1000). */
export function betStep(min: number) {
  return Math.max(1, Math.round(min / 2));
}

/**
 * Bet amount, made for anyone: a big − / + pair around the number (tap the number to type it),
 * and two quick links for the room minimum and maximum. Integers only, always inside the room.
 */
export function BetInput({ value, onChange, balance, disabled, tint, label, min = 1, max = Number.MAX_SAFE_INTEGER, step }: { value: number; onChange: (v: number) => void; balance: number; disabled?: boolean; tint?: string; label?: string; min?: number; max?: number; step?: number }) {
  const { t } = useT();
  const { c } = useTheme();
  const [editing, setEditing] = useState<string | null>(null);
  const inc = step ?? betStep(min);
  const top = Math.max(min, Math.min(max, Math.floor(balance)));
  // Always inside the room limits; the balance can only lower the maximum.
  const clamp = (v: number) => Math.max(min, Math.min(top, Math.floor(v || min)));
  const set = (v: number) => {
    const next = clamp(v);
    if (next === value) {
      haptic.warning();
      return;
    }
    haptic.select();
    sfx('chip', 0.45);
    onChange(next);
  };
  const over = value > balance;
  const outside = value < min || value > max;
  return (
    <View style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <View style={styles.head}>
        <T variant="footnote" color="text3" style={{ flex: 1 }}>{label ?? t('common.bet')}</T>
        <Quick label={`${t('common.min')} ${min.toLocaleString('es-ES')}`} onPress={() => set(min)} />
        <Quick label={`${t('common.max')} ${top.toLocaleString('es-ES')}`} onPress={() => set(top)} />
      </View>
      <View style={[styles.row, { backgroundColor: c.surface2, borderColor: over ? c.loss : 'transparent' }]}>
        <Step icon="minus" label={`− ${inc}`} onPress={() => set(value - inc)} disabled={value <= min} />
        <TextInput
          value={editing ?? value.toLocaleString('es-ES')}
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
        <Step icon="plus" label={`+ ${inc}`} onPress={() => set(value + inc)} disabled={value >= top} />
      </View>
      {over ? <T variant="footnote" color="loss" style={{ marginTop: 6 }}>{t('common.insufficient')}</T> : outside ? <T variant="footnote" color="warn" style={{ marginTop: 6 }}>{t('rooms.limits')} {min}–{max}</T> : null}
    </View>
  );
}

function Step({ icon, label, onPress, disabled }: { icon: 'plus' | 'minus'; label: string; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.92} accessibilityLabel={label} style={[styles.step, { backgroundColor: c.surface3, opacity: disabled ? 0.4 : 1 }]}>
      <Icon name={icon} size={24} color={c.text} strokeWidth={2.2} />
    </PressableScale>
  );
}

function Quick({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} feedback="none" hitSlop={8} accessibilityLabel={label} style={[styles.quick, { backgroundColor: c.surface2 }]}>
      <T variant="footnote" weight="medium" color="text2" tabular>{label}</T>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', height: 64, borderRadius: 32, paddingHorizontal: 6, borderWidth: 1.5 },
  input: { flex: 1, minWidth: 0, width: 10, textAlign: 'center', fontFamily: 'Geist_500Medium', fontSize: 28, padding: 0, fontVariant: ['tabular-nums'] },
  step: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  quick: { height: 30, paddingHorizontal: 12, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
