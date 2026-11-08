/**
 * The two storage ports (JAVA-104, library choice by JAVA-1126). Apps depend on these; each platform
 * brings its adapter: `localStorage` and memory on the web, react-native-mmkv and expo-sqlite on Android.
 */

/**
 * The Web Storage subset the call sites use. Synchronous, string values, so a `localStorage` call site
 * stays a one-line swap and keys and backup formats stay byte-identical.
 *
 * Durability: a write survives an app crash, but the last ones can be lost on a power loss (MMKV writes
 * through an mmap and never fsyncs). Do not put a write that must survive one behind this port.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

/** A field value an index can hold. Booleans are not indexable: store 0 or 1. */
export type IndexValue = string | number;

export interface IndexSpec {
  name: string;
  /** Top-level fields of the row, in order: a compound index lists several (Dexie's `[a+b]`). */
  fields: string[];
  /** Dexie's `&`. */
  unique?: boolean;
}

export interface TableSchema {
  /** Top-level field(s) holding the primary key: a compound key lists several. */
  key: string[];
  indexes?: IndexSpec[];
}

export interface IndexedSchema {
  /** The database name; it never changes once shipped, like a `localStorage` key. */
  name: string;
  version: number;
  tables: Record<string, TableSchema>;
}

export type IndexQuery =
  | { equals: IndexValue | IndexValue[] }
  | { between: [IndexValue | IndexValue[], IndexValue | IndexValue[]] };

export interface WhereOptions {
  /** Reverses the index order. Results come in index order, then primary key order. */
  reverse?: boolean;
  limit?: number;
}

export type Row = Record<string, unknown>;

export interface IndexedTransaction {
  get<T extends Row = Row>(table: string, key: IndexValue | IndexValue[]): Promise<T | null>;
  bulkPut(table: string, rows: Row[]): Promise<void>;
  delete(table: string, key: IndexValue | IndexValue[]): Promise<void>;
  where<T extends Row = Row>(
    table: string,
    index: string,
    query: IndexQuery,
    options?: WhereOptions,
  ): Promise<T[]>;
}

/** What Fabula's Dexie tables and Tributa's document store need. */
export interface IndexedStore extends IndexedTransaction {
  /** All-or-nothing: if `fn` throws, nothing it wrote is kept. */
  transaction<T>(fn: (tx: IndexedTransaction) => Promise<T>): Promise<T>;
  /** Calls `listener` with the tables a committed write touched. Returns the unsubscribe. */
  subscribe(tables: string[], listener: (changed: string[]) => void): () => void;
  close(): Promise<void>;
}
