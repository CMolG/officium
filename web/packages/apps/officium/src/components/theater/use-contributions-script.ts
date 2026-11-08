"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheaterScene } from "@javadaba/ui";

import { SAMPLE_PROFILES } from "./contributions-sample";
import { CONTRIBUTIONS_STEP_MS, PROFILE_DEFAULTS, PROFILE_ECO } from "./contributions-script";
import type { CostRead } from "./contributions-view";
import { useSceneSteps, type SceneStep } from "./use-scene-steps";

interface ContributionsCtx {
  /** Applies Eco, unless the viewer has already chosen on this pass. */
  ensureEco: () => void;
}

const STEPS: readonly SceneStep<ContributionsCtx>[] = [
  // Reduced motion plays no cursor, so this step is what puts the end state on screen.
  {
    at: CONTRIBUTIONS_STEP_MS.ensure,
    run: async ({ ensureEco }) => ensureEco(),
  },
];

interface Current {
  pass: number;
  read: CostRead;
  choice: string;
  touched: boolean;
}

const fresh = (pass: number): Current => ({ pass, read: { status: "loading" }, choice: PROFILE_DEFAULTS, touched: false });

/**
 * The cost scene's state. Every Theater pass starts from the loading skeleton and the defaults, and
 * a viewer's own pick is kept on that pass so the script never overwrites it. No repository, no
 * client, no fetch: the sample is a constant.
 */
export function useContributionsScript() {
  const pass = useTheaterScene()?.pass ?? 0;
  // State adjusted during render, not memoised: React Compiler would keep the first value forever.
  const [current, setCurrent] = useState(() => fresh(pass));
  if (current.pass !== pass) setCurrent(fresh(pass));

  useEffect(() => {
    queueMicrotask(() =>
      setCurrent((prev) =>
        prev.pass === pass && prev.read.status === "loading"
          ? { ...prev, read: { status: "ready", rows: SAMPLE_PROFILES } }
          : prev,
      ),
    );
  }, [pass]);

  const makeCtx = useCallback(
    (): ContributionsCtx => ({
      ensureEco: () =>
        setCurrent((prev) => (prev.pass === pass && !prev.touched ? { ...prev, choice: PROFILE_ECO } : prev)),
    }),
    [pass],
  );
  useSceneSteps(STEPS, makeCtx, pass);

  const setChoice = useCallback((value: string) => setCurrent((prev) => ({ ...prev, choice: value, touched: true })), []);

  return { read: current.read, choice: current.choice, setChoice };
}
