import 'expo-sqlite/localStorage/install';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** null when the build has no backend configured → the app runs fully offline. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: (globalThis as { localStorage?: Storage }).localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

export const onlineConfigured = !!supabase;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export class OnlineError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

/** Calls an Edge Function and normalises errors. */
export async function callFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new OnlineError('not_configured');
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let code = 'network';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') code = ((await ctx.json()) as { error?: string }).error ?? code;
    } catch {
      // keep generic code
    }
    throw new OnlineError(code, error.message);
  }
  return data as T;
}
