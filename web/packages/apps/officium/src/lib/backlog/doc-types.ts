// Documentation wire shapes, split from types.ts (JAVA-1386) to keep it under its architecture ceiling.
import type { Actor } from "./types";

/** officium-api.md §8.7: a project's Markdown page. Its identity inside the project is its `path`
 *  (`procedures/deploy`); the tree is the paths themselves, with no folder rows. */
export interface DocPage {
  id: string;
  projectId: string;
  path: string;
  title: string;
  /** Markdown. */
  body: string;
  version: number;
  createdBy: Actor;
  updatedBy: Actor;
  createdAt: string;
  updatedAt: string;
  /** One of Officium's own pages (JAVA-783, §8.15): the same in every project, read-only. */
  builtin: boolean;
  /** Null is an unpublished draft (JAVA-793): only its creator sees it until it is published. */
  publishedAt: string | null;
  /** Set while the page is archived: out of the tree and search, still readable. */
  archivedAt: string | null;
  archivedBy: Actor | null;
  /** The people who wrote this version beside its saver, when it was saved from a live room (JAVA-803). */
  coAuthors?: Actor[];
  /** Only on the answer to a write (JAVA-794): false when the replaced version did not fit the
   *  owner's allowance, so the page saved but its previous version was not kept. */
  historyKept?: boolean;
  /** Only on the answer to a write: what the replaced version became, to restore it as an undo. */
  revisionId?: string | null;
  /** A template (JAVA-801): out of the tree and search, copied into new pages. Absent from an API older than templates. */
  template?: boolean;
  /** Only when the page was reached through an old path it moved from (JAVA-792, §8.20): that path. */
  redirectedFrom?: string | null;
}

/** `PUT …/docs/{path}`: a field left out keeps the page's. `template` and `fromTemplate` (JAVA-801) only mean
 *  something on create, and never together: one makes a template, the other a page from one. */
export interface DocUpsertInput {
  title?: string;
  body?: string;
  expectedVersion?: number;
  draft?: boolean;
  editSession?: string;
  template?: boolean;
  /** The template to write the new page from: the server fills `{date}`, `{time}`, `{datetime}` and `{author}`. */
  fromTemplate?: string;
  /** An IANA zone that dates the fill; UTC when left out. */
  timeZone?: string;
}

/** `GET …/docs:templates` (JAVA-801): a template, with the collection its path puts it in (null: the project's). */
export type DocTemplate = DocPageSummary & { collection: string | null };

/** A version a page used to be (JAVA-794). `expiresAt` is null for the heaviest ever, which is kept for good. */
export interface DocRevision {
  id: string;
  version: number;
  title: string;
  body: string;
  sizeBytes: number;
  author: Actor | null;
  writtenAt: string;
  retiredAt: string;
  expiresAt: string | null;
  heaviest: boolean;
}

export interface DocHistory {
  current: DocPage;
  /** How many days the two recent versions are kept. */
  historyDays: number;
  /** Newest version first. */
  revisions: DocRevision[];
}

/** A file or an image a page carries (JAVA-798): its bytes live on the server, the page points at it by `uri`. */
export interface DocFile {
  id: string;
  name: string;
  kind: "image" | "file";
  contentType: string;
  /** What was sent, and what is kept: for an image the second is the reduced size. */
  originalBytes: number;
  storedBytes: number;
  width: number;
  height: number;
  /** `doc://<page>/_files/<name>`: what the page's Markdown holds. */
  uri: string;
  createdAt: string;
}

export interface DocStorageFigures {
  pagesBytes: number;
  historyBytes: number;
  attachmentsBytes: number;
  trashBytes: number;
  /** Comment text and quotes (JAVA-797). */
  commentsBytes: number;
}

/** The project's documentation settings (JAVA-794). Only the owner changes them. */
export interface DocSettings {
  historyDays: number;
  version: number;
  updatedBy: Actor | null;
  updatedAt: string | null;
  storage: DocStorageFigures;
}

export type DocPresenceState = "viewing" | "editing";

/** One person on a page (JAVA-802, §8.19): two tabs of one person are one entry, and editing wins. */
export interface DocPresencePerson {
  accountId: string;
  name: string;
  state: DocPresenceState;
  since: string;
  /** How long the entry lives without another beat: a tab that dies drops out then. */
  expiresInSeconds: number;
}

export interface DocPresence {
  path: string;
  /** How often an open page beats. */
  beatSeconds: number;
  /** Everyone on the page, the caller included. */
  present: DocPresencePerson[];
}

/** A page in a list or a search: what the tree needs, without the body. The archive and the trash
 *  lists fill in who and when (JAVA-793); `purgeAfter` is when the sweep deletes a trashed page. */
export type DocPageSummary = Pick<DocPage, "id" | "path" | "title" | "version" | "updatedBy" | "updatedAt" | "builtin" | "template"> & {
  published: boolean;
  archivedAt: string | null;
  archivedBy: Actor | null;
  deletedAt: string | null;
  deletedBy: Actor | null;
  purgeAfter: string | null;
};

