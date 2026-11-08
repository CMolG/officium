"use client";

import * as React from "react";

import {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
} from "../ui/context-menu";
import { ContextMenuCheckboxItem } from "../ui/context-menu-checkbox-item";
import type { ChoiceEntry, ItemEntry, MenuContext, MenuEntry } from "./menu-model";
import { PendingEntries } from "./PendingEntries";

/** The one place the kinds are drawn, with the primitive's rows. */
export function MenuEntries({ entries, ctx }: { entries: MenuEntry[]; ctx: MenuContext }) {
  return (
    <>
      {entries.map((entry, index) => {
        const previous = entries[index - 1];
        const apart = previous !== undefined && (previous.kind === "group" || entry.kind === "group");
        return (
          <React.Fragment key={entry.id}>
            {apart && <ContextMenuSeparator />}
            {drawEntry(entry, ctx)}
          </React.Fragment>
        );
      })}
    </>
  );
}

function drawEntry(entry: MenuEntry, ctx: MenuContext) {
  switch (entry.kind) {
    case "label":
      return (
        <ContextMenuLabel>
          {entry.icon}
          {entry.label}
        </ContextMenuLabel>
      );
    case "choice":
      return drawChoice(entry, ctx);
    case "pending":
      return <PendingEntries entry={entry} ctx={ctx} />;
    case "group":
      return (
        <ContextMenuGroup data-testid={entry.testId}>
          <MenuEntries entries={entry.entries} ctx={ctx} />
        </ContextMenuGroup>
      );
    default:
      return drawItem(entry, ctx);
  }
}

function drawItem(entry: ItemEntry, ctx: MenuContext) {
  const common = {
    shortcut: entry.shortcut,
    tone: entry.tone,
    disabledReason: entry.disabledReason,
    onSelect: () => entry.onSelect(ctx),
    "data-testid": entry.testId,
  };
  if (entry.checked !== undefined) {
    return (
      <ContextMenuCheckboxItem checked={entry.checked} {...common}>
        {entry.label}
      </ContextMenuCheckboxItem>
    );
  }
  return (
    <ContextMenuItem icon={entry.icon} note={entry.note} {...common}>
      {entry.label}
    </ContextMenuItem>
  );
}

function drawChoice(entry: ChoiceEntry, ctx: MenuContext) {
  return (
    <>
      <ContextMenuLabel>{entry.label}</ContextMenuLabel>
      <ContextMenuRadioGroup value={entry.value} onValueChange={(value) => entry.onChange(value, ctx)}>
        {entry.options.map((option) => (
          <ContextMenuRadioItem
            key={option.value}
            value={option.value}
            disabledReason={option.disabledReason}
            data-testid={option.testId}
          >
            {option.label}
          </ContextMenuRadioItem>
        ))}
      </ContextMenuRadioGroup>
    </>
  );
}
