import type { ReactNode } from "react";
import { SectionHead, Text } from "@javadaba/ui";

import { OpenOfficiumCta } from "@/components/shell/OpenOfficiumCta";
import { SectionTheater } from "@/components/theater/SectionTheater";

import { LandingSource } from "./LandingSource";
import type { LandingSectionCopy } from "./landing-copy";

/**
 * One of the Rule of Seven sections (JAVA-1639), drawn as Off-Page draws it: the copy on one side
 * (the hook, the mechanism, the one primary action) and its walkthrough on the other, swapping
 * sides every other section. On a phone the copy comes first.
 */
export function LandingSection({
  copy,
  index,
  extra,
  reversed = false,
}: {
  copy: LandingSectionCopy;
  index: number;
  /** A block in the copy column, between the mechanism and the action. */
  extra?: ReactNode;
  /** The walkthrough on the left from `lg`. */
  reversed?: boolean;
}) {
  return (
    <section id={copy.id} data-landing-section={index} aria-label={copy.hook}>
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-2 lg:gap-16">
        <div className={`flex min-w-0 flex-col gap-5 ${reversed ? "lg:order-2" : ""}`}>
          <SectionHead kicker={`0${index}`} title={copy.hook} />
          <Text type="body-l" tone="muted" className="max-w-prose text-pretty">
            {copy.mechanism}
          </Text>
          {extra}
          <div className="flex flex-row flex-wrap items-center gap-3">
            <OpenOfficiumCta placement="section" section={copy.id} />
            <Text size="sm" tone="muted">
              {copy.close}
            </Text>
          </div>
          {copy.source ? <LandingSource {...copy.source} /> : null}
        </div>
        <div className="min-w-0">
          <SectionTheater scene={copy.scene} region={copy.region} />
        </div>
      </div>
    </section>
  );
}
