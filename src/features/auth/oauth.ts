import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/supabase';

export type OAuthProvider = 'apple' | 'google';

/**
 * "Continue with Apple / Google" through Supabase Auth.
 * The providers must be enabled in the Supabase dashboard (Authentication → Providers) with the
 * Apple Services ID / Google OAuth client created by the app owner, and this app's redirect URL
 * must be in Authentication → URL Configuration. No keys live in the app.
 * Returns true when a session was obtained (native) or the page is redirecting (web).
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<boolean> {
  if (!supabase) throw new Error('not_configured');
  if (Platform.OS === 'web') {
    // Full-page redirect; supabase-js picks the session up from the URL when we come back.
    const base = (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '';
    const redirectTo = `${window.location.origin}${base}/`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
    return true;
  }
  const redirectTo = Linking.createURL('auth');
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return false;
  return completeFromUrl(res.url);
}

/** Reads the tokens (implicit flow) or the code (PKCE flow) Supabase sent back and stores the session. */
export async function completeFromUrl(url: string): Promise<boolean> {
  if (!supabase) return false;
  const [, query = ''] = url.split('?');
  const [, hash = ''] = url.split('#');
  const params = new URLSearchParams(`${query.split('#')[0]}&${hash}`);
  const errorDesc = params.get('error_description');
  if (errorDesc) throw new Error(errorDesc);
  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return true;
  }
  return false;
}
