import type { TimeEntry } from "./types";

const MONTHS =["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07-08" -> "8 Jul 2026"; an instant ("2026-07-08T09:30:00Z") shows its date the same way. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  const month = MONTHS[Number(m) - 1];
  return month ? `${Number(d)} ${month} ${y}` : iso;
}

/** "Answer (3 questions)": a human card's form as its primary action, in the panel and in Needs you. */
export function answerLabel(questions: number): string {
  return `Answer (${questions} ${questions === 1 ? "question" : "questions"})`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function totalHours(entries: { hours: number }[]): number {
  return entries.reduce((sum, e) => sum + e.hours, 0);
}

const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 36900 -> "36.9K". */
export function formatTokens(count: number): string {
  return COMPACT.format(count);
}

/** "claude-opus-5-5" -> "Opus 5.5", "claude-haiku-4-5-20251001" -> "Haiku 4.5": the name a person
 *  knows the model by. Any other id is shown as it came. */
export function modelName(model: string): string {
  const named = /^claude-([a-z]+)-(\d+)-(\d+)(?:-\d{8})?$/.exec(model);
  if (!named) return model;
  const [, family, major, minor] = named;
  return `${family!.charAt(0).toUpperCase()}${family!.slice(1)} ${major}.${minor}`;
}

/** What an agent runs on, "Opus 5.5 · high effort" (JAVA-584); empty when nothing said. */
export function runsOn(model: string | null, effort: string | null): string {
  return [model ? modelName(model) : null, effort ? `${effort} effort` : null].filter(Boolean).join(" · ");
}

const USAGE_LABELS = { work: "Work", refine: "Refinement", test: "Tests" } as const;

/** What an agent's entry went to and spent, in one line (JAVA-245): refinement, tests or work, the
 *  subagent, the model at its effort and its tokens. Empty for a person's entry, which measured none of it. */
export function usageLine(entry: TimeEntry): string {
  if (entry.source === "manual") return "";
  const parts: string[] = [USAGE_LABELS[entry.concept]];
  if (entry.subagent) parts.push(`subagent ${entry.subagent}`);
  const on = runsOn(entry.model, entry.effort);
  if (on) parts.push(on);
  if (entry.tokensOut !== null) {
    const thinking = entry.reasoningTokens ? ` (${formatTokens(entry.reasoningTokens)} thinking)` : "";
    parts.push(
      `${formatTokens(entry.tokensIn ?? 0)} in · ${formatTokens(entry.cachedTokensIn ?? 0)} cached · ${formatTokens(entry.tokensOut)} out${thinking}`,
    );
  }
  return parts.join(" · ");
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** `"2026-W38"` -> the Monday..Sunday range that ISO week covers, as `yyyy-mm-dd` (JAVA-56's
 *  week comparison mode). Week 1 is the week holding the year's first Thursday, so it's found
 *  from January 4th, which is always in week 1 by definition. */
export function isoWeekToRange(value: string): { from: string; to: string } {
  const [yearStr, weekStr] = value.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Monday=1..Sunday=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(end) };
}

/** The ISO week ("yyyy-Www") that today falls in -- the comparison picker's default. */
export function currentIsoWeek(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
