"use client";

import { Text } from "@javadaba/ui";

import type { Card } from "../../lib/backlog/types";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import { rejectionLine } from "../../lib/backlog/rejection";
import { StatusShape } from "../backlog/StatusShape";

/** A search row's status, in shape and words, and a rejected card's reason (card://JAVA-1415). */
export function SearchRowStatus({ card }: { card: Pick<Card, "status" | "rejection"> }) {
  return (
    <span className="inline-flex flex-row items-center gap-1.5">
      <StatusShape status={card.status} className="size-3.5" />
      <Text>{STATUS_CONFIG[card.status].label}{card.rejection ? ` · ${rejectionLine(card.rejection)}` : ""}</Text>
    </span>
  );
}
