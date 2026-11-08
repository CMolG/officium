import { Text } from "@javadaba/ui";

import { CLOUD_FEATURES, type CloudFeatureId } from "../../lib/cloud-features";
import { CLOUD_URL } from "../../lib/edition";
import { CloudBadge } from "./CloudBadge";

/**
 * A feature Officium Local does not have, shown in the place it would be: what it is, one line on what Cloud adds,
 * and a plain link. Nothing here asks for anything and nothing repeats.
 */
export function CloudLocked({ feature }: { feature: CloudFeatureId }) {
  const { title, line } = CLOUD_FEATURES[feature];
  return (
    <section
      data-testid={`cloud-locked-${feature}`}
      aria-label={title}
      className="flex flex-col items-start gap-2 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-4"
    >
      <CloudBadge />
      <Text as="h2" className="text-base font-bold">{title}</Text>
      <Text as="p" className="max-w-prose text-sm text-[color:var(--jd-muted)]">{line}</Text>
      <a href={CLOUD_URL} target="_blank" rel="noreferrer" className="flex min-h-11 flex-row items-center text-sm font-medium underline underline-offset-2">
        <span>See what Officium Cloud adds</span>
      </a>
    </section>
  );
}
