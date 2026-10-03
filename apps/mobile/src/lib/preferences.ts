import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Small persisted-preference helper. Uses SecureStore on native and
 * localStorage on web (SecureStore has no web implementation).
 * Failures are swallowed: preferences are a convenience, never a blocker.
 */
export async function readPreference(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writePreference(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore storage failures; the in-memory value still applies for this session.
  }
}
