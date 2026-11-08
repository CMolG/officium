"use client";

import { useConfirmDialog, UndoNotice, useUndoNotice } from "@javadaba/ui";
import type { ReactNode } from "react";

/** What a team surface asks and offers: a confirmation before a removal, an Undo after every removal and change. */
export interface TeamAsk {
  confirm: ReturnType<typeof useConfirmDialog>["confirm"];
  offer: ReturnType<typeof useUndoNotice>["offer"];
}

/**
 * "Ask first, undo after" for everything in a team (Cfg-Org, decided): the confirmation dialog and the Undo notice are
 * rendered once by the caller (`nodes`), and the actions use `ask`.
 */
export function useTeamAsk(): { ask: TeamAsk; nodes: ReactNode } {
  const confirm = useConfirmDialog();
  const undo = useUndoNotice();
  return {
    ask: { confirm: confirm.confirm, offer: undo.offer },
    nodes: (
      <>
        <UndoNotice controller={undo} />
        {confirm.dialog}
      </>
    ),
  };
}
