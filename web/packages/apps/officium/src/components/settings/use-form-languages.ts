"use client";

import { useEffect, useMemo, useState } from "react";

import { MAX_FORM_LANGUAGES, normalizeFormLanguage } from "../../lib/backlog/form-languages";
import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { Project } from "../../lib/backlog/types";
import { publishProject } from "../../lib/backlog/project-list";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((code, index) => code === b[index]);

/** Loads the project (its form languages and the owner check), and saves the list the owner edits. */
export function useFormLanguages(projectId: string) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    let cancelled = false;
    repository.getProject(projectId).then(
      (value) => {
        if (cancelled) return;
        setProject(value);
        setDraft(value.formLanguages);
        setLoadError(null);
      },
      (err: unknown) => !cancelled && setLoadError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt]);

  const isOwner = project?.role === "owner";
  const unchanged = project !== null && sameList(draft, project.formLanguages);
  const full = draft.length >= MAX_FORM_LANGUAGES;

  function touch() {
    setSaved(false);
    setSaveError(null);
    setConflict(false);
  }

  /** Adds a code the owner typed or one of the suggestions; a code it cannot read says so inline. */
  function add(code: string) {
    const normalized = normalizeFormLanguage(code);
    if (!normalized) {
      setInputError("Use a language code such as es or pt-br");
      return;
    }
    if (draft.includes(normalized)) {
      setInputError(`${normalized} is already listed`);
      return;
    }
    setInputError(null);
    setInput("");
    touch();
    setDraft([...draft, normalized]);
  }

  function remove(code: string) {
    touch();
    setDraft(draft.filter((listed) => listed !== code));
  }

  async function save() {
    if (!project) return;
    setSaving(true);
    touch();
    try {
      const result = await repository.setFormLanguages(projectId, { expectedVersion: project.version, formLanguages: draft });
      if ("error" in result) {
        setConflict(true);
        return;
      }
      // Every surface drawing this project shows the new version at once (JAVA-125).
      publishProject(result, repository);
      setProject(result);
      setDraft(result.formLanguages);
      setSaved(true);
    } catch (err) {
      setSaveError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return {
    project, loadError, isOwner, draft, input, setInput, inputError, full, unchanged, saving, saved, saveError, conflict,
    add, remove, save,
    retry: () => setAttempt((n) => n + 1),
  };
}
