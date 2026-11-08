"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheaterScene } from "@javadaba/ui";

import { setProjectNotice } from "../../lib/backlog/project-notice";
import { EXPORT_PREPARING } from "../projects/project-menu-entries";
import { EXPORT_FILE_GAP_MS, EXPORT_STEP_MS } from "./export-script";
import { EXPORT_ZIP, SAMPLE_CARDS } from "./export-sample";
import { useSceneSteps, type SceneStep } from "./use-scene-steps";

interface ExportCtx {
  list: () => void;
  file: (filed: number) => void;
  zip: () => void;
  openFirst: () => void;
  scroll: (to: number) => void;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STEPS: readonly SceneStep<ExportCtx>[] = [
  { at: 900, run: async ({ list }) => list() },
  // The cards leave the list one after another, so the eye follows each one.
  ...SAMPLE_CARDS.map((_, i) => ({
    at: EXPORT_STEP_MS.files + i * EXPORT_FILE_GAP_MS,
    run: async ({ file }: ExportCtx) => file(i + 1),
  })),
  { at: EXPORT_STEP_MS.zip, run: async ({ zip }) => zip() },
  // Reduced motion rests on the files list, unopened: nothing moves and nothing is opened for the viewer.
  { at: EXPORT_STEP_MS.open, run: async ({ openFirst }) => openFirst() },
  { at: EXPORT_STEP_MS.title, run: async ({ scroll }) => scroll(1) },
  { at: EXPORT_STEP_MS.end, run: async ({ scroll }) => scroll(2) },
];

interface Current {
  pass: number;
  listed: boolean;
  /** How many of the cards have left the list as files, in order. */
  filed: number;
  opened: boolean;
  /** Where the opened file's pane is scrolled: 0 top, 1 its title, 2 its end. */
  scrolled: number;
}

const fresh = (pass: number): Current => ({ pass, listed: false, filed: 0, opened: false, scrolled: 0 });

/**
 * The leave-anytime scene's state. Every Theater pass starts from the skeleton, and the notice is the
 * real one, cleared at each pass and on unmount. No repository, no download, no fetch: the sample is
 * a constant, and the export's own control only sets the notice the app would set.
 */
export function useExportScript() {
  const pass = useTheaterScene()?.pass ?? 0;
  // State adjusted during render, not memoised: React Compiler would keep the first value forever.
  const [current, setCurrent] = useState(() => fresh(pass));
  if (current.pass !== pass) setCurrent(fresh(pass));

  useEffect(() => {
    setProjectNotice(null);
    return () => setProjectNotice(null);
  }, [pass]);

  const makeCtx = useCallback(
    (): ExportCtx => ({
      list: () => setCurrent((prev) => (prev.pass === pass ? { ...prev, listed: true } : prev)),
      file: (filed) => setCurrent((prev) => (prev.pass === pass ? { ...prev, filed } : prev)),
      zip: () => setProjectNotice(`Exported ${EXPORT_ZIP}`),
      openFirst: () => {
        if (reducedMotion()) return;
        setCurrent((prev) => (prev.pass === pass ? { ...prev, opened: true } : prev));
      },
      scroll: (scrolled) => setCurrent((prev) => (prev.pass === pass ? { ...prev, scrolled } : prev)),
    }),
    [pass],
  );
  useSceneSteps(STEPS, makeCtx, pass);

  /** What the real control does when it is chosen: the same notice the app sets, nothing downloads. */
  const startExport = useCallback(() => setProjectNotice(EXPORT_PREPARING), []);

  return {
    listed: current.listed,
    filed: current.filed,
    opened: current.opened,
    scrolled: current.scrolled,
    startExport,
  };
}
