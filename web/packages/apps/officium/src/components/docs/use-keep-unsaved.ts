"use client";

import { useEffect, type RefObject } from "react";
import { onBeforeLeave } from "@javadaba/sdk/platform";

import { stashDraft } from "../../lib/docs/unsaved-drafts";
import type { Draft } from "./use-doc-autosave";

/** Leaving keeps what is not saved: the browser asks before closing, and a failed save is stashed for the next visit. */
export function useKeepUnsaved(projectId: string, path: string, liveRef: RefObject<{ mounted: boolean; draft: Draft; unsaved: boolean; status: string }>) {
  useEffect(() => {
    const state = liveRef.current;
    const stop = onBeforeLeave(() => state.unsaved);
    state.mounted = true;
    return () => {
      stop();
      state.mounted = false;
      if (state.status === "failed" || state.status === "offline") stashDraft({ projectId, path, ...state.draft });
    };
  }, [projectId, path, liveRef]);
}
