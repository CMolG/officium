import type { Metadata } from "next";

import { CategorySheetView } from "@/components/settings/CategorySheetView";

export const metadata: Metadata = {
  title: "Officium — Category",
};

export default async function CategorySheetPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  return <CategorySheetView categoryId={decoded(categoryId)} />;
}

/** A malformed escape is an unknown category, which the sheet says, not a server error. */
function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
