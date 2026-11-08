"use client";

import { Button, Note, Switch, Text } from "@javadaba/ui";

import { useProjectOwner } from "../../../lib/configuration/use-project-owner";
import { useCopy } from "../../../lib/i18n/use-copy";
import { ConfigLoadError } from "../ConfigLoadError";
import { ConfigLoading } from "../ConfigLoading";
import { ConfigPage } from "../ConfigPage";
import { ConfigSection } from "../ConfigSection";
import { useSharing } from "./use-sharing";

const SWITCH_LABEL = "sharing-show-who";

/**
 * Configuration, Sharing (Off-Shell 9.03): who did each card, an agent or a person, is hidden from viewers unless the
 * project turns it on, so a board can be shared with stakeholders as it is. The owner edits; every member reads. When
 * the API does not serve the setting yet the switch stays off, disabled, and the page says why.
 */
export function SharingView({ projectId }: { projectId: string }) {
  const { isOwner } = useProjectOwner(projectId);
  const s = useSharing(projectId);
  const { configuration } = useCopy();

  return (
    <ConfigPage title={configuration.sections.sharing} lede="What this project shows the people it shares its board with.">
      {s.loadError && !s.ready && <ConfigLoadError title="Couldn't load the sharing settings" detail={s.loadError} onRetry={s.retry} />}
      {!s.ready && !s.loadError && <ConfigLoading label="Loading the sharing settings" />}
      {s.ready && (
        <ConfigSection title="Viewers" hint="A viewer reads the board and cannot change it. They see no drag handles, no New card and no status select.">
          <div className="flex flex-row items-start justify-between gap-3 rounded-2xl bg-[color:var(--jd-card)] p-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Text className="text-sm font-semibold" id={SWITCH_LABEL}>
                Show viewers who did the work
              </Text>
              <Text className="text-sm text-[color:var(--jd-muted)]">
                Off by default: viewers see each card without whether an AI agent or a person did it, the assignees, or who changed it last.
              </Text>
            </div>
            <Switch checked={s.draft} disabled={!isOwner || s.unavailable} onCheckedChange={s.edit} aria-labelledby={SWITCH_LABEL} />
          </div>
          {s.unavailable && (
            // TODO(backend): GET/PUT /projects/{id}/sharing (see lib/configuration/sharing.ts).
            <Note tone="neutral">
              <strong>Not available yet.</strong> The server does not keep this setting, so viewers do not see who did the work.
            </Note>
          )}
          {!isOwner && !s.unavailable && (
            <Note tone="neutral">
              <strong>Read only.</strong> Owners change what viewers see.
            </Note>
          )}
          {s.conflict && (
            <Note tone="warning">
              <strong>Changed elsewhere.</strong> Another owner saved first; it now shows their choice.
            </Note>
          )}
          {s.saveError && (
            <Note tone="danger">
              <strong>Couldn&apos;t save.</strong> {s.saveError}
            </Note>
          )}
          {s.saved && (
            <Note tone="success" role="status">
              <strong>Saved.</strong> Viewers see the board this way now.
            </Note>
          )}
          {isOwner && !s.unavailable && (
            <div className="flex flex-row gap-2">
              <Button type="button" register="ui" variant="ghost" className="min-h-11" disabled={s.unchanged || s.saving} onClick={s.cancel}>
                Cancel
              </Button>
              <Button type="button" register="ui" className="min-h-11" disabled={s.unchanged || s.saving} onClick={() => void s.save()}>
                {s.saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </ConfigSection>
      )}
    </ConfigPage>
  );
}
