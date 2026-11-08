"use client";

import { Button, Panel, Text } from "@javadaba/ui";

import { useCopy } from "../../lib/i18n/use-copy";

/**
 * The owner's toolbar over the project's cells: what is pending, and reset, discard and save (JAVA-243). Shown only
 * while the owner's plan covers editing; a lapsed owner gets `PlanLockedNotice` in its place.
 */
export function MatrixEditingBar({
  pending,
  atDefaults,
  baseName,
  saving,
  onResetAll,
  onDiscard,
  onSave,
}: {
  pending: number;
  atDefaults: boolean;
  baseName: string;
  saving: boolean;
  onResetAll: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const copy = useCopy().workProfile;
  // Wraps by content, not by breakpoint: the sidebar is resizable, so the room is not the viewport's (JAVA-1773).
  return (
    // Raised and pinned to the bottom of the page while there is something to save, so a long matrix never hides it (Cfg-Profile, "The editing bar").
    <Panel material="raised" radius="lg" className={`mb-6 flex flex-row flex-wrap items-center gap-3 border border-[color:var(--jd-line)] p-3 ${pending > 0 ? "sticky bottom-3 z-10" : ""}`}>
      <Text data-testid="role-matrix-pending" className="min-w-0 flex-1 basis-56 text-sm font-medium">
        {pending === 0 ? copy.pendingNone : pending === 1 ? copy.pendingOne : copy.pendingMany(pending)}
      </Text>
      <div className="flex min-w-0 max-w-full flex-row flex-wrap gap-2">
        <Button
          type="button"
          register="ui"
          variant="ghost"
          className="min-h-11 min-w-0 max-w-full whitespace-normal text-center"
          disabled={atDefaults || saving}
          title={atDefaults ? copy.resetAllAtBase(baseName) : undefined}
          onClick={onResetAll}
        >
          {copy.resetAll(baseName)}
        </Button>
        <Button type="button" register="ui" variant="outline" className="min-h-11" disabled={pending === 0 || saving} onClick={onDiscard}>
          {copy.discardChanges}
        </Button>
        <Button type="button" register="ui" className="min-h-11" disabled={pending === 0 || saving} onClick={onSave}>
          {saving ? copy.savingRoles : copy.saveRoles}
        </Button>
      </div>
    </Panel>
  );
}
