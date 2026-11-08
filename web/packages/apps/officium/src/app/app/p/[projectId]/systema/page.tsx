import { redirect } from "next/navigation";

import { SYSTEMA_ENTRIES, systemaPath } from "@/lib/systema/places";

/** The bare address of Systema lands on its first entry (JAVA-1600). */
export default async function SystemaPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(systemaPath(projectId, SYSTEMA_ENTRIES[0]));
}
