import React, { useContext, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, TextInput, View } from 'react-native';
import { AccentContext, Icon, PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

/** A friendly step for the − / + buttons: half the room minimum (20 → 10, 200 → 100, 2000 → 1000). */
export function betStep(min: number) {
  return Math.max(1, Math.round(min / 2));
}

/**
 * Bet amount in one row, made for anyone: a big − and + around the number (tap the number to type it).
 * Integers only, always inside the room limits; + stops at the room maximum or your balance.
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
      <View style={[styles.row, { backgroundColor: c.surface2, borderColor: over ? c.loss : 'transparent' }]}>
        <Step icon="minus" label={`− ${inc}`} onPress={() => set(value - inc)} disabled={value <= min} />
        <View style={styles.center}>
          <T variant="caption" color="text3" style={{ fontSize: 11, lineHeight: 13 }}>{label ?? t('common.bet')}</T>
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
            accessibilityLabel={`${label ?? t('common.bet')} (${min}–${top})`}
            selectionColor={tint ?? c.text}
            style={[styles.input, { color: over ? c.loss : c.text }]}
          />
        </View>
        <Step icon="plus" label={`+ ${inc}`} onPress={() => set(value + inc)} disabled={value >= top} />
      </View>
      {over ? <T variant="footnote" color="loss" style={{ marginTop: 6 }}>{t('common.insufficient')}</T> : outside ? <T variant="footnote" color="warn" style={{ marginTop: 6 }}>{t('rooms.limits')} {min}–{max}</T> : null}
    </View>
  );
}

function Step({ icon, label, onPress, disabled }: { icon: 'plus' | 'minus'; label: string; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  const accent = useContext(AccentContext);
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.88} accessibilityLabel={label} style={[styles.step, { backgroundColor: c.surface3, opacity: disabled ? 0.4 : 1, overflow: 'hidden' }]}>
      {icon === 'plus' ? <LinearGradient colors={accent as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      <View>
        <Icon name={icon} size={22} color={icon === 'plus' ? '#fff' : c.text} strokeWidth={2.4} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 29, paddingHorizontal: 5, borderWidth: 1.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  input: { alignSelf: 'stretch', width: '100%', minWidth: 0, textAlign: 'center', fontFamily: 'Geist_500Medium', fontSize: 24, lineHeight: 28, padding: 0, fontVariant: ['tabular-nums'] },
  step: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
