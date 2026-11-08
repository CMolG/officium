"use client";

import { useId, useState } from "react";
import { GitMerge, Play, Square } from "lucide-react";

import { Button, Popover, PopoverContent, PopoverTrigger, Text, useConfirmDialog } from "@javadaba/ui";

import { useBoardAutoloop } from "../../../lib/autoloop/autoloop-context";
import { GateWhy } from "./GateWhy";
import { GATE_BANNER_ID } from "./IntegrationGateBanner";

const GATE_REASON = "The autoloop starts again once the control branch is merged into main. The banner above says what to merge.";
const OFFLINE_REASON = "No autoloop of yours is beating on this project. Start one in standby with /autoloop standby and this button starts it.";

/**
 * The project's autoloop from the board (card://JAVA-1528), left of Members. Offline (no beat for 90 s): neutral
 * "Stop Autoloop" that does nothing but say why, on hover and, since a phone or a keyboard has no hover, on a
 * tap or Enter (aria-disabled, so it stays focusable). Idle (waiting in standby): "Start Autoloop" with a red pulse,
 * which queues `start`. Running: red "Stop Autoloop", which asks first and queues `stop`. Until its first read it
 * says so, and a failed read says that, instead of claiming offline. While the integration gate is open (card://JAVA-1820)
 * it reads "Waiting for merge" and starts nothing, whatever the loop is doing, and points at the banner that says what to merge. The loop takes the order on its next beat.
 */
export function AutoloopControlButton({ canWrite }: { canWrite: boolean }) {
  const autoloop = useBoardAutoloop();
  const { status = null, failed = false, busy = false, problem = null, start, stop } = autoloop ?? {};
  const [explained, setExplained] = useState(false);
  const confirm = useConfirmDialog();
  const reasonId = useId();
  const gated = status?.gate?.open === true;
  const state = gated ? "gated" : (status?.state ?? (failed ? "unknown" : "loading"));
  const pending = status?.pending ?? null;

  async function askToStop() {
    const sure = await confirm.confirm({
      title: "Are you sure you want to stop the autoloop?",
      description: "Every session stops on the loop's next beat. Worktrees, claims and conversations are kept, and the loop waits here until you start it again.",
      confirmLabel: "Stop Autoloop",
      cancelLabel: "Keep it running",
      destructive: true,
    });
    if (sure) await stop?.();
  }

  // The seven states the design draws (Off-Board2): the word after the dot says where the loop is, and a state
  // that cannot be acted on says why in words beside the button, not only on hover.
  const WORD = { gated: "waiting for the gate", idle: "idle", running: "running", offline: "offline", unknown: "unknown", loading: null } as const;
  const label = WORD[state as keyof typeof WORD] ? `Autoloop · ${WORD[state as keyof typeof WORD]}` : "Autoloop";
  const help =
    state === "gated" ? "Merge the control branch first"
    : state === "offline" ? "No agent machine online"
    : state === "unknown" ? "Status unknown. It tries again in a moment."
    : null;
  const reason =
    state === "gated" ? GATE_REASON
    : state === "loading" ? "Reading the autoloop's state…"
    : state === "unknown" ? "Couldn't read the autoloop's state. It tries again in a moment."
    : state === "offline" ? OFFLINE_REASON
    : !canWrite ? "Only an editor or the owner can start or stop the autoloop."
    : null;
  const waiting = pending === "start" ? "Autoloop · starting" : pending === "stop" ? "Autoloop · stopping" : null;

  if (autoloop === null) return null;
  const gate = status?.gate;
  const button = (
      <Button
        type="button"
        register="ui"
        variant={state === "running" ? "solid" : "outline"}
        size="sm"
        data-testid="autoloop-control"
        data-state={state}
        disabled={busy || pending !== null}
        aria-disabled={reason ? true : undefined}
        title={reason ?? undefined}
        aria-describedby={reason ? (gated ? `${reasonId} ${GATE_BANNER_ID}` : reasonId) : undefined}
        onClick={() => (reason ? setExplained(true) : void (state === "idle" ? start?.() : askToStop()))}
        className="ml-auto min-h-11 shrink-0 sm:min-h-0"
      >
        {state === "gated" ? (
          <GitMerge size={12} aria-hidden="true" />
        ) : state === "idle" ? (
          <span className="relative flex flex-row size-2.5 shrink-0 text-destructive" aria-hidden="true">
            <span data-testid="autoloop-pulse" className="absolute size-full rounded-full bg-current opacity-60 motion-safe:animate-ping" />
            <Play size={10} className="relative fill-current" />
          </span>
        ) : (
          <Square size={11} className="fill-current" aria-hidden="true" />
        )}
        <Text className="max-sm:sr-only">{state === "gated" ? label : (waiting ?? label)}</Text>
      </Button>
  );
  return (
    <>
      {/* While the gate is closed the button opens the reasons, the rules and a way to stop (Off-Board, "The Autoloop button says it waits"). */}
      {gated && gate && status ? (
        <Popover>
          <PopoverTrigger asChild>{button}</PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <GateWhy gate={gate} projectId={status.projectId} onStop={canWrite && status.state === "running" ? () => void askToStop() : undefined} />
          </PopoverContent>
        </Popover>
      ) : (
        button
      )}
      {help && <Text className="text-xs text-[color:var(--jd-muted)] max-sm:sr-only">{help}</Text>}
      {reason && (
        <Text id={reasonId} role={explained ? "status" : undefined} data-testid="autoloop-reason"
          className={explained ? "basis-full text-xs text-[color:var(--jd-muted)] sm:basis-auto" : "sr-only"}>
          {reason}
        </Text>
      )}
      {problem && (
        <Text role="alert" className="text-xs font-medium text-destructive">
          {problem}
        </Text>
      )}
      {confirm.dialog}
    </>
  );
}
