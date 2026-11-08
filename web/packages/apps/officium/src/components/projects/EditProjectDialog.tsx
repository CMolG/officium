"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";
import { Bolt } from "lucide-react";

import { publishProject } from "../../lib/backlog/project-list";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type Project } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { configurationPath } from "../../lib/configuration/places";
import { ProjectAppearancePicker } from "./ProjectAppearancePicker";

/**
 * The owner's only way to change a project's icon and color (JAVA-51): only the owner may call
 * `updateProject` with `icon`/`iconColor` (`403 owner_only`), which is why this dialog itself is
 * only ever opened for an owner -- the trigger that would open it is disabled, with the reason
 * visible, for anyone else (`interface-psychology.md` #2).
 */
export function EditProjectDialog({
  project,
  repository,
  onClose,
  onChanged,
}: {
  project: Project;
  repository: BacklogRepository;
  onClose: () => void;
  onChanged: (next: Project) => void;
}) {
  const [name, setName] = useState(project.name);
  const [icon, setIcon] = useState(project.icon);
  const [iconColor, setIconColor] = useState(project.iconColor);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const returnFocus = useReturnFocus();

  const canSubmit = name.trim().length > 0 && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const result = await repository.updateProject(project.id, {
        expectedVersion: project.version,
        name: name.trim(),
        icon,
        iconColor,
      });
      if (isConflict(result)) {
        setError("This project changed elsewhere since you opened it. Reopen it to see the latest and try again.");
        return;
      }
      // Every surface drawing this project -- the sidebar above all -- shows the save at once
      // (JAVA-125), not only the one that opened the dialog.
      publishProject(result, repository);
      onChanged(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>Edit project</DialogTitle>
        <DialogDescription>The name and appearance every surface draws this project with.</DialogDescription>

        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Name</span>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
              />
            </label>
            <ProjectAppearancePicker icon={icon} color={iconColor} onChange={({ icon: i, color: c }) => { setIcon(i); setIconColor(c); }} />
          </div>
          {error && (
            <p role="alert" className="text-xs font-bold text-destructive">
              {error}
            </p>
          )}
          {/* The project's own settings (work profile, integrations, documentation, form languages) live in Configuration, not in this dialog. */}
          <Link
            href={configurationPath("work-profile", project.id)}
            onClick={onClose}
            className="flex min-h-11 flex-row items-center gap-1.5 text-sm font-medium underline underline-offset-2"
          >
            <Bolt size={14} aria-hidden="true" />
            <Text>Project configuration</Text>
          </Link>
          <Text as="p" className="-mt-2 text-xs text-[color:var(--jd-muted)]">
            Work profile, integrations, documentation and form languages settings
          </Text>
        </div>

        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" register="ui" disabled={!canSubmit} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
