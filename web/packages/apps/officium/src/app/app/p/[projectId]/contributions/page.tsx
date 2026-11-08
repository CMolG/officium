import type { Metadata } from "next";
import { Suspense } from "react";

import { ContributionsView } from "@/components/backlog/ContributionsView";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Officium — Contributions",
};

export default async function ContributionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  // `useSearchParams` (`?tab=`, and the Time report tab's `?from&to`) needs a Suspense boundary
  // above it or `next build` aborts the route's prerender -- same reason as `search`/`report`.
  return (
    <Suspense fallback={null}>
      <ContributionsView projectId={projectId} />
    </Suspense>
  );
}
