import type { Category, Priority, Signal, WriteResult } from "../backlog/types";
import { MEMORY_BACKEND, projectRequest, projectWrite } from "./project-api";

/** `GET`/`PUT /projects/{id}/precedence` (ADR 0032, JAVA-1686): the rules that raise cards and pull them into the sprint. */
export interface PrecedenceRule {
  id: string | null;
  name: string;
  reason: string;
  match: { epics: string[]; tags: string[]; categories: Category[]; signals: Signal[] };
  defaults: { priority: Priority | null; sprint: "none" | "join" };
}

interface PrecedenceRuleView {
  rule: PrecedenceRule;
  openMatches: number;
  dormant: boolean;
}

export interface PrecedenceList {
  rules: PrecedenceRuleView[];
  version: number;
  updatedAt: string | null;
}

export interface PrecedencePreview {
  openMatches: number;
  sampleKeys: string[];
  refusals: { code: string; index: number; field: string; message: string }[];
}

export const MAX_PRECEDENCE_RULES = 20;

const EMPTY: PrecedenceList = { rules: [], version: 0, updatedAt: null };

/** What the owner sends for a rule: the facets and defaults, nothing computed. */
const requestOf = (rule: PrecedenceRule) => ({ id: rule.id ?? undefined, name: rule.name, reason: rule.reason, match: rule.match, defaults: rule.defaults });

export async function getPrecedence(projectId: string): Promise<PrecedenceList> {
  // The memory backend (the e2e suite) has no precedence store: it reads as no rules.
  if (MEMORY_BACKEND) return EMPTY;
  return projectRequest<PrecedenceList>(`/projects/${projectId}/precedence`);
}

export async function setPrecedence(
  projectId: string,
  input: { expectedVersion: number; rules: PrecedenceRule[] },
): Promise<WriteResult<PrecedenceList>> {
  if (MEMORY_BACKEND) return { rules: input.rules.map((rule) => ({ rule, openMatches: 0, dormant: false })), version: input.expectedVersion + 1, updatedAt: null };
  return projectWrite<PrecedenceList>(`/projects/${projectId}/precedence`, {
    method: "PUT",
    body: JSON.stringify({ expectedVersion: input.expectedVersion, rules: input.rules.map(requestOf) }),
  });
}

export async function previewPrecedence(projectId: string, rule: PrecedenceRule): Promise<PrecedencePreview> {
  if (MEMORY_BACKEND) return { openMatches: 0, sampleKeys: [], refusals: [] };
  return projectRequest<PrecedencePreview>(`/projects/${projectId}/precedence/preview`, {
    method: "POST",
    body: JSON.stringify({ rule: requestOf(rule) }),
  });
}
