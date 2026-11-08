import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchView } from "@/components/search/SearchView";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Search — Officium",
};

export default async function SearchPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  // `useSearchParams` (the `?jql=` query) needs a Suspense boundary above it or `next build`
  // aborts the route's prerender -- same reason as the report route next door.
  return (
    <Suspense fallback={null}>
      <SearchView projectId={projectId} />
    </Suspense>
  );
}
