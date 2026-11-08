"use client";

import { useEffect, useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { RejectionReasonEntry } from "../../../lib/backlog/types";
import { readMeta } from "../../../lib/backlog/meta-cache";

export interface RejectionMeta {
  /** False until a deployment turns rejections on (JAVA-1491): the Reject action is then hidden. */
  enabled: boolean;
  reasons: readonly RejectionReasonEntry[];
}

/** Whether cards may be rejected here, and why they may be (card://JAVA-1415); null until it is known. */
export function useRejectionMeta(repository: BacklogRepository): RejectionMeta | null {
  const [meta, setMeta] = useState<RejectionMeta | null>(null);
  useEffect(() => {
    let cancelled = false;
    readMeta(repository).then(
      (read) => {
        if (!cancelled) setMeta({ enabled: read.rejectionEnabled === true, reasons: read.rejectionReasons ?? [] });
      },
      // Unknown is treated as off: the action stays hidden rather than offering what may be refused.
      () => !cancelled && setMeta({ enabled: false, reasons: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [repository]);
  return meta;
}
