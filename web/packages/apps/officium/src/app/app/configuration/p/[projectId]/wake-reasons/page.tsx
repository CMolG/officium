import type { Metadata } from "next";

import { ConfigPendingView } from "@/components/configuration/ConfigPendingView";

export const metadata: Metadata = {
  title: "Officium — Wake reasons",
};

export default function WakeReasonsPage() {
  return <ConfigPendingView section="wake-reasons" />;
}
