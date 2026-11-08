import type { Card, Category, Executor, Priority, Status } from "./types";
import { ALL_STATUSES, PRIORITY_CONFIG, STATUS_CONFIG, isClosed } from "./status-config";
import { REJECTION_REASONS } from "./rejection";
import { REVIEW_RETURN_REASONS } from "./review-returns";
import { parseDateValue } from "./jql-dates";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./category-config";
import {
  CATEGORY_WORDS, EXECUTOR_WORDS, PRIORITY_WORDS, REJECTION_WORDS, RETURN_REASON_WORDS, RUN_STATES, STATUS_WORDS, norm, priorityRank,
} from "./jql-words";

/**
 * OQL -- Officium's query language, the subset of Jira's JQL a backlog of cards needs, so a person
 * who searches Jira every day can search here without learning anything (user decision,
 * 2026-09-22). Same shape, same keywords, same error wording where Jira has one:
 *
 *   status in ("To do", "In progress") AND priority >= High AND text ~ "stripe"
 *   assignee = currentUser() AND status not in (Deploy, Completed) ORDER BY updated DESC
 *   labels is EMPTY OR epic = "Launch week"
 *   created >= -7d AND executor = ai AND type = Bug
 *
 * It runs in the BROWSER, over the cards the search view already loaded: the REST search
 * (`GET .../cards`) takes one value per filter and ANDs them, which cannot express `OR`, `IN`,
 * `NOT` or a date range. Moving it server-side (and into MCP's `cards.search`, for agents) is
 * [[JDB-270]]; the grammar here is what that endpoint would accept.
 *
 * Pure: no React, no repository. `parseJql` -> `matchesJql`/`sortByJql` for results,
 * `toBasic`/`fromBasic` for the basic filter mode, `suggestJql` for the autocomplete.
 */

/* ── Fields ──────────────────────────────────────────────────────────────── */

export type Op = "=" | "!=" | ">" | ">=" | "<" | "<=" | "~" | "!~" | "in" | "not in" | "is" | "is not";

type FieldKind =
  | "key" | "text" | "status" | "priority" | "executor" | "category" | "runState" | "name" | "list" | "bool"
  | "date" | "number" | "rejection" | "returnReason";

export type FieldId =
  | "key" | "summary" | "description" | "text" | "status" | "priority" | "executor" | "category" | "runState"
  | "assignee" | "epic" | "labels" | "blocked" | "created" | "updated" | "estimate" | "rejection" | "reviewReturns" | "returnReason";

interface FieldDef {
  id: FieldId;
  /** What it is written as; the first is canonical and is what the autocomplete offers. */
  names: string[];
  kind: FieldKind;
  ops: Op[];
  sortable: boolean;
}

const EQ: Op[] = ["=", "!=", "in", "not in"];
const ORDERED: Op[] = ["=", "!=", ">", ">=", "<", "<="];
const EMPTY_OPS: Op[] = ["is", "is not"];

const FIELDS: FieldDef[] = [
  { id: "status", names: ["status"], kind: "status", ops: EQ, sortable: true },
  { id: "priority", names: ["priority"], kind: "priority", ops: [...EQ, ">", ">=", "<", "<="], sortable: true },
  { id: "assignee", names: ["assignee"], kind: "name", ops: [...EQ, "~", ...EMPTY_OPS], sortable: true },
  { id: "executor", names: ["executor"], kind: "executor", ops: EQ, sortable: true },
  // `type` and `issuetype` are what a Jira hand types for the same thing (JAVA-28).
  { id: "category", names: ["category", "type", "issuetype"], kind: "category", ops: [...EQ, ...EMPTY_OPS], sortable: true },
  { id: "text", names: ["text"], kind: "text", ops: ["~", "!~"], sortable: false },
  { id: "summary", names: ["summary", "title"], kind: "text", ops: ["~", "!~"], sortable: true },
  { id: "description", names: ["description"], kind: "text", ops: ["~", "!~", ...EMPTY_OPS], sortable: false },
  { id: "epic", names: ["epic", "epiclink"], kind: "name", ops: [...EQ, "~", ...EMPTY_OPS], sortable: true },
  { id: "labels", names: ["labels", "label", "tags", "tag"], kind: "list", ops: [...EQ, ...EMPTY_OPS], sortable: false },
  { id: "blocked", names: ["blocked"], kind: "bool", ops: ["=", "!="], sortable: false },
  { id: "key", names: ["key", "issuekey"], kind: "key", ops: [...EQ, ">", ">=", "<", "<="], sortable: true },
  { id: "created", names: ["created", "createddate"], kind: "date", ops: ORDERED, sortable: true },
  { id: "updated", names: ["updated", "updateddate"], kind: "date", ops: ORDERED, sortable: true },
  { id: "estimate", names: ["estimate", "originalestimate"], kind: "number", ops: ORDERED, sortable: true },
  { id: "runState", names: ["runstate"], kind: "runState", ops: EQ, sortable: false },
  // Why a rejected card was rejected (card://JAVA-1415); empty on every other card.
  { id: "rejection", names: ["rejection"], kind: "rejection", ops: [...EQ, ...EMPTY_OPS], sortable: false },
  // How many times a card was sent back from review or deploy, and why (card://JAVA-1416).
  { id: "reviewReturns", names: ["reviewreturns", "sentback"], kind: "number", ops: ORDERED, sortable: false },
  { id: "returnReason", names: ["returnreason"], kind: "returnReason", ops: [...EQ, ...EMPTY_OPS], sortable: false },
];

