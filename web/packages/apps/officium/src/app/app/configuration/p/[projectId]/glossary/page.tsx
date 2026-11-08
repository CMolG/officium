import type { Metadata } from "next";

import { ConfigPendingView } from "@/components/configuration/ConfigPendingView";

export const metadata: Metadata = {
  title: "Officium — Glossary",
};

export default function GlossaryPage() {
  return <ConfigPendingView section="glossary" />;
}
