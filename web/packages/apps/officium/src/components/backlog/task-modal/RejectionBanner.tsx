"use client";

import { Ban } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import type { CardDetail, Status } from "../../../lib/backlog/types";
import { STATUS_CONFIG } from "../../../lib/backlog/status-config";
import { rejectionLine } from "../../../lib/backlog/rejection";

/**
 * What a rejected card says first (card://JAVA-1415): that it was rejected, why, and what was wrong,
 * with the one way back, Refine, where its plan is checked again. The state is written out and
 * carries its own icon, never only the clay tint.
 */
export function RejectionBanner({ detail, changeStatus }: { detail: CardDetail; changeStatus: (next: Status) => Promise<void> }) {
  if (detail.status !== "rejected" || !detail.rejection) return null;
  const tone = STATUS_CONFIG.rejected.tone;
  return (
    <div data-testid="rejection-banner" className="flex flex-row shrink-0 flex-wrap items-start gap-3 border-b px-5 py-3"
      style={{ background: tone.fill, color: tone.ink, borderColor: tone.line }}>
      <Ban size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Text className="text-sm font-semibold">Rejected · {rejectionLine(detail.rejection)}</Text>
        <Text className="whitespace-pre-wrap text-sm">{detail.rejection.note}</Text>
      </div>
      <Button type="button" register="ui" size="sm" variant="outline" className="max-sm:min-h-11"
        onClick={() => void changeStatus("refine")}>
        <Text>Reopen in Refine</Text>
      </Button>
    </div>
  );
}
