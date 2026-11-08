"use client";

import { Users } from "lucide-react";

import { Text } from "@javadaba/ui";

import { describeQuota } from "../../lib/backlog/collaborator-quota";
import type { CollaboratorQuota } from "../../lib/backlog/types";

/** The owner's collaborator count against the cap, in words and visible without hovering (JAVA-1009). */
export function CollaboratorQuotaLine({ quota, id }: { quota: CollaboratorQuota; id: string }) {
  return (
    <p id={id} role="status" className="flex flex-row items-start gap-2 text-sm">
      <Users size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <Text>{describeQuota(quota).line}</Text>
    </p>
  );
}
