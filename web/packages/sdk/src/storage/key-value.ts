import type { KeyValueStore } from "./types.ts";

/** In-memory store: the fallback where `localStorage` is missing or blocked, and the tests' double. */
export function createMemoryKeyValueStore(initial: Record<string, string> = {}): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    keys: () => [...map.keys()],
  };
}

/** Wraps a Web Storage object, so a call site's keys and values reach it untouched. */
export function keyValueFromWebStorage(storage: Storage): KeyValueStore {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
    keys: () =>
      Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => k !== null),
  };
}

/**
 * The web adapter IS `localStorage`. `id` is ignored here: the web keeps its keys in the one origin-wide
 * namespace they have always lived in. On Android it names the MMKV file.
 */
export function createKeyValueStore(_id = "default"): KeyValueStore {
  try {
    if (typeof localStorage !== "undefined") return keyValueFromWebStorage(localStorage);
  } catch {
    // Safari private mode and blocked cookies throw on access.
  }
  return createMemoryKeyValueStore();
}
