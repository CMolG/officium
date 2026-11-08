"use client";

import { useEffect, useState } from "react";

import { isConflict } from "../../../lib/backlog/types";
import { messageOf } from "../../../lib/configuration/project-api";
import {
  getPrecedence,
  MAX_PRECEDENCE_RULES,
  setPrecedence,
  type PrecedenceList,
  type PrecedenceRule,
} from "../../../lib/configuration/precedence";
import { blankRule, ruleProblem } from "../../../lib/configuration/precedence-model";

/** A rule as the page holds it while it is edited: the rule, and how many open cards it caught when last saved. */
export interface DraftRule {
  key: string;
  rule: PrecedenceRule;
  openMatches: number | null;
}

let counter = 0;
const keyed = (rule: PrecedenceRule, openMatches: number | null): DraftRule => ({ key: rule.id ?? `new-${++counter}`, rule, openMatches });

const fromList = (list: PrecedenceList) => list.rules.map((view) => keyed(view.rule, view.openMatches));

/**
 * A project's precedence list as a draft (ADR 0032, JAVA-1686): rules are added, edited, moved and removed locally and
 * written together under the list's version. The server counts each rule's open matches; a draft rule shows none until saved.
 */
export function usePrecedence(projectId: string) {
  const [list, setList] = useState<PrecedenceList | null>(null);
  const [rules, setRules] = useState<DraftRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPrecedence(projectId).then(
      (value) => {
        if (cancelled) return;
        setList(value);
        setRules(fromList(value));
        setLoadError(null);
      },
      (err: unknown) => !cancelled && setLoadError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, attempt]);

  const touch = (next: DraftRule[]) => {
    setRules(next);
    setSaved(false);
  };
  const changes = list === null ? 0 : countChanges(list, rules);
  const firstProblem = rules.map((r) => ruleProblem(r.rule)).find((p) => p !== null) ?? null;

  async function save() {
    if (!list || firstProblem) return;
    setSaving(true);
    setSaved(false);
    setConflict(false);
    setSaveError(null);
    try {
      const result = await setPrecedence(projectId, { expectedVersion: list.version, rules: rules.map((r) => r.rule) });
      if (isConflict(result)) {
        setList(result.current);
        setRules(fromList(result.current));
        setConflict(true);
      } else {
        setList(result);
        setRules(fromList(result));
        setSaved(true);
      }
    } catch (err) {
      setSaveError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return {
    list,
    rules,
    loadError,
    saving,
    saved,
    conflict,
    saveError,
    changes,
    firstProblem,
    full: rules.length >= MAX_PRECEDENCE_RULES,
    add: () => {
      const added = keyed(blankRule(rules.length + 1), null);
      touch([...rules, added]);
      return added.key;
    },
    replace: (key: string, rule: PrecedenceRule) => touch(rules.map((r) => (r.key === key ? { ...r, rule, openMatches: null } : r))),
    remove: (key: string) => touch(rules.filter((r) => r.key !== key)),
    move: (key: string, by: -1 | 1) => {
      const from = rules.findIndex((r) => r.key === key);
      const to = from + by;
      if (from < 0 || to < 0 || to >= rules.length) return;
      const next = [...rules];
      [next[from], next[to]] = [next[to]!, next[from]!];
      touch(next);
    },
    save,
    discard: () => list && (setRules(fromList(list)), setSaved(false)),
    retry: () => setAttempt((n) => n + 1),
  };
}

/** How many rules differ from the saved list: added, removed, edited or moved. */
function countChanges(list: PrecedenceList, rules: DraftRule[]): number {
  const saved = list.rules.map((view) => JSON.stringify(view.rule));
  const now = rules.map((r) => JSON.stringify(r.rule));
  const length = Math.max(saved.length, now.length);
  let changed = 0;
  for (let i = 0; i < length; i += 1) if (saved[i] !== now[i]) changed += 1;
  return changed;
}
