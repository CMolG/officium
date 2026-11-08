"use client";

import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "../ui/context-menu";
import { useShortcutLabel } from "../ui/use-shortcut-label";
import { copyLink, isReadOnly, openLink, type EditAction, type TargetInfo } from "./inherited-actions";
import type { FeedbackLabels } from "./labels";
import { MenuEntries } from "./MenuEntries";
import type { ResolvedMenu } from "./menu-model";
import { ReportIcon } from "./report-icons";
import type { FeedbackKind } from "./submit";

export interface FeedbackMenuRowsProps {
  labels: FeedbackLabels;
  /** What the target is: an editable field, a selection, a link. */
  info: TargetInfo | undefined;
  /** The nearest `FeedbackMenuScope`'s answer for what was pointed at, if it is in one. */
  own: ResolvedMenu | null;
  /** A refused paste says why on its row. */
  blocked: boolean;
  onEdit: (action: EditAction) => void;
  onReport: (kind: FeedbackKind) => void;
}

/**
 * The rows of the layer's one menu, in the same order everywhere (Lib-Feedback § The menu, in order): the
 * browser's own actions that apply, then the nearest area's (named), then the outer area's, then ours.
 * Each block is a group between hairlines.
 */
export function FeedbackMenuRows({ labels, info, own, blocked, onEdit, onReport }: FeedbackMenuRowsProps) {
  const editable = info?.editable ?? null;
  const writable = editable !== null && !isReadOnly(editable);
  const hasSelection = (info?.selectedText.length ?? 0) > 0;
  const hasOwn = (own?.entries.length ?? 0) > 0;
  const hasBrowser = editable !== null || hasSelection || Boolean(info?.linkHref);
  const keys = { cut: useShortcutLabel("Mod+X"), copy: useShortcutLabel("Mod+C"), paste: useShortcutLabel("Mod+V"), selectAll: useShortcutLabel("Mod+A") };
  return (
    <>
      {info?.linkHref && (
        <>
          <ContextMenuItem onSelect={() => openLink(info.linkHref!)}>{labels.openInNewTab}</ContextMenuItem>
          <ContextMenuItem onSelect={() => void copyLink(info.linkHref!)}>{labels.copyLink}</ContextMenuItem>
        </>
      )}
      {writable && hasSelection && <ContextMenuItem shortcut={keys.cut} onSelect={() => onEdit("cut")}>{labels.cut}</ContextMenuItem>}
      {hasSelection && <ContextMenuItem shortcut={keys.copy} onSelect={() => onEdit("copy")}>{labels.copy}</ContextMenuItem>}
      {writable && (
        <ContextMenuItem
          shortcut={keys.paste}
          onSelect={(event) => {
            event.preventDefault();
            onEdit("paste");
          }}
          note={blocked ? labels.clipboardBlocked : undefined}
        >
          {labels.paste}
        </ContextMenuItem>
      )}
      {editable && <ContextMenuItem shortcut={keys.selectAll} onSelect={() => onEdit("selectAll")}>{labels.selectAll}</ContextMenuItem>}
      {hasBrowser && hasOwn && <ContextMenuSeparator />}
      {own && hasOwn && (
        <>
          {own.label && <ContextMenuLabel>{own.label}</ContextMenuLabel>}
          <MenuEntries entries={own.entries} ctx={own.ctx} />
          {own.outer && (
            <>
              <ContextMenuSeparator />
              <ContextMenuLabel>{own.outer.label}</ContextMenuLabel>
              <MenuEntries entries={own.outer.entries} ctx={own.ctx} />
            </>
          )}
        </>
      )}
      {(hasOwn || hasBrowser) && <ContextMenuSeparator />}
      <ContextMenuItem icon={<ReportIcon kind="problem" />} onSelect={() => onReport("problem")}>
        {labels.report}
      </ContextMenuItem>
      <ContextMenuItem icon={<ReportIcon kind="suggestion" />} onSelect={() => onReport("suggestion")}>
        {labels.suggest}
      </ContextMenuItem>
    </>
  );
}
