import { redirect } from "next/navigation";

import { configurationPath } from "@/lib/configuration/places";

/** The bare `/app/configuration` has no page of its own: its first section is Organization (JAVA-1626). */
export default function ConfigurationIndexPage() {
  redirect(configurationPath("organization"));
}
