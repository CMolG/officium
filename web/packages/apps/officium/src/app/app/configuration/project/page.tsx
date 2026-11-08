import type { Metadata } from "next";

import { ChooseProjectView } from "@/components/configuration/ChooseProjectView";

export const metadata: Metadata = {
  title: "Officium — Choose a project",
};

export default async function ChooseProjectPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  return <ChooseProjectView section={section ?? null} />;
}