/** Which lifecycle list `listDocsIn` reads: your own unpublished drafts, the archive, or the trash. */
export type DocListState = "unpublished" | "archived" | "trash";

/** officium-api.md §8.8: what the docs did about a change -- nothing said yet, read and nothing
 *  needed, or pages updated for it. */
export type DocsStatus = "pending" | "reviewed" | "updated";

/** One change that reached main (JAVA-132). `ref` (the commit) is its identity in the project. */
export interface ChangelogEntry {
  id: string;
  projectId: string;
  ref: string;
  title: string;
  url: string | null;
  /** Where in the tree it landed, as the recorder derived it (`packages/apps/officium`). */
  areas: string[];
  mergedAt: string;
  status: DocsStatus;
  /** The pages updated for it; only an `updated` entry has any. */
  pages: string[];
  recordedBy: Actor;
  recordedAt: string;
  /** Null while pending. */
  markedBy: Actor | null;
  markedAt: string | null;
  version: number;
}

export interface ChangelogListing {
  items: ChangelogEntry[];
  /** The project's pending total, whatever the listing was filtered by. */
  pendingCount: number;
}

/** Whether the project's pipeline can record changes. The token itself is never readable. */
export interface ChangelogTokenStatus {
  configured: boolean;
  createdBy: Actor | null;
  createdAt: string | null;
}

/** A new pipeline token: this answer is the only place it ever appears. */
export interface IssuedChangelogToken {
  token: string;
  createdAt: string;
}

/** officium-api.md §8.17: how a node orders its children. */
export type DocSortMode = "manual" | "alphabetical";

/**
 * One node of the documentation tree (JAVA-791). `version` 0 means the node has no layout row yet
 * (its icon and colour are the defaults); `page` is null for a path that only has pages under it.
 */
export interface DocTreeNode {
  path: string;
  segment: string;
  depth: number;
  name: string;
  icon: string | null;
  iconColor: string | null;
  sortMode: DocSortMode;
  position: number | null;
  version: number;
  /** The page is drawn at the full width of the screen, for every viewer (JAVA-795). */
  fullWidth: boolean;
  page: DocPageSummary | null;
  children: DocTreeNode[];
}

/** `GET …/docs:tree`: Officium's own pages pinned on top, and the project's collections. */
export interface DocTree {
  pinned: DocPageSummary[];
  collections: DocTreeNode[];
}

/** `PATCH …/docs/{path}:node`: a field left out is kept; an empty icon or iconColor clears it. */
export interface DocNodeInput {
  icon?: string;
  iconColor?: string;
  sortMode?: DocSortMode;
  position?: number;
  fullWidth?: boolean;
  expectedVersion?: number;
}

/** One page's old and new path in a move (JAVA-792): what an agent rewrites its references from. */
export interface DocMovedPage {
  from: string;
  to: string;
}

/** The answer to a move: the node where it landed and every page that moved. */
export interface DocMoveResult {
  node: DocTreeNode;
  moved: DocMovedPage[];
}

/** `docs.move`'s input: `position` places the node among its new siblings; none keeps its place. */
export interface DocMoveInput {
  to: string;
  position?: number;
  expectedVersion?: number;
}

/** The pages whose links point at `path` (JAVA-792). `redirectedFrom` is set when the asked-for path was an old one. */
export interface DocBacklinks {
  path: string;
  redirectedFrom: string | null;
  pages: DocPageSummary[];
}

/** officium-api.md §8.21: one starred page or collection, in the caller's own order. `path` is where it
 *  sits now, so it follows a move; `page` is null for a collection with no overview page. */
export interface DocStar {
  kind: "page" | "collection";
  path: string;
  name: string;
  icon: string | null;
  iconColor: string | null;
  position: number;
  page: DocPageSummary | null;
}

/** `POST …/docs/{path}:star`: `kind` defaults to a page; a `position` (0-based) moves the star. */
export interface DocStarInput {
  kind?: DocStar["kind"];
  position?: number;
}

/** A page the caller opened, with when (`GET …/docs:recent`, newest first, at most 50). */
export type DocRecent = DocPageSummary & { viewedAt: string };

/** One run of a search result's excerpt; `match` is where the search hit. Parts, never HTML: a body can hold markup. */
export interface DocSearchPart {
  text: string;
  match: boolean;
}

/** A page found by `GET …/docs?q=` (JAVA-800): the summary plus the excerpt (empty past the first 25 of a response). */
export type DocSearchResult = DocPageSummary & { snippet: DocSearchPart[] };

export type DocSearchState = "published" | "unpublished" | "archived";

/** How far back a page was last updated; "any" is no limit. The wire takes `updatedAfter` instead. */
export type DocSearchRange = "any" | "day" | "week" | "month" | "year";

/** What the search section keeps in its URL: the text and the optional filters. */
export interface DocSearchFilters {
  q: string;
  collection?: string;
  author?: string;
  updated?: DocSearchRange;
  state?: DocSearchState;
}
