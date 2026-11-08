"use client";

import type { Metrics } from "../../lib/backlog/types";
import { ProfileMetricsSection } from "./ProfileMetricsSection";
import { RejectedSummary } from "./RejectedSummary";
import { ReviewReturnsSummary } from "./ReviewReturnsSummary";

/** The Metrics tab's quality reads, under its delivery numbers: rejected, sent back, and by AI profile. */
export function QualitySummaries({ metrics, projectId }: { metrics: Metrics; projectId: string }) {
  return (
    <>
      <RejectedSummary rejected={metrics.rejected} />
      <ReviewReturnsSummary reviewReturns={metrics.reviewReturns} />
      <ProfileMetricsSection profiles={metrics.profiles} projectId={projectId} />
    </>
  );
}
