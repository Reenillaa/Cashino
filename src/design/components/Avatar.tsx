import { frameById, premiumAvatar, titleById } from '@/features/shop/items';
import { BOT_STYLES, BotPortrait } from './BotPortrait';
import { useCosmetics } from '@/state/cosmetics';
import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gameArt } from '../tokens';

/** Friendly emoji characters (Offsuit-style personality). id = "a0".."a23". */
const FACES = ['😎', '🤠', '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🐨', '🐻', '🐰', '🐶', '🐱', '🦄', '🐙', '🐧', '👵', '👴', '🧔', '👩‍🦰', '🧑‍🎤', '🥸', '🤓', '👻'];
const BACKS = Object.values(gameArt).map((a) => a.colors);
export const AVATAR_COUNT = FACES.length;

export function Avatar({ id = 'a0', size = 44, bot, botStyle, ring, frame }: { id?: string; size?: number; bot?: boolean; /** Poker bots: their playing style picks an illustrated portrait. */ botStyle?: string; ring?: string; frame?: string | null }) {
  if (bot && botStyle && (BOT_STYLES as readonly string[]).includes(botStyle)) {
    return (
      <View accessibilityLabel="Bot" style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: ring ? 2.5 : 0, borderColor: ring }}>
        <BotPortrait style={botStyle} size={size - (ring ? 5 : 0)} />
      </View>
    );
  }
  const f = frameById(frame ?? null);
  if (f) {
    const pad = Math.max(3, size * 0.07);
    return (
      <View style={{ width: size + pad * 2, height: size + pad * 2, borderRadius: size, padding: pad, shadowColor: f.glow, shadowOpacity: 1, shadowRadius: size * 0.18, shadowOffset: { width: 0, height: 0 } }}>
        <LinearGradient colors={f.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: size }} />
        <Avatar id={id} size={size} bot={bot} ring={ring} />
      </View>
    );
  }
  const premium = !bot ? premiumAvatar(id) : undefined;
  if (premium) {
    return (
      <View accessibilityLabel={premium.name.es} style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: Math.max(2, size * 0.05), borderColor: ring ?? '#FFD06B', alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={premium.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        <Text style={{ fontSize: size * 0.52, lineHeight: size * 0.66 }} accessible={false}>{premium.emoji}</Text>
      </View>
    );
  }
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

/** The player's own avatar: a premium one from the shop if equipped, else the profile one. */
export function useMyAvatar(profileAvatar?: string | null): string {
  const premium = useCosmetics((st) => st.equipped.avatar);
  return premium ?? profileAvatar ?? 'a3';
}

export function useMyFrame(): string | null {
  return useCosmetics((st) => st.equipped.frame);
}
export function useMyTitle(lang: 'es' | 'en'): { text: string; color: string } | null {
  const id = useCosmetics((st) => st.equipped.title);
  const item = titleById(id);
  return item ? { text: item.name[lang], color: item.color } : null;
}

/** A title pill like "High Roller". */
export function TitleBadge({ title, color }: { title: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 12, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: color, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: 12, letterSpacing: 0.6 }}>{title.toUpperCase()}</Text>
    </View>
  );
}
