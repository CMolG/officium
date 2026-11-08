"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useState } from "react";

import type { Status } from "../../../lib/backlog/types";
import type { SendBackTarget } from "../SendBackDialog";

/** The card, where it goes, and at which place of that column. */
export interface SendBackRequest {
  card: SendBackTarget;
  to: Status;
  position: number;
}

/** Which of the board's dialogs are open. */
export function useBoardDialogs() {
  const [reportOpen, setReportOpen] = useState(false);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  /** A card dropped back from review or deploy, waiting for the reasons (card://JAVA-1416). */
  const [sendBack, setSendBack] = useState<SendBackRequest | null>(null);

  return { reportOpen, setReportOpen, newCardOpen, setNewCardOpen, membersOpen, setMembersOpen, editProjectOpen, setEditProjectOpen, sendBack, setSendBack };
}

export type BoardDialogsState = ReturnType<typeof useBoardDialogs>;
