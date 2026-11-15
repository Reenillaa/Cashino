import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gameArt } from '../tokens';

/** Friendly emoji characters (Offsuit-style personality). id = "a0".."a23". */
const FACES = ['😎', '🤠', '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🐨', '🐻', '🐰', '🐶', '🐱', '🦄', '🐙', '🐧', '👵', '👴', '🧔', '👩‍🦰', '🧑‍🎤', '🥸', '🤓', '👻'];
const BACKS = Object.values(gameArt).map((a) => a.colors);
export const AVATAR_COUNT = FACES.length;

export function Avatar({ id = 'a0', size = 44, bot, ring }: { id?: string; size?: number; bot?: boolean; ring?: string }) {
  const n = Math.abs(parseInt(id.replace(/\D/g, '') || '0', 10)) % AVATAR_COUNT;
  const colors = bot ? (['#3A3A40', '#26262B'] as [string, string]) : BACKS[(n * 5) % BACKS.length];
  return (
    <View
      accessibilityLabel={bot ? 'Bot' : undefined}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: ring ? 2 : 0, borderColor: ring, alignItems: 'center', justifyContent: 'center' }}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      <Text style={{ fontSize: size * 0.56, lineHeight: size * 0.7 }} accessible={false}>{bot ? '🤖' : FACES[n]}</Text>
    </View>
  );
}