const FIELD_BY_NAME = new Map(FIELDS.flatMap((f) => f.names.map((n) => [n, f] as const)));
const fieldById = (id: FieldId) => FIELDS.find((f) => f.id === id)!;

/** The canonical name of a field, as it is written in a query and read in a column header. */
export const fieldName = (id: FieldId) => fieldById(id).names[0];

const KEYWORDS = new Set(["and", "or", "not", "in", "is", "empty", "null", "order", "by", "asc", "desc"]);

/* ── Values ──────────────────────────────────────────────────────────────── */

export interface JqlValue {
  /** As written, unquoted. */
  raw: string;
  fn?: "currentUser" | "now" | "startOfDay" | "startOfWeek";
  empty?: boolean;
}

export type JqlNode =
  | { type: "and"; items: JqlNode[] }
  | { type: "or"; items: JqlNode[] }
  | { type: "not"; item: JqlNode }
  | { type: "clause"; field: FieldId; op: Op; values: JqlValue[] };

export interface JqlOrder {
  field: FieldId;
  dir: "asc" | "desc";
}

export interface JqlQuery {
  where: JqlNode | null;
  orderBy: JqlOrder[];
  /** Offset of `ORDER BY` in the text, or its length when there is none: where a new sort goes. */
  orderAt: number;
}

export interface JqlError {
  message: string;
  /** Character offset, 0-based. The view shows it 1-based, as Jira does. */
  at: number;
}

export type JqlResult = { ok: true; query: JqlQuery } | { ok: false; error: JqlError };

/* ── Tokens ──────────────────────────────────────────────────────────────── */

type TokenKind = "word" | "string" | "op" | "(" | ")" | ",";

interface Token {
  kind: TokenKind;
  value: string;
  start: number;
  end: number;
}

const OPERATORS = ["!=", ">=", "<=", "!~", "=", ">", "<", "~"];
const WORD = /[\p{L}\p{N}_\-.:/@+]/u;

function tokenize(input: string): { tokens: Token[]; error?: JqlError } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const start = i;
      let value = "";
      i++;
      while (i < input.length && input[i] !== ch) {
        if (input[i] === "\\" && i + 1 < input.length) i++;
        value += input[i];
        i++;
      }
      if (i >= input.length) return { tokens, error: { message: "The quoted string is not closed.", at: start } };
      i++;
      tokens.push({ kind: "string", value, start, end: i });
      continue;
    }
    if (ch === "(" || ch === ")" || ch === ",") {
      tokens.push({ kind: ch, value: ch, start: i, end: i + 1 });
      i++;
      continue;
    }
    const op = OPERATORS.find((o) => input.startsWith(o, i));
    if (op) {
      tokens.push({ kind: "op", value: op, start: i, end: i + op.length });
      i += op.length;
      continue;
    }
    if (WORD.test(ch)) {
      const start = i;
      while (i < input.length && WORD.test(input[i])) i++;
      tokens.push({ kind: "word", value: input.slice(start, i), start, end: i });
      continue;
    }
    return { tokens, error: { message: `The character '${ch}' is not valid here.`, at: i } };
  }
  return { tokens };
}

