import { Suspense } from "react";

import { BacklogView } from "@/components/backlog/BacklogView";

export const metadata = {
  title: "Officium — Backlog",
};

export default async function BacklogPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  // `useSearchParams` (the `?q=` search) needs a Suspense boundary above it or `next build`
  // aborts the route's prerender.
  return (
    <Suspense fallback={null}>
      <BacklogView projectId={projectId} />
    </Suspense>
  );
}
