"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { useState } from "react";

import type { MarkdownChange } from "@javadaba/rich-text";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import { isConflict, type CardDetail } from "../../../lib/backlog/types";
import type { OnChanged, ReportConflict } from "./types";

type EditableText = "description" | "actionPlan";

export interface CardTextEditingInput {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  onChanged: OnChanged;
  reportConflict: ReportConflict;
  setError: (message: string | null) => void;
}

/** Editing the title and the two texts: the drafts, the save and the guard against losing them. */
export function useCardTextEditing({ projectId, repository, detail, onChanged, reportConflict, setError }: CardTextEditingInput) {
  const [isEditing, setIsEditing] = useState(false);
  const [focusField, setFocusField] = useState<EditableText>("description");
  const [titleDraft, setTitleDraft] = useState(detail.title);
  const [textDrafts, setTextDrafts] = useState<Partial<Record<EditableText, MarkdownChange>>>({});
  const [unsavedNotice, setUnsavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleBlank = titleDraft.trim() === "";
  const dirty =
    titleDraft.trim() !== detail.title
    || Boolean(textDrafts.description?.changed)
    || Boolean(textDrafts.actionPlan?.changed);

  function startEditing(field: EditableText = "description") {
    setTitleDraft(detail.title);
    setTextDrafts({});
    setFocusField(field);
    setUnsavedNotice(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setTextDrafts({});
    setUnsavedNotice(false);
  }

  async function saveEdits() {
    if (titleBlank || saving) return;
    const patch: { title?: string; description?: string; actionPlan?: string } = {};
    if (titleDraft.trim() !== detail.title) patch.title = titleDraft.trim();
    if (textDrafts.description?.changed) patch.description = textDrafts.description.markdown;
    if (textDrafts.actionPlan?.changed) patch.actionPlan = textDrafts.actionPlan.markdown;
    // Nothing changed: nothing to send. Saving the same content is not an edit (2026-09-23).
    if (Object.keys(patch).length === 0) {
      cancelEditing();
      return;
    }
    setSaving(true);
    try {
      const result = await repository.updateCard(projectId, detail.id, { expectedVersion: detail.version, ...patch });
      if (isConflict(result)) {
        reportConflict(result, saveEdits);
        return;
      }
      await onChanged({ ...detail, ...result });
      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the card.");
    } finally {
      setSaving(false);
    }
  }

  /** Unsaved text is never thrown away by a stray Escape or click outside: the person decides. */
  function guardUnsaved(event: Event) {
    if (!isEditing) return;
    event.preventDefault();
    // Escape inside the link box, or while the text-style menu is open, only closes that.
    if (event.target instanceof Element && event.target.closest("[role='toolbar']")) return;
    if (document.querySelector("[data-jd-floating-layer]")) return;
    if (dirty) setUnsavedNotice(true);
    else cancelEditing();
  }

  /** A press in a floating panel of the editor (the text-style menu) is not a press outside. */
  function onInteractOutside(event: Event) {
    if (event.target instanceof Element && event.target.closest("[data-jd-floating-layer]")) return;
    if (isEditing && dirty) {
      event.preventDefault();
      setUnsavedNotice(true);
    }
  }

  return {
    isEditing,
    focusField,
    titleDraft,
    setTitleDraft,
    setTextDrafts,
    unsavedNotice,
    saving,
    titleBlank,
    startEditing,
    cancelEditing,
    saveEdits,
    guardUnsaved,
    onInteractOutside,
  };
}

export type CardTextEditing = ReturnType<typeof useCardTextEditing>;