const isKeyword = (t: Token | undefined, word: string) =>
  t?.kind === "word" && t.value.toLowerCase() === word;

/* ── Parser ──────────────────────────────────────────────────────────────── */

class ParseError extends Error {
  constructor(message: string, readonly at: number) {
    super(message);
  }
}

const FUNCTIONS: Record<string, JqlValue["fn"]> = {
  currentuser: "currentUser",
  now: "now",
  startofday: "startOfDay",
  startofweek: "startOfWeek",
};

/** Parses a query. An empty one is valid: it matches every card. */
export function parseJql(input: string): JqlResult {
  const { tokens, error } = tokenize(input);
  if (error) return { ok: false, error };
  let pos = 0;
  const peek = () => tokens[pos];
  const endAt = () => (tokens[pos] ? tokens[pos].start : input.length);
  const describe = (t: Token | undefined) => (t ? `'${t.value}'` : "the end of the query");

  function orExpr(): JqlNode {
    const items = [andExpr()];
    while (isKeyword(peek(), "or")) {
      pos++;
      items.push(andExpr());
    }
    return items.length === 1 ? items[0] : { type: "or", items };
  }

  function andExpr(): JqlNode {
    const items = [notExpr()];
    while (isKeyword(peek(), "and")) {
      pos++;
      items.push(notExpr());
    }
    return items.length === 1 ? items[0] : { type: "and", items };
  }

  function notExpr(): JqlNode {
    if (isKeyword(peek(), "not")) {
      pos++;
      return { type: "not", item: notExpr() };
    }
    if (peek()?.kind === "(") {
      pos++;
      const inner = orExpr();
      if (peek()?.kind !== ")") throw new ParseError(`Expecting ')' but got ${describe(peek())}.`, endAt());
      pos++;
      return inner;
    }
    return clause();
  }

  function field(): FieldDef {
    const t = peek();
    if (!t || (t.kind !== "word" && t.kind !== "string") || KEYWORDS.has(t.value.toLowerCase())) {
      throw new ParseError(`Expecting a field name but got ${describe(t)}.`, endAt());
    }
    const def = FIELD_BY_NAME.get(norm(t.value));
    if (!def) {
      throw new ParseError(
        `Field '${t.value}' does not exist. Try ${FIELDS.slice(0, 5).map((f) => f.names[0]).join(", ")}…`,
        t.start,
      );
    }
    pos++;
    return def;
  }

  function operator(def: FieldDef): Op {
    const t = peek();
    const at = endAt();
    let op: Op | null = null;
    if (t?.kind === "op") {
      op = t.value as Op;
      pos++;
    } else if (isKeyword(t, "in")) {
      op = "in";
      pos++;
    } else if (isKeyword(t, "is")) {
      pos++;
      op = "is";
      if (isKeyword(peek(), "not")) {
        pos++;
        op = "is not";
      }
    } else if (isKeyword(t, "not") && isKeyword(tokens[pos + 1], "in")) {
      op = "not in";
      pos += 2;
    }
    if (!op) throw new ParseError(`Expecting an operator after '${def.names[0]}' but got ${describe(t)}.`, at);
    if (!def.ops.includes(op)) {
      throw new ParseError(`The operator '${op}' is not supported by the '${def.names[0]}' field.`, at);
    }
    return op;
  }

  function value(def: FieldDef): JqlValue {
    const t = peek();
    if (!t || (t.kind !== "word" && t.kind !== "string")) {
      throw new ParseError(`Expecting a value but got ${describe(t)}.`, endAt());
    }
    pos++;
    if (t.kind === "word" && peek()?.kind === "(") {
      const fn = FUNCTIONS[t.value.toLowerCase()];
      if (!fn) throw new ParseError(`Unknown function '${t.value}()'.`, t.start);
      pos++;
      if (peek()?.kind !== ")") throw new ParseError(`Expecting ')' but got ${describe(peek())}.`, endAt());
      pos++;
      if (fn === "currentUser" ? def.kind !== "name" : def.kind !== "date") {
        throw new ParseError(`The function '${t.value}()' is not supported by the '${def.names[0]}' field.`, t.start);
      }
      return { raw: t.value, fn };
    }
    const v: JqlValue = { raw: t.value };
    const problem = invalidValue(def, v);
    if (problem) throw new ParseError(problem, t.start);
    return v;
  }

  function clause(): JqlNode {
    const def = field();
    const op = operator(def);
    if (op === "is" || op === "is not") {
      const t = peek();
      if (!isKeyword(t, "empty") && !isKeyword(t, "null")) {
        throw new ParseError(`Expecting EMPTY after '${op}' but got ${describe(t)}.`, endAt());
      }
      pos++;
      return { type: "clause", field: def.id, op, values: [{ raw: "EMPTY", empty: true }] };
    }
    if (op === "in" || op === "not in") {
      if (peek()?.kind !== "(") throw new ParseError(`Expecting '(' after '${op}' but got ${describe(peek())}.`, endAt());
      pos++;
      const values = [value(def)];
      while (peek()?.kind === ",") {
        pos++;
        values.push(value(def));
      }
      if (peek()?.kind !== ")") throw new ParseError(`Expecting ',' or ')' but got ${describe(peek())}.`, endAt());
      pos++;
      return { type: "clause", field: def.id, op, values };
    }
    return { type: "clause", field: def.id, op, values: [value(def)] };
  }

  function orderBy(): JqlOrder[] {
    pos++; // ORDER
    if (!isKeyword(peek(), "by")) throw new ParseError(`Expecting 'by' after 'order' but got ${describe(peek())}.`, endAt());
    pos++;
    const order: JqlOrder[] = [];
    do {
      if (order.length) pos++; // ","
      const def = field();
      if (!def.sortable) throw new ParseError(`The field '${def.names[0]}' cannot be sorted by.`, tokens[pos - 1].start);
      let dir: JqlOrder["dir"] = def.kind === "date" ? "desc" : "asc";
      if (isKeyword(peek(), "asc") || isKeyword(peek(), "desc")) {
        dir = peek()!.value.toLowerCase() as JqlOrder["dir"];
        pos++;
      }
      order.push({ field: def.id, dir });
    } while (peek()?.kind === ",");
    return order;
  }

  try {
    let where: JqlNode | null = null;
    if (tokens.length && !isKeyword(peek(), "order")) where = orExpr();
    let orderAt = input.length;
    let order: JqlOrder[] = [];
    if (isKeyword(peek(), "order")) {
      orderAt = peek()!.start;
      order = orderBy();
    }
    if (pos < tokens.length) {
      throw new ParseError(`Expecting AND, OR or ORDER BY but got ${describe(peek())}.`, tokens[pos].start);
    }
    return { ok: true, query: { where, orderBy: order, orderAt } };
  } catch (err) {
    if (err instanceof ParseError) return { ok: false, error: { message: err.message, at: err.at } };
    throw err;
  }
}

