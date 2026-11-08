"use client";

import type { ReactNode } from "react";
import { Bot } from "lucide-react";

import { Badge, Select, Text } from "@javadaba/ui";

import { profileName } from "../../lib/backlog/profile-metrics-format";
import { SectionHeading } from "../backlog/SectionHeading";
import { ContributionsFigures } from "./contributions-figures";
import { COST_PROOF, PROFILE_DEFAULTS, PROFILE_ECO } from "./contributions-script";
import { SAMPLE_FOOT, SAMPLE_LABEL, SCENE_SENTENCE } from "./contributions-sample";
import { costView } from "./contributions-view";
import { useContributionsScript } from "./use-contributions-script";

const OPTIONS = [
  { value: PROFILE_DEFAULTS, label: profileName(PROFILE_DEFAULTS) },
  { value: PROFILE_ECO, label: profileName(PROFILE_ECO) },
];

/**
 * The real-cost scene: one work profile, picked in the real Select, and what one clean delivery cost
 * under it. Officium's own pieces on sample data, labelled as sample in the heading and the foot.
 */
export function ContributionsScene() {
  const script = useContributionsScript();
  const view = costView(script.read, script.choice);

  let body: ReactNode;
  if (view.kind === "loading") {
    body = (
      <div aria-busy="true" className="flex flex-col gap-3 @2xl:flex-row">
        <span className="sr-only">Loading the sample costs</span>
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden="true" className="h-24 min-w-0 flex-1 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-line)]" />
        ))}
      </div>
    );
  } else if (view.kind === "error") {
    body = (
      <Text role="alert" className="text-sm font-medium">
        {view.message}
      </Text>
    );
  } else {
    body = (
      <>
        {view.kind === "empty" && <p className="text-sm text-[color:var(--jd-muted)]">{view.sentence}</p>}
        <ContributionsFigures name={view.name} figures={view.figures} />
      </>
    );
  }

  return (
    <div className="@container flex h-full min-h-0 flex-col gap-4 p-4">
      <section aria-label="Cost per clean delivery" className="flex flex-col gap-2">
        {/* On a phone the badge goes under the heading: the Theater's pause pill sits in the top-right corner. */}
        <div className="flex flex-col items-start gap-2 @2xl:flex-row @2xl:items-center">
          <SectionHeading icon={<Bot size={16} />}>By AI profile</SectionHeading>
          <Badge register="tag" tone="neutral" fill="subtle">
            {SAMPLE_LABEL}
          </Badge>
        </div>
        <Text className="text-sm text-[color:var(--jd-muted)]">{SCENE_SENTENCE}</Text>
        <Select
          aria-label="Work profile"
          data-theater-target="cost-profile-select"
          value={script.choice}
          onChange={script.setChoice}
          options={OPTIONS}
          className="min-h-11 w-full min-w-0 sm:w-auto"
        />
      </section>
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      <p className="text-xs text-[color:var(--jd-muted)]">
        {SAMPLE_FOOT} {COST_PROOF.sentence}
      </p>
    </div>
  );
}
