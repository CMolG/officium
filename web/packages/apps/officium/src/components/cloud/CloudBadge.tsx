import { Badge } from "@javadaba/ui";

import { CLOUD_URL } from "../../lib/edition";

/** The small "Officium Cloud" label beside a locked feature. It links to what Cloud is; it never pops up. */
export function CloudBadge() {
  return (
    <a href={CLOUD_URL} target="_blank" rel="noreferrer" className="inline-flex w-fit flex-row" aria-label="Officium Cloud, opens the Officium Cloud page">
      <Badge register="tag" tone="neutral">Officium Cloud</Badge>
    </a>
  );
}
