import { Network } from "lucide-react";
import { Button, Text } from "@javadaba/ui";

import { FRAME } from "./map-frame";

/** No page yet: what this is, and the first step for someone who can write. */
export function MapEmpty({ canWrite, creating, error, onCreate }: { canWrite: boolean; creating: boolean; error: string | null; onCreate: () => void }) {
  return (
    <div className={`${FRAME} border-dashed border-[color:var(--jd-line)]`}>
      <Network size={22} className="text-[color:var(--jd-muted)]" aria-hidden="true" />
      <Text as="p" className="text-base font-semibold">
        No system map yet
      </Text>
      <Text as="p" className="max-w-prose text-sm text-[color:var(--jd-muted)]">
        This view draws your project&apos;s system (apps, services, databases and how they connect) from a documentation page called system-design. People
        and agents edit that page, and the map redraws.
      </Text>
      {canWrite ? (
        <Button type="button" register="ui" disabled={creating} onClick={onCreate}>
          <Text>{creating ? "Creating…" : "Create the system map"}</Text>
        </Button>
      ) : (
        <Text as="p" className="text-xs text-[color:var(--jd-muted)]">
          Creating the map needs editor access to this project. Ask an editor to create it.
        </Text>
      )}
      {error && (
        <Text as="p" role="alert" className="text-sm font-semibold">
          Couldn&apos;t create the map: {error} Try again.
        </Text>
      )}
    </div>
  );
}
