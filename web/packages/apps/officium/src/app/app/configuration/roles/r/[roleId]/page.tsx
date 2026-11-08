import type { Metadata } from "next";

import { RoleSheetView } from "@/components/settings/RoleSheetView";

export const metadata: Metadata = {
  title: "Officium — Role",
};

export default async function RoleSheetPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  return <RoleSheetView roleId={decoded(roleId)} />;
}

/** A malformed escape is an unknown role, which the sheet says, not a server error. */
function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
