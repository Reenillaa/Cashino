// Installs a synchronous localStorage on iOS/Android (SQLite-backed). No-op on web.
import 'expo-sqlite/localStorage/install';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

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
export const persistStorage = createJSONStorage(() => kv);
export const STORAGE_PREFIX = 'ti.v1.';
