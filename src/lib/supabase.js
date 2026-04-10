import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

const memoryStore = new Map();

const memoryStorage = {
  getItem: async (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
  setItem: async (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: async (key) => {
    memoryStore.delete(key);
  },
};

const webStorage = {
  getItem: async (key) => {
    if (typeof localStorage === 'undefined') return memoryStorage.getItem(key);
    return localStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (typeof localStorage === 'undefined') return memoryStorage.setItem(key, value);
    localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (typeof localStorage === 'undefined') return memoryStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};

let secureStoreAvailable;
async function isSecureStoreAvailable() {
  if (secureStoreAvailable !== undefined) return secureStoreAvailable;
  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }
  return secureStoreAvailable;
}

const nativeStorage = {
  getItem: async (key) => {
    if (await isSecureStoreAvailable()) return SecureStore.getItemAsync(key);
    return memoryStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (await isSecureStoreAvailable()) return SecureStore.setItemAsync(key, value);
    return memoryStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (await isSecureStoreAvailable()) return SecureStore.deleteItemAsync(key);
    return memoryStorage.removeItem(key);
  },
};

const storage = Platform.OS === 'web' ? webStorage : nativeStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