/** Jira rejects a status or a priority that does not exist; so does this, with the same words. */
function invalidValue(def: FieldDef, v: JqlValue): string | null {
  const n = norm(v.raw);
  const bad = `The value '${v.raw}' does not exist for the field '${def.names[0]}'.`;
  switch (def.kind) {
    case "status":
      return STATUS_WORDS.has(n) ? null : bad;
    case "priority":
      return PRIORITY_WORDS.has(n) ? null : bad;
    case "executor":
      return EXECUTOR_WORDS.has(n) ? null : bad;
    case "category":
      return CATEGORY_WORDS.has(n) ? null : bad;
    case "runState":
      return (RUN_STATES as string[]).includes(n) ? null : bad;
    case "rejection":
      return REJECTION_WORDS.has(n) ? null : bad;
    case "returnReason":
      return RETURN_REASON_WORDS.has(n) ? null : bad;
    case "bool":
      return ["true", "false", "yes", "no"].includes(n) ? null : bad;
    case "number":
      return Number.isFinite(Number(v.raw)) ? null : `'${v.raw}' is not a number.`;
    case "date":
      return parseDateValue(v, new Date()) ? null : `'${v.raw}' is not a date. Use 2026-09-01 or a relative one like -7d.`;
    default:
      return null;
  }
}

/* ── Evaluation ──────────────────────────────────────────────────────────── */

export interface JqlContext {
  /** The signed-in account, for `currentUser()`. `null` matches nobody. */
  currentUser: string | null;
  now: Date;
}

