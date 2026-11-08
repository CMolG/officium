/**
 * The browser's IndexedDB, as much as the board's copy needs: one database, two object stores,
 * and a read-modify-write in one transaction. No library: the platform API is enough (JAVA-1575).
 *
 * The database name carries the schema version, so a copy written by another version is never
 * read: once this version opens, the other board databases are deleted, so none stays on the
 * device. Every call rejects when storage is unavailable (no `indexedDB`, a private window, a
 * blocked or full origin) and the caller falls back to a full load.
 */
export const BOARD_STORE_SCHEMA = 1;

const DB_PREFIX = "officium-board-";
const DB_NAME = `${DB_PREFIX}${BOARD_STORE_SCHEMA}`;
const STORES = ["cards", "meta"] as const;
export type BoardStoreName = (typeof STORES)[number];

let opening: Promise<IDBDatabase> | null = null;

/** Deletes the board databases of the other schema versions; a failure leaves them for the next visit. */
async function dropOtherVersions(): Promise<void> {
  if (typeof indexedDB.databases !== "function") return;
  for (const { name } of await indexedDB.databases()) {
    if (name?.startsWith(DB_PREFIX) && name !== DB_NAME) indexedDB.deleteDatabase(name);
  }
}

function open(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      for (const store of STORES) request.result.createObjectStore(store);
    };
    // Another tab still holds the old version open: the upgrade waits, and this open is refused.
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another tab"));
    request.onsuccess = () => {
      // A newer version of this app wants to upgrade: close ours, and the next call opens again.
      request.result.onversionchange = () => {
        request.result.close();
        opening = null;
      };
      resolve(request.result);
      void dropOtherVersions().catch(() => {});
    };
    request.onerror = () => reject(request.error);
  });
  // A failed open is not remembered: the next call asks again.
  opening.catch(() => {
    opening = null;
  });
  return opening;
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function idbGet<T>(store: BoardStoreName, key: string): Promise<T | undefined> {
  const tx = (await open()).transaction(store, "readonly");
  const request = tx.objectStore(store).get(key);
  await finished(tx);
  return request.result as T | undefined;
}

/**
 * Reads the record, lets `update` decide, and writes what it returns, all in one transaction, so a
 * second tab cannot slip a write in between. `update` returning `undefined` writes nothing.
 */
export async function idbUpdate<T>(store: BoardStoreName, key: string, update: (current: T | undefined) => T | undefined): Promise<void> {
  const tx = (await open()).transaction(store, "readwrite");
  const objects = tx.objectStore(store);
  const current = objects.get(key);
  current.onsuccess = () => {
    const next = update(current.result as T | undefined);
    if (next !== undefined) objects.put(next, key);
  };
  await finished(tx);
}

export async function idbClear(store: BoardStoreName): Promise<void> {
  const tx = (await open()).transaction(store, "readwrite");
  tx.objectStore(store).clear();
  await finished(tx);
}

/** Deletes every record whose key `test` accepts, in one transaction. */
export async function idbDeleteWhere(store: BoardStoreName, test: (key: string) => boolean): Promise<void> {
  const tx = (await open()).transaction(store, "readwrite");
  const cursor = tx.objectStore(store).openCursor();
  cursor.onsuccess = () => {
    const at = cursor.result;
    if (!at) return;
    if (test(String(at.key))) at.delete();
    at.continue();
  };
  await finished(tx);
}
