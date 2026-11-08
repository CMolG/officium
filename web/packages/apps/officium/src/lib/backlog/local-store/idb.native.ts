/**
 * The Android twin of `idb.ts` (JAVA-1575, `rules/native-portability.md`): the app has no
 * IndexedDB, and `repository.persistent` is false there, so nothing reads the copy. Every read finds
 * nothing and every write is dropped, which is the full load the board already does on native.
 */
export const BOARD_STORE_SCHEMA = 1;

export type BoardStoreName = "cards" | "meta";

export async function idbGet<T>(_store: BoardStoreName, _key: string): Promise<T | undefined> {
  return undefined;
}

export async function idbUpdate<T>(_store: BoardStoreName, _key: string, _update: (current: T | undefined) => T | undefined): Promise<void> {}

export async function idbClear(_store: BoardStoreName): Promise<void> {}

export async function idbDeleteWhere(_store: BoardStoreName, _test: (key: string) => boolean): Promise<void> {}