const lower = (s: string | null | undefined) => (s ?? "").toLowerCase();

function textOf(card: Card, field: FieldId): string {
  if (field === "summary") return card.title;
  if (field === "description") return card.description;
  return [card.key, card.title, card.description, card.epic ?? "", ...card.tags].join(" ");
}

/** `~` is word containment, as in Jira: every word of the value appears, in any order. */
function containsWords(haystack: string, needle: string) {
  const h = haystack.toLowerCase();
  return needle.toLowerCase().split(/\s+/).filter(Boolean).every((w) => h.includes(w));
}

function compareOrdered(op: Op, a: number, b: number) {
  switch (op) {
    case ">": return a > b;
    case ">=": return a >= b;
    case "<": return a < b;
    case "<=": return a <= b;
    case "!=": return a !== b;
    default: return a === b;
  }
}

/** Does `card` satisfy ONE value of the clause (`=` semantics; the operator is applied outside). */
function equals(card: Card, field: FieldId, v: JqlValue, ctx: JqlContext): boolean {
  switch (field) {
    case "status": return card.status === STATUS_WORDS.get(norm(v.raw));
    case "priority": return card.priority === PRIORITY_WORDS.get(norm(v.raw));
    case "executor": return card.executor === EXECUTOR_WORDS.get(norm(v.raw));
    case "category": return card.category === CATEGORY_WORDS.get(norm(v.raw));
    case "runState": return card.runState === norm(v.raw);
    case "rejection": return card.rejection?.reason === REJECTION_WORDS.get(norm(v.raw));
    case "returnReason": return (card.reviewReturns ?? []).some((r) => r.reasons.includes(RETURN_REASON_WORDS.get(norm(v.raw))!));
    case "key": return lower(card.key) === lower(v.raw);
    case "assignee":
      return v.fn === "currentUser"
        ? ctx.currentUser !== null && card.assignees.some((a) => a.accountId === ctx.currentUser)
        : card.assignees.some((a) => lower(a.name) === lower(v.raw));
    case "epic": return lower(card.epic) === lower(v.raw);
    case "labels": return card.tags.some((t) => lower(t) === lower(v.raw));
    case "blocked": return card.blocked === ["true", "yes"].includes(norm(v.raw));
    default: return false;
  }
}

function isEmpty(card: Card, field: FieldId) {
  switch (field) {
    case "assignee": return card.assignees.length === 0;
    case "epic": return !card.epic;
    case "labels": return card.tags.length === 0;
    case "description": return !card.description.trim();
    case "category": return card.category === null;
    case "rejection": return !card.rejection;
    case "returnReason": return !card.reviewReturns?.length;
    default: return false;
  }
}

function clauseMatches(card: Card, node: Extract<JqlNode, { type: "clause" }>, ctx: JqlContext): boolean {
  const { field, op, values } = node;
  const def = fieldById(field);
  if (op === "is") return isEmpty(card, field);
  if (op === "is not") return !isEmpty(card, field);
  if (op === "~" || op === "!~") {
    const hit = def.kind === "name"
      ? (field === "epic" ? [card.epic ?? ""] : card.assignees.map((a) => a.name)).some((s) => containsWords(s, values[0].raw))
      : containsWords(textOf(card, field), values[0].raw);
    return op === "~" ? hit : !hit;
  }
  const v = values[0];
  if (def.kind === "date") {
    const at = Date.parse(field === "created" ? card.createdAt : card.updatedAt);
    const range = parseDateValue(v, ctx.now);
    if (!range) return false;
    // A bare day is a range: `= 2026-09-01` is "that day", `> 2026-09-01` is "after it".
    switch (op) {
      case "=": return at >= range.from && at < range.to;
      case "!=": return at < range.from || at >= range.to;
      case ">": return at >= range.to;
      case ">=": return at >= range.from;
      case "<": return at < range.from;
      default: return at < range.to;
    }
  }
  if (def.kind === "number") return compareOrdered(op, field === "reviewReturns" ? (card.reviewReturns?.length ?? 0) : card.estimate, Number(v.raw));
  const ordered = op === ">" || op === ">=" || op === "<" || op === "<=";
  if (ordered && def.kind === "key") return compareOrdered(op, card.number, Number(v.raw.replace(/^.*-/, "")));
  if (ordered && def.kind === "priority") {
    return compareOrdered(op, priorityRank(card.priority), priorityRank(PRIORITY_WORDS.get(norm(v.raw))!));
  }
  const any = values.some((value) => equals(card, field, value, ctx));
  return op === "=" || op === "in" ? any : !any;
}

