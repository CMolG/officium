import { normalizeDocPath, slugFromTitle } from "./doc-path";

/**
 * Markdown files turned into pages (JAVA-801, design §6): what a drop on a node, or its "Import Markdown
 * files…" picker, plans before anything is written. One page per file, at a path made from the file's
 * name under the node, titled from its first H1. Pure, so every rule is checked without a browser.
 */
export const IMPORT_ACCEPT = ".md,.txt,text/markdown,text/plain";

const EXTENSIONS = [".md", ".txt"];
const MAX_TITLE = 200;
const MAX_DEPTH = 8;

export interface ImportFile {
  name: string;
  text: string;
}

export interface PlannedPage {
  file: string;
  path: string;
  title: string;
  body: string;
}

export interface SkippedFile {
  file: string;
  reason: string;
}

export interface ImportPlan {
  pages: PlannedPage[];
  skipped: SkippedFile[];
}

/** No byte-order mark and `\n` line ends, as the editor writes them, so a reopened page shows no stray change. */
export function normalizeText(raw: string): string {
  return raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

const baseName = (file: string) => file.replace(/\.[^.]*$/, "");
const clip = (title: string) => title.trim().slice(0, MAX_TITLE).trim();

/** Where the body starts once a frontmatter block (`---` … `---` on the first lines) is skipped. */
function afterFrontmatter(lines: string[]): number {
  if (lines[0]?.trim() !== "---") return 0;
  const end = lines.findIndex((line, at) => at > 0 && line.trim() === "---");
  return end > 0 ? end + 1 : 0;
}

/** The first `# ` heading after any frontmatter and outside fenced code; else the file's name. */
export function titleOf(text: string, file: string): string {
  const lines = text.split("\n");
  let fence: { char: string; length: number } | null = null;
  for (let at = afterFrontmatter(lines); at < lines.length; at++) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(lines[at]);
    if (marker) {
      const run = { char: marker[1][0], length: marker[1].length };
      if (!fence) fence = run;
      else if (run.char === fence.char && run.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = /^ {0,3}#[ \t]+(.+?)[ \t#]*$/.exec(lines[at]);
    if (heading && clip(heading[1])) return clip(heading[1]);
  }
  return clip(baseName(file)) || "Untitled";
}

/** The first free path for `slug` under `parent`: `slug`, then `slug-2`, `slug-3`…; null when even the first is too long. */
function freePath(parent: string, slug: string, used: ReadonlySet<string>): string | null {
  for (let n = 1; ; n++) {
    const candidate = `${parent ? `${parent}/` : ""}${n === 1 ? slug : `${slug}-${n}`}`;
    if (!normalizeDocPath(candidate)) return null;
    if (!used.has(candidate)) return candidate;
  }
}

export interface ReadFiles {
  read: ImportFile[];
  unreadable: SkippedFile[];
}

/** Each file's text, read on its own: one the browser can't read is skipped and the others still import. */
export async function readImportFiles(files: File[]): Promise<ReadFiles> {
  const settled = await Promise.allSettled(files.map((file) => file.text()));
  const out: ReadFiles = { read: [], unreadable: [] };
  settled.forEach((result, at) => {
    if (result.status === "fulfilled") out.read.push({ name: files[at].name, text: result.value });
    else out.unreadable.push({ file: files[at].name, reason: "couldn't be read" });
  });
  return out;
}

/** The paths a drop must not take: the tree's, and each template's, which the tree leaves out. */
export function withTemplatePaths(taken: ReadonlySet<string>, templates: readonly { path: string }[]): Set<string> {
  return new Set([...taken, ...templates.map((template) => template.path)]);
}

/**
 * What a drop of `files` on the node at `parent` ("" for the top level) would write. `taken` holds the paths
 * already in use; a later file never takes the path an earlier one of the same drop was given.
 */
export function planImport(files: ImportFile[], parent: string, taken: ReadonlySet<string>): ImportPlan {
  const used = new Set(taken);
  const depth = parent ? parent.split("/").length : 0;
  const plan: ImportPlan = { pages: [], skipped: [] };
  for (const file of files) {
    const skip = (reason: string) => plan.skipped.push({ file: file.name, reason });
    if (!EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      skip("only .md and .txt files become pages");
      continue;
    }
    const path = depth >= MAX_DEPTH ? null : freePath(parent, slugFromTitle(baseName(file.name)) || "page", used);
    if (!path) {
      skip(`a page can't sit more than ${MAX_DEPTH} levels deep or have a path over 200 characters`);
      continue;
    }
    used.add(path);
    const body = normalizeText(file.text);
    plan.pages.push({ file: file.name, path, title: titleOf(body, file.name), body });
  }
  return plan;
}
