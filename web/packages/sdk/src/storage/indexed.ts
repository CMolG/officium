/**
 * The web half of `IndexedStore`: rows in memory. The web apps keep Dexie/IndexedDB until each one adopts
 * the port, so this serves the tests, server rendering and the contract every adapter has to meet.
 */
import type {
  IndexQuery,
  IndexValue,
  IndexedSchema,
  IndexedStore,
  IndexedTransaction,
  Row,
  TableSchema,
  WhereOptions,
} from "./types.ts";

type Tables = Map<string, Map<string, Row>>;

const tuple = (value: IndexValue | IndexValue[]): IndexValue[] => (Array.isArray(value) ? value : [value]);
const keyOf = (fields: string[], row: Row): string => JSON.stringify(fields.map((field) => row[field]));

function compare(a: IndexValue[], b: IndexValue[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
  }
  return 0;
}

function tableOf(schema: IndexedSchema, name: string): TableSchema {
  const table = schema.tables[name];
  if (!table) throw new Error(`storage: unknown table "${name}"`);
  return table;
}

function fieldsOf(table: TableSchema, tableName: string, index: string): string[] {
  if (index === "key") return table.key;
  const found = table.indexes?.find((spec) => spec.name === index);
  if (!found) throw new Error(`storage: table "${tableName}" has no index "${index}"`);
  return found.fields;
}

function transactionOver(schema: IndexedSchema, tables: Tables, touched: Set<string>): IndexedTransaction {
  const rows = (name: string) => tables.get(name)!;
  return {
    async get<T extends Row>(name: string, key: IndexValue | IndexValue[]) {
      tableOf(schema, name);
      return (rows(name).get(JSON.stringify(tuple(key))) as T | undefined) ?? null;
    },
    async bulkPut(name: string, batch: Row[]) {
      const table = tableOf(schema, name);
      for (const row of batch) {
        const copy = structuredClone(row);
        for (const index of table.indexes ?? []) {
          if (!index.unique) continue;
          const mine = keyOf(index.fields, copy);
          for (const other of rows(name).values()) {
            if (keyOf(index.fields, other) === mine && keyOf(table.key, other) !== keyOf(table.key, copy)) {
              throw new Error(`storage: unique index "${index.name}" of "${name}" already holds that value`);
            }
          }
        }
        rows(name).set(keyOf(table.key, copy), copy);
      }
      touched.add(name);
    },
    async delete(name: string, key: IndexValue | IndexValue[]) {
      tableOf(schema, name);
      rows(name).delete(JSON.stringify(tuple(key)));
      touched.add(name);
    },
    async where<T extends Row>(name: string, index: string, query: IndexQuery, options: WhereOptions = {}) {
      const table = tableOf(schema, name);
      const fields = fieldsOf(table, name, index);
      const [low, high] = "equals" in query ? [tuple(query.equals), tuple(query.equals)] : query.between.map(tuple);
      const project = (row: Row) => fields.map((field) => row[field] as IndexValue);
      const found = [...rows(name).values()]
        .filter((row) => compare(project(row), low!) >= 0 && compare(project(row), high!) <= 0)
        .sort((a, b) => compare(project(a), project(b)) || compare(table.key.map((f) => a[f] as IndexValue), table.key.map((f) => b[f] as IndexValue)));
      if (options.reverse) found.reverse();
      return structuredClone(found.slice(0, options.limit)) as T[];
    },
  };
}

export function createMemoryIndexedStore(schema: IndexedSchema): IndexedStore {
  const tables: Tables = new Map(Object.keys(schema.tables).map((name) => [name, new Map()]));
  const listeners = new Set<{ tables: string[]; listener: (changed: string[]) => void }>();
  let queue: Promise<unknown> = Promise.resolve();

  function notify(touched: Set<string>) {
    for (const entry of listeners) {
      const changed = entry.tables.filter((name) => touched.has(name));
      if (changed.length) entry.listener(changed);
    }
  }

  // Writes are serialized, like SQLite's single writer, so a transaction never interleaves with another.
  function run<T>(fn: (tx: IndexedTransaction) => Promise<T>): Promise<T> {
    const result = queue.then(async () => {
      const draft: Tables = new Map([...tables].map(([name, map]) => [name, new Map(map)]));
      const touched = new Set<string>();
      const value = await fn(transactionOver(schema, draft, touched));
      for (const [name, map] of draft) tables.set(name, map);
      notify(touched);
      return value;
    });
    queue = result.catch(() => undefined);
    return result;
  }

  const direct = transactionOver(schema, tables, new Set());
  return {
    get: (name, key) => run((tx) => tx.get(name, key)),
    bulkPut: (name, batch) => run((tx) => tx.bulkPut(name, batch)),
    delete: (name, key) => run((tx) => tx.delete(name, key)),
    where: (name, index, query, options) => direct.where(name, index, query, options),
    transaction: run,
    subscribe(names, listener) {
      const entry = { tables: names, listener };
      listeners.add(entry);
      return () => void listeners.delete(entry);
    },
    async close() {
      listeners.clear();
    },
  };
}

/** Same name and shape as the Android adapter, so a call site is platform-blind. */
export async function openIndexedStore(schema: IndexedSchema): Promise<IndexedStore> {
  return createMemoryIndexedStore(schema);
}