function nodeMatches(card: Card, node: JqlNode, ctx: JqlContext): boolean {
  switch (node.type) {
    case "and": return node.items.every((n) => nodeMatches(card, n, ctx));
    case "or": return node.items.some((n) => nodeMatches(card, n, ctx));
    case "not": return !nodeMatches(card, node.item, ctx);
    default: return clauseMatches(card, node, ctx);
  }
}

export function matchesJql(card: Card, query: JqlQuery, ctx: JqlContext): boolean {
  return query.where === null || nodeMatches(card, query.where, ctx);
}

function sortValue(card: Card, field: FieldId): string | number {
  switch (field) {
    case "key": return card.number;
    case "summary": return lower(card.title);
    case "status": return STATUS_CONFIG[card.status].order;
    case "priority": return priorityRank(card.priority);
    case "executor": return card.executor;
    // In the groups' order; a card with none sorts after every category, like an empty epic.
    case "category": return card.category === null ? CATEGORY_ORDER.length : CATEGORY_ORDER.indexOf(card.category);
    case "assignee": return lower(card.assignees[0]?.name ?? "~");
    case "epic": return lower(card.epic ?? "~");
    case "created": return card.createdAt;
    case "updated": return card.updatedAt;
    case "estimate": return card.estimate;
    default: return 0;
  }
}

/** Sorted copy. With no ORDER BY, most recently updated first -- what a search usually wants. */
export function sortByJql(cards: Card[], query: JqlQuery): Card[] {
  const order: JqlOrder[] = query.orderBy.length ? query.orderBy : [{ field: "updated", dir: "desc" }];
  return [...cards].sort((a, b) => {
    for (const { field, dir } of order) {
      const x = sortValue(a, field);
      const y = sortValue(b, field);
      if (x < y) return dir === "asc" ? -1 : 1;
      if (x > y) return dir === "asc" ? 1 : -1;
    }
    return b.number - a.number;
  });
}

/* ── Writing queries ─────────────────────────────────────────────────────── */

/** A value as it has to be written: bare when it is one plain word, quoted otherwise. */
export function quote(value: string): string {
  return /^[\p{L}\p{N}_.@-]+$/u.test(value) && !KEYWORDS.has(value.toLowerCase())
    ? value
    : `"${value.replace(/(["\\])/g, "\\$1")}"`;
}

/** The query with its ORDER BY replaced (or added): what clicking a column header does. */
export function withOrder(input: string, query: JqlQuery, order: JqlOrder[]): string {
  const where = input.slice(0, query.orderAt).trimEnd();
  const clause = order.map((o) => `${fieldName(o.field)} ${o.dir.toUpperCase()}`).join(", ");
  return [where, order.length ? `ORDER BY ${clause}` : ""].filter(Boolean).join(" ");
}

/** The basic mode's filters: one control per field, ANDed. */
export interface BasicFilters {
  text: string;
  statuses: Status[];
  priorities: Priority[];
  executor: Executor | null;
  category: Category | null;
  assignee: string;
  epic: string;
  label: string;
  blockedOnly: boolean;
}

export const EMPTY_BASIC: BasicFilters = {
  text: "", statuses: [], priorities: [], executor: null, category: null, assignee: "", epic: "", label: "",
  blockedOnly: false,
};

function listClause(field: string, values: string[]) {
  return values.length === 1 ? `${field} = ${quote(values[0])}` : `${field} in (${values.map(quote).join(", ")})`;
}

