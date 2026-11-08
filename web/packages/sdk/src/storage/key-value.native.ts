/**
 * Android's key-value adapter: react-native-mmkv 4 (JAVA-1126). Cold read of the 39 first-render keys in
 * 3 ms against 12 ms for expo-sqlite with a preloaded Map. Needs a dev build: Expo Go has no MMKV.
 * Fallback if it ever has to go: expo-sqlite with the table preloaded into a Map at `synchronous=NORMAL`.
 */
import { createMMKV } from "react-native-mmkv";
import type { KeyValueStore } from "./types.ts";

export { createMemoryKeyValueStore, keyValueFromWebStorage } from "./key-value.ts";

/** `id` names the MMKV file; use one per app so a backup export reads only that app's keys. */
export function createKeyValueStore(id = "default"): KeyValueStore {
  const mmkv = createMMKV({ id });
  return {
    getItem: (key) => mmkv.getString(key) ?? null,
    setItem: (key, value) => mmkv.set(key, value),
    removeItem: (key) => void mmkv.remove(key),
    keys: () => mmkv.getAllKeys(),
  };
}
