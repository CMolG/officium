/**
 * Android's `IndexedStore`: expo-sqlite 57 (JAVA-1126). Real compound and UNIQUE indexes: queries take
 * 0.04-0.22 ms on 19,550 Fabula-shaped rows, against 2.7-32 ms for prefix scans over MMKV.
 *
 * It creates what is missing and never alters a table: a schema `version` bump that needs a data
 * migration (Fabula's Dexie upgrades) belongs to the app, which runs it through `transaction`.
 */
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { ddl, ident, select, upsert } from "./indexed-sql.ts";
import type {
  IndexQuery,
  IndexValue,
  IndexedSchema,
  IndexedStore,
  IndexedTransaction,
  Row,
  WhereOptions,
} from "./types.ts";

export { createMemoryIndexedStore } from "./indexed.ts";

type Executor = Pick<SQLiteDatabase, "runAsync" | "getAllAsync" | "getFirstAsync">;

const tuple = (value: IndexValue | IndexValue[]): IndexValue[] => (Array.isArray(value) ? value : [value]);

function transactionOver(schema: IndexedSchema, db: Executor, touched: Set<string>): IndexedTransaction {
  const tableOf = (name: string) => {
    const table = schema.tables[name];
    if (!table) throw new Error(`storage: unknown table "${name}"`);
    return table;
  };
  return {
    async get<T extends Row>(name: string, key: IndexValue | IndexValue[]) {
      const table = tableOf(name);
      const where = table.key.map((field) => `${ident(field)} = ?`).join(" AND ");
      const found = await db.getFirstAsync<{ doc: string }>(
        `SELECT "doc" FROM ${ident(name)} WHERE ${where}`,
        tuple(key),
      );
      return found ? (JSON.parse(found.doc) as T) : null;
    },
    async bulkPut(name: string, rows: Row[]) {
      const table = tableOf(name);
      for (const row of rows) {
        const { sql, params } = upsert(name, table, row);
        await db.runAsync(sql, params);
      }
      touched.add(name);
    },
    async delete(name: string, key: IndexValue | IndexValue[]) {
      const table = tableOf(name);
      const where = table.key.map((field) => `${ident(field)} = ?`).join(" AND ");
      await db.runAsync(`DELETE FROM ${ident(name)} WHERE ${where}`, tuple(key));
      touched.add(name);
    },
    async where<T extends Row>(name: string, index: string, query: IndexQuery, options?: WhereOptions) {
      const { sql, params } = select(name, tableOf(name), index, query, options);
      const found = await db.getAllAsync<{ doc: string }>(sql, params);
      return found.map((row) => JSON.parse(row.doc) as T);
    },
  };
}

/** `schema.name` is the database file name. */
export async function openIndexedStore(schema: IndexedSchema): Promise<IndexedStore> {
  const db = await openDatabaseAsync(schema.name);
  // The per-connection pragma that makes writes sub-millisecond at MMKV's durability (JAVA-1126, round 1).
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
  for (const statement of ddl(schema)) await db.execAsync(statement);
  await db.execAsync(`PRAGMA user_version = ${Math.floor(schema.version)}`);

  const listeners = new Set<{ tables: string[]; listener: (changed: string[]) => void }>();
  const notify = (touched: Set<string>) => {
    for (const entry of listeners) {
      const changed = entry.tables.filter((name) => touched.has(name));
      if (changed.length) entry.listener(changed);
    }
  };

  async function transaction<T>(fn: (tx: IndexedTransaction) => Promise<T>): Promise<T> {
    const touched = new Set<string>();
    let value!: T;
    await db.withExclusiveTransactionAsync(async (txn) => {
      value = await fn(transactionOver(schema, txn, touched));
    });
    notify(touched);
    return value;
  }

  const reads = transactionOver(schema, db, new Set());
  return {
    get: reads.get,
    where: reads.where,
    bulkPut: (name, rows) => transaction((tx) => tx.bulkPut(name, rows)),
    delete: (name, key) => transaction((tx) => tx.delete(name, key)),
    transaction,
    subscribe(names, listener) {
      const entry = { tables: names, listener };
      listeners.add(entry);
      return () => void listeners.delete(entry);
    },
    close: async () => {
      listeners.clear();
      await db.closeAsync();
    },
  };
}
