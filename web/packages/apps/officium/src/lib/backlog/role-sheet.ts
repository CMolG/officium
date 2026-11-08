import type { Phase } from "./role-matrix-types";

/** What a role does, read from its sheet in Fluxor's catalog: the sheet's "What it does" (JAVA-517, card://JAVA-1569). */
export interface RoleAtom {
  title: string;
  /** The phases its Phase Contract names, which can be fewer than the matrix gives it. */
  phases: Phase[];
  mission: string;
  achieve: string[];
  mustNot: string[];
}

const PHASE_NAMES: readonly Phase[] = ["refine", "action", "ready", "review", "deploy"];

/** One `- **Label:** text` line of the Phase Contract, or null. */
function field(markdown: string, label: string): string | null {
  const match = markdown.match(new RegExp(String.raw`^- \*\*${label}:\*\*\s*(.+)$`, "m"));
  return match ? match[1].trim() : null;
}

/** "Must not" is written as sentences; each becomes a line of its own. */
function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
}

/** The phase names before the first comma of the `Phase:` line, parentheses left out ("Action (To do, Doing), from ..."). */
function phasesOf(line: string): Phase[] {
  const head = line.replace(/\([^)]*\)/g, "").split(",")[0].toLowerCase();
  return PHASE_NAMES.filter((phase) => new RegExp(String.raw`\b${phase}\b`).test(head));
}

/**
 * A role's sheet (the `body` of `roles.get`) as the page shows it, or null when a field it needs is missing. Twin of
 * the parser every role sheet goes through, whether it comes from the market's files or from `roles.get` (card://JAVA-534).
 */
export function parseRoleSheet(markdown: string): RoleAtom | null {
  const title = markdown.match(/^# [a-z0-9-]+:\s*(.+)$/m)?.[1].trim();
  const phase = field(markdown, "Phase");
  const mission = field(markdown, "Mission");
  const achieve = field(markdown, "Must achieve");
  const mustNot = field(markdown, "Must not");
  if (!title || !phase || !mission || !achieve || !mustNot) return null;
  return {
    title,
    phases: phasesOf(phase),
    mission,
    achieve: achieve.split(/\s+·\s+/).map((s) => {
      const item = s.trim().replace(/\.$/, "");
      return item.charAt(0).toUpperCase() + item.slice(1);
    }),
    mustNot: sentences(mustNot),
  };
}

/**
 * A catalog sheet's Markdown (a role's or a mod's) to show under a page that has its own h1 and h2: the sheet's own
 * title line goes (the page says it), and every other heading moves one level down, so the outline stays in order.
 * Lines inside a fenced code block are left as they are.
 */
export function sheetMarkdown(markdown: string): string {
  let fenced = false;
  let titled = false;
  const lines: string[] = [];
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = fenced ? null : line.match(/^(#{1,4})\s+(.*)$/);
    if (heading && heading[1].length === 1 && !titled) {
      titled = true;
      continue;
    }
    lines.push(heading ? `${"#".repeat(Math.min(6, heading[1].length + 1))} ${heading[2]}` : line);
  }
  return lines.join("\n").replace(/^\n+/, "");
}