/** Basic filters as the query they mean, so switching to JQL shows exactly what was searched. */
export function fromBasic(f: BasicFilters, order: JqlOrder[] = []): string {
  const parts = [
    f.text.trim() && `text ~ ${quote(f.text.trim())}`,
    f.statuses.length > 0 && listClause("status", f.statuses.map((s) => STATUS_CONFIG[s].label)),
    f.priorities.length > 0 && listClause("priority", f.priorities.map((p) => PRIORITY_CONFIG[p].label)),
    f.executor && `executor = ${f.executor}`,
    f.category && `category = ${quote(CATEGORY_CONFIG[f.category].label)}`,
    f.assignee && `assignee = ${quote(f.assignee)}`,
    f.epic && `epic = ${quote(f.epic)}`,
    f.label && `labels = ${quote(f.label)}`,
    f.blockedOnly && "blocked = true",
  ].filter(Boolean);
  const orderText = order.map((o) => `${fieldName(o.field)} ${o.dir.toUpperCase()}`).join(", ");
  return [parts.join(" AND "), orderText && `ORDER BY ${orderText}`].filter(Boolean).join(" ");
}

/**
 * The query as basic filters, or `null` when basic mode cannot show it -- an OR, a NOT, a date,
 * two clauses on one field. Jira refuses the switch in the same case, with the same reason.
 */
export function toBasic(query: JqlQuery): BasicFilters | null {
  const f: BasicFilters = { ...EMPTY_BASIC, statuses: [], priorities: [] };
  const clauses = query.where === null ? [] : query.where.type === "and" ? query.where.items : [query.where];
  const seen = new Set<FieldId>();
  for (const node of clauses) {
    if (node.type !== "clause" || seen.has(node.field)) return null;
    seen.add(node.field);
    const { field, op, values } = node;
    const one = values.length === 1 && !values[0].fn ? values[0].raw : null;
    const positive = op === "=" || op === "in";
    if (field === "text" && op === "~") f.text = values[0].raw;
    else if (field === "status" && positive) f.statuses = values.map((v) => STATUS_WORDS.get(norm(v.raw))!);
    else if (field === "priority" && positive) f.priorities = values.map((v) => PRIORITY_WORDS.get(norm(v.raw))!);
    else if (field === "executor" && op === "=" && one) f.executor = EXECUTOR_WORDS.get(norm(one))!;
    else if (field === "category" && op === "=" && one) f.category = CATEGORY_WORDS.get(norm(one))!;
    else if (field === "assignee" && op === "=" && one) f.assignee = one;
    else if (field === "epic" && op === "=" && one) f.epic = one;
    else if (field === "labels" && op === "=" && one) f.label = one;
    else if (field === "blocked" && op === "=" && one && ["true", "yes"].includes(norm(one))) f.blockedOnly = true;
    else return null;
  }
  return f;
}

/* ── Autocomplete ────────────────────────────────────────────────────────── */

export interface JqlSuggestion {
  /** What the list shows. */
  label: string;
  /** What replaces the word being typed. */
  insert: string;
  /** A short second line: the field's kind, "keyword", "function"… */
  detail: string;
}

export interface JqlSuggestions {
  /** The range of the input the chosen suggestion replaces. */
  from: number;
  to: number;
  items: JqlSuggestion[];
}

/** What the project offers as values, for the fields whose values are data, not vocabulary. */
export interface JqlVocabulary {
  epics: string[];
  labels: string[];
  assignees: string[];
}

type Expect = "field" | "op" | "value" | "list-open" | "list-value" | "list-next" | "empty" | "after-clause" | "by" | "order-field" | "order-next";

const OP_LABELS: Record<Op, string> = {
  "=": "=", "!=": "!=", ">": ">", ">=": ">=", "<": "<", "<=": "<=", "~": "~", "!~": "!~",
  in: "in", "not in": "not in", is: "is", "is not": "is not",
};

function valuesFor(def: FieldDef, vocab: JqlVocabulary): JqlSuggestion[] {
  const v = (label: string, detail: string, insert = quote(label)) => ({ label, insert, detail });
  switch (def.kind) {
    case "status": return ALL_STATUSES.map((s) => v(STATUS_CONFIG[s].label, isClosed(s) ? "status · no column" : "status"));
    case "priority": return (Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => v(PRIORITY_CONFIG[p].label, "priority"));
    case "executor": return [v("ai", "an agent does it"), v("human", "a person does it")];
    case "category": return CATEGORY_ORDER.map((c) => v(CATEGORY_CONFIG[c].label, CATEGORY_CONFIG[c].hint));
    case "runState": return RUN_STATES.map((r) => v(r, "run state"));
    case "rejection": return REJECTION_REASONS.map((r) => v(r.label, r.hint));
    case "returnReason": return REVIEW_RETURN_REASONS.map((r) => v(r.label, r.hint));
    case "bool": return [v("true", "boolean"), v("false", "boolean")];
    case "date": return [
      v("-7d", "a week ago", "-7d"), v("-1d", "yesterday", "-1d"), v("-4w", "four weeks ago", "-4w"),
      v("startOfDay()", "function", "startOfDay()"), v("startOfWeek()", "function", "startOfWeek()"),
    ];
    case "name": return [
      ...(def.id === "assignee" ? [v("currentUser()", "function: you", "currentUser()")] : []),
      ...(def.id === "epic" ? vocab.epics : vocab.assignees).map((s) => v(s, def.id)),
    ];
    case "list": return vocab.labels.map((s) => v(s, "label"));
    default: return [];
  }
}

