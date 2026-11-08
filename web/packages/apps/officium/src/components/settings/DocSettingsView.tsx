"use client";

import { Button, FieldError, FieldHelp, Input, Label, Note, Text } from "@javadaba/ui";

import { useDocSettings } from "./use-doc-settings";
import { formatBytes } from "../../lib/docs/format-bytes";
import { useCopy } from "../../lib/i18n/use-copy";
import { ConfigPage } from "../configuration/ConfigPage";
import { ConfigSection } from "../configuration/ConfigSection";
import { ConfigLoadError } from "../configuration/ConfigLoadError";
import { ConfigLoading } from "../configuration/ConfigLoading";

const HISTORY_ID = "doc-history-days";

/**
 * How long a page's two recent versions are kept (JAVA-794), and what the documentation weighs.
 * The heaviest version of a page is kept for good whatever this says; only the owner changes it,
 * and everyone else reads it with the reason. A shorter window applies to what is kept at once.
 */
export function DocSettingsView({ projectId }: { projectId: string }) {
  const { settings, loadError, roleError, shortens, days, saving, saved, saveError, valid, unchanged, isOwner, retry, save, markEdited } =
    useDocSettings(projectId);
  const { configuration } = useCopy();
  const count = Number(days);

  return (
    <ConfigPage title={configuration.sections.documentation} lede="This project's page history and what its documentation takes.">
      {loadError && !settings && <ConfigLoadError title="Couldn't load the settings" detail={loadError} onRetry={retry} />}
      {!settings && !loadError && <ConfigLoading label="Loading the settings" />}

      {settings && (
        <>
          <ConfigSection
            title="Page history"
            label="How long history is kept"
            hint="Every page keeps its heaviest version for good, and its two latest previous versions for this many days after they were replaced. 0 keeps only the heaviest. Kept versions count against the owner's storage."
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={HISTORY_ID}>Days to keep recent versions (0 to 3650)</Label>
              <div className="flex flex-row items-center gap-2">
                <Input
                  id={HISTORY_ID}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={3650}
                  value={days}
                  disabled={!isOwner}
                  aria-invalid={!valid || undefined}
                  className="max-w-40"
                  onChange={(e) => markEdited(e.target.value)}
                />
                <Text className="text-sm text-[color:var(--jd-muted)]">days</Text>
              </div>
              <FieldHelp>0 to 3,650. 0 keeps no history beyond the heaviest version.</FieldHelp>
              {isOwner && !valid && <FieldError>Use a whole number of days from 0 to 3650.</FieldError>}
            </div>
            {!isOwner && (
              <Note tone="neutral">
                {roleError
                  ? `Couldn't read your role in this project, so the window is read-only: ${roleError}`
                  : "Only the project's owner changes this."}
              </Note>
            )}
            {saveError && <Note tone="danger">{saveError}</Note>}
            {saved && <Note tone="success" role="status">Saved. Versions past the new window are gone.</Note>}
            {isOwner && shortens && (
              <Note tone="warning">
                {`Saving deletes the recent versions older than ${count} ${count === 1 ? "day" : "days"} in every page of this project now. This can't be undone.`}
              </Note>
            )}
            {isOwner && (
              <div className="flex flex-row flex-wrap gap-2">
                <Button type="button" register="ui" variant="ghost" className="min-h-11" disabled={saving || unchanged} onClick={() => markEdited(String(settings.historyDays))}>
                  Cancel
                </Button>
                <Button type="button" register="ui" className="min-h-11" disabled={saving || !valid || unchanged} onClick={() => void save()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </ConfigSection>

          <ConfigSection title="What the documentation takes" hint="Old versions take the most; a shorter history window frees them.">
            <dl className="flex flex-col" data-testid="doc-storage">
              {(
                [
                  ["Pages", settings.storage.pagesBytes],
                  ["History", settings.storage.historyBytes],
                  ["Attachments", settings.storage.attachmentsBytes],
                  ["Comments", settings.storage.commentsBytes],
                  ["Trash", settings.storage.trashBytes],
                ] as const
              ).map(([label, bytes]) => (
                <div key={label} className="flex flex-row justify-between gap-3 border-b border-[color:var(--jd-line)] py-2.5 text-sm">
                  <dt>{label}</dt>
                  <dd className="font-mono tabular-nums">{formatBytes(bytes)}</dd>
                </div>
              ))}
              <div className="flex flex-row justify-between gap-3 py-2.5 text-sm font-semibold">
                <dt>
                  <Text>In all</Text>
                </dt>
                <dd className="font-mono tabular-nums">{formatBytes(Object.values(settings.storage).reduce((sum, bytes) => sum + bytes, 0))}</dd>
              </div>
            </dl>
          </ConfigSection>
        </>
      )}
    </ConfigPage>
  );
}
