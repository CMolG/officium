import type { Metadata } from "next";

import { RolesIndexView } from "@/components/settings/RolesIndexView";

export const metadata: Metadata = {
  title: "Officium — Roles",
};

export default function RolesSettingsPage() {
  return <RolesIndexView />;
}
