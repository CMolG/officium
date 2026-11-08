/** The SQL the native IndexedStore runs, as pure functions so they are tested without a device. */
import type { IndexQuery, IndexSpec, IndexValue, IndexedSchema, Row, TableSchema } from "./types.ts";

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Identifiers come from the schema, never from user data; this still refuses anything that is not a name. */
export function ident(name: string): string {
  if (!IDENTIFIER.test(name)) throw new Error(`storage: "${name}" is not a valid table, field or index name`);
  return `"${name}"`;
}

/** Key fields first, then the indexed ones, once each. Each becomes a column beside the JSON `doc`. */
export function columnsOf(table: TableSchema): string[] {
  const all = [...table.key, ...(table.indexes ?? []).flatMap((index) => index.fields)];
  return [...new Set(all)];
}

export function ddl(schema: IndexedSchema): string[] {
  const statements: string[] = [];
  for (const [name, table] of Object.entries(schema.tables)) {
    const columns = columnsOf(table).map((field) => `${ident(field)} NOT NULL`);
    const key = table.key.map(ident).join(", ");
    statements.push(
      `CREATE TABLE IF NOT EXISTS ${ident(name)} (${columns.join(", ")}, "doc" TEXT NOT NULL, PRIMARY KEY (${key}))`,
    );
    for (const index of table.indexes ?? []) {
      const unique = index.unique ? "UNIQUE " : "";
      const fields = index.fields.map(ident).join(", ");
      statements.push(
        `CREATE ${unique}INDEX IF NOT EXISTS ${ident(`${name}__${index.name}`)} ON ${ident(name)} (${fields})`,
      );
    }
  }
  return statements;
}

/** A SQLite value for a field: numbers and strings pass, anything else is a schema mistake. */
export function indexValue(value: unknown, field: string): IndexValue {
  if (typeof value === "string" || typeof value === "number") return value;
  throw new Error(`storage: field "${field}" must be a string or a number to be a key or an index`);
}

export function upsert(table: string, schema: TableSchema, row: Row): { sql: string; params: IndexValue[] } {
  const columns = columnsOf(schema);
  const params = [...columns.map((field) => indexValue(row[field], field)), JSON.stringify(row)];
  const names = [...columns.map(ident), '"doc"'].join(", ");
  const marks = params.map(() => "?").join(", ");
  // Only the primary key is the upsert target. INSERT OR REPLACE would delete a different row that holds
  // the same UNIQUE index value, where the web adapter throws.
  const key = schema.key.map(ident).join(", ");
  const assigned = [...columns.filter((field) => !schema.key.includes(field)), "doc"]
    .map((field) => `${ident(field)} = excluded.${ident(field)}`)
    .join(", ");
  return {
    sql: `INSERT INTO ${ident(table)} (${names}) VALUES (${marks}) ON CONFLICT (${key}) DO UPDATE SET ${assigned}`,
    params,
  };
}

function tuple(value: IndexValue | IndexValue[]): IndexValue[] {
  return Array.isArray(value) ? value : [value];
}

function indexSpec(table: TableSchema, name: string, tableName: string): IndexSpec {
  if (name === "key") return { name, fields: table.key };
  const found = table.indexes?.find((index) => index.name === name);
  if (!found) throw new Error(`storage: table "${tableName}" has no index "${name}"`);
  return found;
}

function lexicographic(fields: string[], op: ">=" | "<="): string {
  // (a, b) >= (?, ?) is a row-value comparison, supported by SQLite since 3.15.
  const names = fields.map(ident).join(", ");
  const marks = fields.map(() => "?").join(", ");
  return `(${names}) ${op} (${marks})`;
}

export function select(
  tableName: string,
  table: TableSchema,
  indexName: string,
  query: IndexQuery,
  options: { reverse?: boolean; limit?: number } = {},
): { sql: string; params: IndexValue[] } {
  const spec = indexSpec(table, indexName, tableName);
  const arity = spec.fields.length;
  const bounds = "equals" in query ? [tuple(query.equals), tuple(query.equals)] : query.between.map(tuple);
  for (const bound of bounds) {
    if (bound.length !== arity) throw new Error(`storage: index "${indexName}" takes ${arity} value(s)`);
  }
  const where =
    "equals" in query
      ? spec.fields.map((field) => `${ident(field)} = ?`).join(" AND ")
      : `${lexicographic(spec.fields, ">=")} AND ${lexicographic(spec.fields, "<=")}`;
  const direction = options.reverse ? "DESC" : "ASC";
  const order = [...spec.fields, ...table.key.filter((field) => !spec.fields.includes(field))]
    .map((field) => `${ident(field)} ${direction}`)
    .join(", ");
  const limit = options.limit === undefined ? "" : ` LIMIT ${Math.max(0, Math.floor(options.limit))}`;
  const params = "equals" in query ? bounds[0] : [...bounds[0], ...bounds[1]];
  return { sql: `SELECT "doc" FROM ${ident(tableName)} WHERE ${where} ORDER BY ${order}${limit}`, params };
}
