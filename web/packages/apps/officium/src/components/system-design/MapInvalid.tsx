import { Pencil } from "lucide-react";
import { Link } from "@javadaba/ui/navigation";
import { Button, Text } from "@javadaba/ui";

import type { Problem } from "../../lib/system-design/types";
import { FRAME } from "./map-frame";

/** The page exists but its block can't be drawn: every problem, then the way to fix it. */
export function MapInvalid({ problems, editHref }: { problems: Problem[]; editHref: string }) {
  const one = problems.length === 1;
  return (
    <div role="alert" data-testid="map-problems" className={`${FRAME} border-[color:var(--jd-control-border)]`}>
      <Text as="p" className="text-base font-semibold">
        The map can&apos;t be drawn yet
      </Text>
      <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
        The system-design block on the documentation page has {one ? "a problem" : `${problems.length} problems`}. Fix {one ? "it" : "them"} and the map draws itself.
      </Text>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        {problems.map((p, i) => (
          <li key={`${p.path}-${i}`}>
            <Text>{p.message}</Text>
          </li>
        ))}
      </ul>
      <Button asChild register="ui" variant="outline">
        <Link href={editHref}>
          <Pencil size={14} aria-hidden="true" />
          <Text>Edit the map</Text>
        </Link>
      </Button>
    </div>
  );
}
