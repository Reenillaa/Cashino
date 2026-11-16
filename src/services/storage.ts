// Installs a synchronous localStorage on iOS/Android (SQLite-backed). No-op on web.
import 'expo-sqlite/localStorage/install';
import { AppState, Platform } from 'react-native';
import type { PersistStorage, StateStorage, StorageValue } from 'zustand/middleware';

const memory = new Map<string, string>();
const fallback: StateStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

function backend(): StateStorage {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (ls) {
      return {
        getItem: (k) => ls.getItem(k),
        setItem: (k, v) => ls.setItem(k, v),
        removeItem: (k) => ls.removeItem(k),
      };
    }
  } catch {
    // storage unavailable (private mode, tests) → memory
  }
  return fallback;
}

export const kv = backend();
/**
 * Persisted stores, written in batches: each change is kept in memory and saved half a second later in
 * one go (a round used to re-serialise the wallet and progress on every state change, a visible stutter on
 * phones). Everything pending is written at once when the app goes to the background or the page closes.
 */
const pending = new Map<string, unknown>();
let timer: ReturnType<typeof setTimeout> | null = null;
export function flushStorage() {
  if (timer) clearTimeout(timer);
  timer = null;
  for (const [k, v] of pending) {
    try {
      kv.setItem(k, JSON.stringify(v));
    } catch {
      // storage full or unavailable: keep the app running
    }
  }
  pending.clear();
}
export const persistStorage: PersistStorage<any> = {
  getItem: (name) => {
    if (pending.has(name)) return pending.get(name) as StorageValue<unknown>;
    const raw = kv.getItem(name) as string | null;
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    pending.set(name, value);
    if (!timer) timer = setTimeout(flushStorage, 500);
  },
  removeItem: (name) => {
    pending.delete(name);
    kv.removeItem(name);
  },
};
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushStorage);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushStorage());
} else {
  AppState.addEventListener('change', (s) => s !== 'active' && flushStorage());
}
export const STORAGE_PREFIX = 'ti.v1.';
