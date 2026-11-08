import type { Metadata } from "next";

import { ModSheetView } from "@/components/settings/ModSheetView";

export const metadata: Metadata = {
  title: "Officium — Mod",
};

export default async function ModSheetPage({ params }: { params: Promise<{ modId: string }> }) {
  const { modId } = await params;
  return <ModSheetView modId={decoded(modId)} />;
}

/** A malformed escape is an unknown mod, which the sheet says, not a server error. */
function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
