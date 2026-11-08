"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@javadaba/ui";

import { PROJECT_COLORS, projectColorLabel, projectColorVar } from "../../lib/backlog/project-appearance";
import type { DocTreeNode } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { isEmojiIcon } from "../../lib/docs/doc-node-rules";
import { rememberRecent } from "../../lib/icons/recent-icons";
import { IconPickerLoader } from "../icon-picker/IconPickerLoader";

/**
 * The icon and colour of one documentation node (JAVA-791, JAVA-1765): one Lucide icon or one emoji from
 * the picker, and the project palette. Each colour is also named in text on its button, so it never carries
 * the choice alone. An emoji keeps its own colours, so the colour pills are off for it. "Use the default"
 * clears both.
 *
 * Layout (JAVA-1765): the dialog clips; only the body scrolls, and it gives its height to the picker's grid
 * first. The error and the footer sit outside the body, so Save and Use the default stay in view at every size.
 */
export function NodeAppearanceDialog({
  node,
  onClose,
  onSubmit,
}: {
  node: Pick<DocTreeNode, "name" | "icon" | "iconColor">;
  onClose: () => void;
  /** Empty strings clear a field back to the default. Resolves to an error to show, or `null`. */
  onSubmit: (input: { icon: string; iconColor: string }) => Promise<string | null>;
}) {
  const returnFocus = useReturnFocus();
  const [icon, setIcon] = useState(node.icon ?? "");
  const [color, setColor] = useState(node.iconColor ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emoji = isEmojiIcon(icon);

  async function save(next: { icon: string; iconColor: string }) {
    setBusy(true);
    setError(null);
    const problem = await onSubmit(next);
    setBusy(false);
    if (problem) setError(problem);
    else if (next.icon) rememberRecent(next.icon);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} data-testid="node-appearance" className="max-w-lg overflow-hidden">
        <DialogTitle>Icon and color</DialogTitle>
        <DialogDescription>How &ldquo;{node.name}&rdquo; looks in the documentation tree.</DialogDescription>
        <div data-testid="icon-dialog-body" className="-m-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-1">
          <IconPickerLoader value={icon} onPick={setIcon} />
          <div role="group" aria-label="Color" className="flex shrink-0 flex-row flex-wrap gap-2">
            {PROJECT_COLORS.map((option) => {
              const selected = option === color;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  disabled={emoji}
                  onClick={() => setColor(option)}
                  className={`flex min-h-11 flex-row items-center gap-2 rounded-full border px-3 text-xs disabled:opacity-50 ${
                    selected ? "border-[color:var(--jd-fg)] font-semibold" : "border-[color:var(--jd-border)]"
                  }`}
                >
                  <span aria-hidden="true" className="size-3 rounded-full" style={{ background: projectColorVar(option) }} />
                  <span>{projectColorLabel(option)}</span>
                  {selected && <Check size={12} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <p className="min-h-4 shrink-0 text-xs text-[color:var(--jd-muted)]">{emoji ? "Emoji keep their own colors." : ""}</p>
        </div>
        {error && (
          <p role="alert" className="shrink-0 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="shrink-0 border-t border-[color:var(--jd-border)] pt-4 max-sm:flex-row max-sm:justify-between">
          <Button type="button" register="ui" variant="ghost" className="min-h-11" disabled={busy} onClick={() => void save({ icon: "", iconColor: "" })}>
            Use the default
          </Button>
          <Button type="button" register="ui" className="min-h-11" disabled={busy} onClick={() => void save({ icon, iconColor: emoji ? "" : color })}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
