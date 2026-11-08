"use client";

import { ShieldAlert } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";
import { DIMENSION_LABEL } from "../../lib/backlog/quality-lineage";
import type { Card, CardDetail } from "../../lib/backlog/types";
import { SectionHeading } from "./SectionHeading";

const PHASE_LABEL = { refine: "its refine", action: "its implementation", review: "its review" } as const;

interface Props {
  detail: CardDetail;
  linkable: Omit<Card, "description" | "actionPlan">[];
  onOpenOther: (cardId: string) => void;
}

/**
 * A card's quality lineage (card://JAVA-1525), only when it has one: the card a corrective card says caused it,
 * and on an origin the defects that escaped its delivery, each with the card that corrects it. A key opens that
 * card; one that is not on this board reads as plain text.
 */
export function QualityLineageSection({ detail, linkable, onOpenOther }: Props) {
  const lineage = detail.lineage ?? null;
  const escaped = detail.escapedDefects ?? [];
  if (!lineage && escaped.length === 0) return null;
  const cardKey = (key: string) => {
    const card = linkable.find((c) => c.key === key);
    return card ? (
      <Button type="button" register="ui" size="sm" variant="ghost" className="h-11 px-2 underline" onClick={() => onOpenOther(card.id)}>
        <Text>{key}</Text>
      </Button>
    ) : (
      <Text className="font-semibold">{key}</Text>
    );
  };
  return (
    <section aria-label="Quality lineage" data-testid="quality-lineage-section" className="flex flex-col gap-3">
      <SectionHeading icon={<ShieldAlert size={16} />}>
        {escaped.length > 0 ? `Escaped defects · ${escaped.length}` : "Quality lineage"}
      </SectionHeading>
      {lineage && (
        <div data-testid="quality-lineage" className="flex flex-row flex-wrap items-center gap-1 text-sm">
          {lineage.causedBy === "legacy" ? (
            <Text>Corrects a defect from before the lineage was recorded.</Text>
          ) : (
            <>
              <Text>{"Corrects "}</Text>
              {cardKey(lineage.causedBy)}
              <Text>
                {[
                  "",
                  lineage.escapedIn ? `escaped ${PHASE_LABEL[lineage.escapedIn]}` : null,
                  lineage.qualityDimension ? DIMENSION_LABEL[lineage.qualityDimension] : null,
                  lineage.violatedRules.length > 0 ? lineage.violatedRules.join(", ") : null,
                ].filter((part) => part !== null).join(" · ")}
              </Text>
            </>
          )}
        </div>
      )}
      {escaped.length > 0 && (
        <ul className="flex flex-col gap-2">
          {[...escaped].reverse().map((defect) => (
            <li key={defect.id} data-testid="escaped-defect"
              className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
              <div className="flex flex-row flex-wrap items-center gap-1 text-sm">
                {cardKey(defect.correctiveKey)}
                <Text>{" "}escaped {PHASE_LABEL[defect.escapedIn]} · {DIMENSION_LABEL[defect.qualityDimension]}</Text>
              </div>
              {defect.violatedRules.length > 0 && <Text className="text-sm">{defect.violatedRules.join(" · ")}</Text>}
              <Text className="text-xs text-[color:var(--jd-muted)]">{formatDate(defect.at)} · {defect.by.name}</Text>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