/**
 * What can be typed at `caret`, from the tokens before it: a field, an operator the field takes,
 * one of its values, a keyword. The word under the caret (if any) filters the list and is what a
 * chosen suggestion replaces.
 */
export function suggestJql(input: string, caret: number, vocab: JqlVocabulary): JqlSuggestions {
  const before = input.slice(0, caret);
  const { tokens } = tokenize(before);
  let partial: Token | null = null;
  const last = tokens[tokens.length - 1];
  if (last && last.end === caret && (last.kind === "word" || last.kind === "op")) partial = tokens.pop()!;

  let expect: Expect = "field";
  let field: FieldDef | undefined;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const word = t.kind === "word" ? t.value.toLowerCase() : "";
    switch (expect) {
      case "field":
        if (word === "not" || t.kind === "(") break;
        if (word === "order") { expect = "by"; break; }
        field = FIELD_BY_NAME.get(norm(t.value));
        expect = "op";
        break;
      case "op":
        if (t.kind === "op") expect = "value";
        else if (word === "in") expect = "list-open";
        else if (word === "is") expect = "empty";
        else if (word === "not") expect = "op";
        break;
      case "value":
        expect = "after-clause";
        if (tokens[i + 1]?.kind === "(") i += tokens[i + 2]?.kind === ")" ? 2 : 1;
        break;
      case "list-open":
        expect = t.kind === "(" ? "list-value" : "after-clause";
        break;
      case "list-value":
        expect = "list-next";
        break;
      case "list-next":
        expect = t.kind === "," ? "list-value" : "after-clause";
        break;
      case "empty":
        if (word !== "not") expect = "after-clause";
        break;
      case "after-clause":
        if (word === "and" || word === "or") expect = "field";
        else if (word === "order") expect = "by";
        break;
      case "by":
        expect = "order-field";
        break;
      case "order-field":
        expect = "order-next";
        break;
      case "order-next":
        if (t.kind === ",") expect = "order-field";
        break;
    }
  }

  const kw = (label: string, detail = "keyword") => ({ label, insert: label, detail });
  let items: JqlSuggestion[] = [];
  switch (expect) {
    case "field":
      items = [...FIELDS.map((f) => ({ label: f.names[0], insert: f.names[0], detail: `field · ${f.kind}` })), kw("NOT")];
      break;
    case "op":
      items = field ? field.ops.map((op) => ({ label: OP_LABELS[op], insert: op, detail: "operator" })) : [];
      break;
    case "value":
    case "list-value":
      items = field ? valuesFor(field, vocab) : [];
      break;
    case "list-open":
      items = [kw("(")];
      break;
    case "list-next":
      items = [kw(","), kw(")")];
      break;
    case "empty":
      items = [kw("EMPTY"), kw("NOT")];
      break;
    case "after-clause":
      items = [kw("AND"), kw("OR"), kw("ORDER BY")];
      break;
    case "by":
      items = [kw("BY")];
      break;
    case "order-field":
      items = FIELDS.filter((f) => f.sortable).map((f) => ({ label: f.names[0], insert: f.names[0], detail: "sort by" }));
      break;
    case "order-next":
      items = [kw("ASC"), kw("DESC"), kw(",")];
      break;
  }

  const typed = partial ? partial.value.toLowerCase() : "";
  const filtered = typed ? items.filter((s) => s.label.toLowerCase().startsWith(typed) && s.label.toLowerCase() !== typed) : items;
  return { from: partial ? partial.start : caret, to: caret, items: filtered.slice(0, 12) };
}
