"use client";

import { Button, Note, Radio } from "@javadaba/ui";

import { useCopy } from "../../lib/i18n/use-copy";
import { ConfigSection } from "../configuration/ConfigSection";
import { useExecutionMode } from "./use-execution-mode";

/**
 * How agents pick the next card (card://JAVA-1873, epic JAVA-1868): card by card, or each open epic in one session. The
 * owner chooses and saves; everyone reads. Each mode says in place what it does, and the owner sees, before saving, how
 * many open cards an epic-by-epic project would work inside epics.
 */
export function ExecutionModeSetting({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const copy = useCopy().configuration.workRules.executionMode;
  const { setting, draft, preview, loadError, saving, saved, conflict, saveError, choose, cancel, save } = useExecutionMode(projectId, isOwner);
  if (loadError) return <Note tone="neutral">{copy.loadError}</Note>;
  if (!setting || draft === null) return null;
  const changed = draft !== setting.mode;
  return (
    <div data-testid="execution-mode">
      <ConfigSection title={copy.heading} label={copy.heading} hint="How agents pick the next card.">
        <fieldset className="flex flex-col gap-3" disabled={!isOwner || saving}>
          <legend className="sr-only">{copy.label}</legend>
          <Radio name="execution-mode" checked={draft === "card"} onChange={() => choose("card")} description={copy.cardHelp}>
            {copy.card}
          </Radio>
          <Radio name="execution-mode" checked={draft === "epic"} onChange={() => choose("epic")} description={copy.epicHelp}>
            {copy.epic}
          </Radio>
        </fieldset>
        {preview && (
          <p className="m-0 text-sm text-[color:var(--jd-muted)]" data-testid="execution-mode-preview">
            {copy.preview(preview.inEpics, preview.openCards, preview.epics.length, preview.standalone)}
          </p>
        )}
        {!isOwner && <Note tone="neutral">{copy.readOnly}</Note>}
        {saved && <Note tone="success" role="status">{copy.saved(setting.mode === "epic")}</Note>}
        {conflict && <Note tone="warning">{copy.conflict}</Note>}
        {saveError && <Note tone="danger">{saveError}</Note>}
        {isOwner && (
          <div className="flex flex-row flex-wrap gap-2">
            <Button type="button" register="ui" variant="ghost" className="min-h-11" disabled={!changed || saving} onClick={cancel}>
              Cancel
            </Button>
            <Button type="button" register="ui" className="min-h-11" disabled={!changed || saving} onClick={() => void save()}>
              {saving ? copy.saving : "Save"}
            </Button>
          </div>
        )}
      </ConfigSection>
    </div>
  );
}
