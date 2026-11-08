import { Glyph, Text } from "@javadaba/ui";

import type { SourcedClaim } from "./landing-pricing";

/** "Jan 5, 2026" from an ISO day, with no time zone in the way. */
function dayLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * A competitor claim with its source and the day it was checked, under the claim and never in a
 * tooltip (Off-Page, "Room for a source"): `claim · Source: page · checked on date`.
 */
export function LandingSource({ claim, page, url, checkedOn }: SourcedClaim) {
  return (
    <Text size="xs" tone="muted" className="flex flex-row items-start gap-1.5 text-pretty">
      <Glyph name="info-circle" size={14} className="mt-0.5 shrink-0" />
      <span>
        {claim} · Source:{" "}
        <a href={url} rel="noopener" className="underline underline-offset-2">
          {page}
        </a>{" "}
        · checked on <time dateTime={checkedOn}>{dayLabel(checkedOn)}</time>
      </span>
    </Text>
  );
}
