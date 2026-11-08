"use client";

import { useEffect, useRef, useState } from "react";
import { useTheaterScene } from "@javadaba/ui";

import { CardPageBody } from "../backlog/CardPageBody";
import { DEFAULT_PROJECT_ID, InMemoryBacklogRepository } from "../../lib/backlog/memory-repository";
import { PLAN_PROOF } from "./plan-script";
import { usePlanScript, type PlanSceneState } from "./use-plan-script";

function freshScene(pass: number): PlanSceneState {
  return { pass, repository: new InMemoryBacklogRepository(), detail: null };
}

/**
 * The plan scene, for the landing's Theater: the REAL card page (`CardPageBody`, the same panel
 * `/app/p/[projectId]/[key]` mounts) over a fresh in-memory repository per pass. The agent writes
 * through the repository; the person clicks the real status control. A refused move shows the
 * product's own message in the panel's alert.
 *
 * The proof line sits outside the panel, under it, with its source and date.
 */
export function PlanScene() {
  const pass = useTheaterScene()?.pass ?? 0;
  // Adjusted during render, as `board-scene.tsx` does: a new pass is a new repository, and the
  // script starts over on it.
  const [scene, setScene] = useState(() => freshScene(pass));
  if (scene.pass !== pass) setScene(freshScene(pass));
  const { repository, detail } = scene;
  usePlanScript(repository, DEFAULT_PROJECT_ID, setScene);

  // On a phone the panel stacks in one column and the plan sits below the frame's fold. Scroll the
  // panel's own body to it when it lands, never the frame: the frame holds the proof line, which must
  // not move. Once the card is in To do, the body goes back to the top so the status chip is on screen.
  const frame = useRef<HTMLDivElement>(null);
  const planWritten = Boolean(detail?.actionPlan?.trim());
  const status = detail?.status;
  useEffect(() => {
    const body = frame.current?.querySelector<HTMLElement>('[data-testid="card-body"]');
    if (!body) return;
    if (status === "todo") {
      body.scrollTop = 0;
      return;
    }
    const plan = body.querySelector<HTMLElement>('section[aria-label="Action plan"]');
    if (!planWritten || !plan) return;
    body.scrollTop += plan.getBoundingClientRect().top - body.getBoundingClientRect().top;
  }, [planWritten, status]);

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div ref={frame} className="flex min-h-0 flex-1 flex-col">
        {detail ? (
          <CardPageBody
            projectId={DEFAULT_PROJECT_ID}
            repository={repository}
            detail={detail}
            assignees={[]}
            agentWork={undefined}
            onChanged={(next) => setScene((s) => (s.repository === repository ? { ...s, detail: next } : s))}
            onOpenOther={() => undefined}
          />
        ) : (
          <p role="status" className="text-sm text-[color:var(--jd-muted)]">
            Loading the card...
          </p>
        )}
      </div>
      <p className="text-xs text-[color:var(--jd-muted)]">
        In Linear an agent&apos;s plan is a checklist inside its session, still a technology preview ({PLAN_PROOF.page},{" "}
        {PLAN_PROOF.checkedOn}). In Officium it is a field on the card.
      </p>
    </div>
  );
}
