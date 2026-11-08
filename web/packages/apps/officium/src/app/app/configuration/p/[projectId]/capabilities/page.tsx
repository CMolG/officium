import type { Metadata } from "next";

import { ConfigPendingView } from "@/components/configuration/ConfigPendingView";

export const metadata: Metadata = {
  title: "Officium — Capabilities",
};

export default function CapabilitiesPage() {
  return <ConfigPendingView section="capabilities" />;
}
