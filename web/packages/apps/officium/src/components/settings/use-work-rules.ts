"use client";

import { useEffect, useMemo, useState } from "react";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { Project } from "../../lib/backlog/types";
import { WORK_RULES_TOKEN_QUOTA, estimateTokens, totalTokens } from "../../lib/work-rules/tokens";

/** The longest one rule may be (JAVA-1446). There is no count cap: the token quota bounds the list (JAVA-1778). */
export const MAX_ITEM_LENGTH = 200;

/** The first thing wrong with the list, by item position (0-based): the view words it. */
export type Problem = { kind: "empty"; index: number } | { kind: "long"; index: number } | { kind: "repeat"; index: number; other: number };

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/** The first item that is blank, too long, or the same as an earlier one (ignoring case); null when every item is fine. */
export function findProblem(items: string[]): Problem | null {
  const seen = new Map<string, number>();
  for (const [index, raw] of items.entries()) {
    const item = raw.trim();
    if (item === "") return { kind: "empty", index };
    if (item.length > MAX_ITEM_LENGTH) return { kind: "long", index };
    const other = seen.get(item.toLowerCase());
    if (other !== undefined) return { kind: "repeat", index, other };
    seen.set(item.toLowerCase(), index);
  }
  return null;
}

/** Loads the project's standing Definition of Done and edits it as a list; saves it for the owner. */
export function useWorkRules(projectId: string) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // A problem is named as an error once the owner has left the item it is about: a fresh blank row is not an error yet.
  const [blurred, setBlurred] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository.getProject(projectId).then(
      (value) => {
        if (cancelled) return;
        setProject(value);
        setItems(value.definitionOfDone);
        setLoadError(null);
      },
      (err: unknown) => !cancelled && setLoadError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt]);

  // A change to the project (its owner, its version) re-reads the project, never the list being edited.
  useEffect(
    () =>
      repository.subscribe(projectId, () => {
        repository.getProject(projectId).then(setProject, () => undefined);
      }),
    [projectId, repository],
  );

  const isOwner = project?.role === "owner";
  const problem = items === null ? null : findProblem(items);
  const total = totalTokens(items ?? []);
  const quota = project?.definitionOfDoneTokenQuota ?? WORK_RULES_TOKEN_QUOTA;
  const over = Math.max(0, total - quota);
  const valid = items !== null && problem === null && over === 0;
  const problemShown = problem !== null && problem.index === blurred;
  const unchanged = items !== null && project !== null && JSON.stringify(items) === JSON.stringify(project.definitionOfDone);

  function edit(next: string[]) {
    setItems(next);
    setSaved(false);
    setSaveError(null);
  }

  async function save() {
    if (!project || !items || !valid) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const next = await repository.setDefinitionOfDone(projectId, {
        expectedVersion: project.version,
        definitionOfDone: items.map((item) => item.trim()),
      });
      setProject(next);
      setItems(next.definitionOfDone);
      setSaved(true);
    } catch (err) {
      setSaveError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return {
    project,
    items,
    loadError,
    isOwner,
    problem,
    problemShown,
    tokens: (items ?? []).map(estimateTokens),
    total,
    quota,
    over,
    valid,
    unchanged,
    saving,
    saved,
    saveError,
    save,
    retry: () => setAttempt((n) => n + 1),
    blurItem: (index: number) => setBlurred(index),
    setItem: (index: number, value: string) => edit((items ?? []).map((item, i) => (i === index ? value : item))),
    addItem: () => edit([...(items ?? []), ""]),
    removeItem: (index: number) => edit((items ?? []).filter((_, i) => i !== index)),
  };
}
