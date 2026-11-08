import { CATEGORY_CONFIG } from "../backlog/category-config";
import { PRIORITY_CONFIG } from "../backlog/status-config";
import { SIGNAL_LABEL } from "../backlog/role-config";
import type { Category, Signal } from "../backlog/types";
import type { PrecedenceRule } from "./precedence";

/** One "if" of a rule: a facet and the one value it names (the server holds lists; the editor offers one per facet). */
export type ConditionFacet = "category" | "tag" | "epic" | "signal";
export interface Condition {
  facet: ConditionFacet;
  value: string;
}

export const FACET_LABEL: Record<ConditionFacet, string> = { category: "Category", tag: "Tag", epic: "Epic", signal: "Signal" };
export const FACET_ORDER: readonly ConditionFacet[] = ["category", "tag", "epic", "signal"];

export function conditionsOf(rule: PrecedenceRule): Condition[] {
  const { categories, tags, epics, signals } = rule.match;
  return [
    ...categories.map((value): Condition => ({ facet: "category", value })),
    ...tags.map((value): Condition => ({ facet: "tag", value })),
    ...epics.map((value): Condition => ({ facet: "epic", value })),
    ...signals.map((value): Condition => ({ facet: "signal", value })),
  ];
}

/** The rule's match from its conditions: values of one facet go to the same list, empty values name nothing. */
export function withConditions(rule: PrecedenceRule, conditions: Condition[]): PrecedenceRule {
  const named = conditions.filter((c) => c.value.trim() !== "");
  const of = (facet: ConditionFacet) => named.filter((c) => c.facet === facet).map((c) => c.value.trim());
  return {
    ...rule,
    match: {
      categories: of("category") as Category[],
      tags: of("tag"),
      epics: of("epic"),
      signals: of("signal") as Signal[],
    },
  };
}

export function valueLabel(condition: Condition): string {
  if (condition.facet === "category") return CATEGORY_CONFIG[condition.value as Category]?.label ?? condition.value;
  if (condition.facet === "signal") return SIGNAL_LABEL[condition.value as Signal] ?? condition.value;
  return condition.value;
}

export const priorityLabel = (rule: PrecedenceRule) => (rule.defaults.priority ? PRIORITY_CONFIG[rule.defaults.priority].label : null);

export function blankRule(index: number): PrecedenceRule {
  return {
    id: null,
    name: `Rule ${index}`,
    reason: "",
    match: { epics: [], tags: [], categories: [], signals: [] },
    defaults: { priority: "high", sprint: "none" },
  };
}

/** Why a rule cannot be saved yet, in words; null when it can. */
export function ruleProblem(rule: PrecedenceRule): string | null {
  if (rule.name.trim() === "" || rule.name.length > 80) return "Give the rule a name of 1 to 80 characters.";
  if (rule.reason.trim() === "" || rule.reason.length > 500) return "Say why the rule exists, in 1 to 500 characters.";
  if (conditionsOf(rule).length === 0) return "A rule names at least one condition.";
  if (!rule.defaults.priority && rule.defaults.sprint === "none") return "A rule raises a priority or joins the sprint.";
  return null;
}
