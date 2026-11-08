// Quality lineage of corrective cards (card://JAVA-1525): the wire shapes, the closed rule vocabulary and the
// description parser, twins of the API's QualityDimension, QualityRule and QualityLineage. Type-only imports, so
// node's test runner loads it as it is.
import type { Actor, Category, Status } from "./types";

export type QualityDimension =
  | "architecture"
  | "clean_code"
  | "testing_rigor"
  | "ux_and_polish"
  | "runtime_guardrails"
  | "functional";

export type EscapedPhase = "refine" | "action" | "review";

/** What a corrective card's description states: `causedBy` is the origin's key, or `legacy`. */
export interface LineageView {
  causedBy: string;
  escapedIn: EscapedPhase | null;
  qualityDimension: QualityDimension | null;
  violatedRules: string[];
}

/** One defect that escaped a card's delivery: the corrective card that names it, and how it escaped. */
export interface EscapedDefect {
  id: string;
  at: string;
  by: Actor;
  correctiveKey: string;
  escapedIn: EscapedPhase;
  qualityDimension: QualityDimension;
  violatedRules: string[];
}

/** A reviewer's verdict on one dimension of an approved card (card://JAVA-1526). */
export type QualityScore = "clean" | "minor_observations";

/** One exit of a card from review: an approval's scorecard, or a send-back's broken rules. */
export interface ReviewOutcome {
  id: string;
  at: string;
  by: Actor;
  role: string | null;
  from: Status;
  to: Status;
  verdict: "approved" | "sent_back";
  ruleViolations: string[];
  scorecard: Partial<Record<Exclude<QualityDimension, "functional">, QualityScore>>;
  observations: string | null;
  reviewReturnId: string | null;
}

/** `ReviewQuality.isApproval`: review to deploy or done. An epic's is no review of work, so it scores nothing. */
export const isApproval = (from: Status, to: Status, category?: Category | null): boolean =>
  from === "review" && (to === "deploy" || to === "done") && category !== "epic";

/** A spike never reaches Deploy (CardRules.requireNotDeployed): dropped on it from review, it is approved to done;
 *  from anywhere else it has no target. Null when the drop lands nowhere. */
export function landingStatus(from: Status, to: Status, category?: Category | null): Status | null {
  if (category !== "spike" || to !== "deploy") return to;
  return from === "review" ? "done" : null;
}

/** The dimensions an approval scores: every reviewed one, `ux_and_polish` only on a card touching the UI. */
export function scoredDimensions(signals: readonly string[]): Exclude<QualityDimension, "functional">[] {
  return (Object.keys(QUALITY_RULES) as Exclude<QualityDimension, "functional">[])
    .filter((dimension) => dimension !== "ux_and_polish" || signals.includes("touches-ui"));
}

/** The closed vocabulary, by reviewed dimension: rule ids are written `<dimension>:<rule>`. */
export const QUALITY_RULES: Record<Exclude<QualityDimension, "functional">, string[]> = {
  architecture: ["layer-violation", "cross-context-leak", "adr-non-compliance", "circular-dependency", "anemic-or-leaked-model"],
  clean_code: ["solid-srp", "solid-ocp-dip", "high-complexity", "dry-violation", "poor-naming", "type-safety-bypass", "dead-code"],
  testing_rigor: ["tautological-test", "missing-edge-cases", "broken-invariants", "excessive-mocking"],
  ux_and_polish: ["unpolished-interaction", "visual-inconsistency", "layout-or-responsive-flaw", "missing-feedback-states"],
  runtime_guardrails: ["n-plus-one-query", "unbounded-payload", "concurrency-version-ignored", "auth-or-permission-gap"],
};

export const DIMENSION_LABEL: Record<QualityDimension, string> = {
  architecture: "Architecture",
  clean_code: "Clean code",
  testing_rigor: "Testing rigor",
  ux_and_polish: "UX and polish",
  runtime_guardrails: "Security and performance",
  functional: "Functional",
};

const PHASES: EscapedPhase[] = ["refine", "action", "review"];
const CARD_KEY = /^[A-Z][A-Z0-9]{1,9}-[1-9][0-9]{0,8}$/;
const CORRECTIVE: Category[] = ["bug", "regression", "hotfix", "refactor", "technicalDebt", "enhancement"];

export function isQualityRule(id: string): boolean {
  const [dimension, rule] = id.split(":", 2);
  return (QUALITY_RULES as Record<string, string[]>)[dimension]?.includes(rule) ?? false;
}

export function isCorrective(category: Category | null): boolean {
  return category !== null && CORRECTIVE.includes(category);
}

/** Where a lineage is checked and recorded: entering work out of Refine, or a run ending. */
export function isLineageCheckpoint(from: Status | null, to: Status): boolean {
  const endsRun = ["review", "deploy", "done"];
  const entersWork = (to === "todo" || to === "doing") && (from === null || from === "refine");
  return entersWork || (endsRun.includes(to) && (from === null || !endsRun.includes(from)));
}

function unquoted(value: string): string {
  return value.trim().replace(/^[`*_"']+|[`*_"'.]+$/g, "");
}

function lineValue(label: string, description: string): string | null {
  const match = new RegExp(`^\\s*(?:[-*]\\s+)?\\**${label}\\**:\\**[ \\t]*(\\S.*)$`, "im").exec(description);
  const value = match ? unquoted(match[1]) : "";
  return value === "" ? null : value;
}

function firstWord(value: string | null): string {
  return value === null ? "" : unquoted(value.trim().split(/[\s,;(]+/, 1)[0]);
}

/** The lineage the description states, when it is complete and in the vocabulary; null otherwise. */
export function parseLineage(description: string | null | undefined): LineageView | null {
  if (!description) return null;
  const origin = firstWord(lineValue("Caused by", description));
  if (origin.toLowerCase() === "legacy") return { causedBy: "legacy", escapedIn: null, qualityDimension: null, violatedRules: [] };
  if (!CARD_KEY.test(origin)) return null;
  const phase = firstWord(lineValue("Escaped in", description)) as EscapedPhase;
  const dimension = firstWord(lineValue("Quality dimension", description)) as QualityDimension;
  const rules = lineValue("Violated rules", description);
  if (!PHASES.includes(phase) || !(dimension in DIMENSION_LABEL) || rules === null) return null;
  const ids = rules.toLowerCase() === "none" ? [] : rules.split(/[,;\s]+/).map(unquoted).filter((id) => id !== "");
  if (!ids.every(isQualityRule)) return null;
  return { causedBy: origin, escapedIn: phase, qualityDimension: dimension, violatedRules: [...new Set(ids)] };
}
