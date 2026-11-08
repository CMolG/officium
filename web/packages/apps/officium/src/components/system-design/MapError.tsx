import { Button, Text } from "@javadaba/ui";

import { FRAME } from "./map-frame";

export function MapError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className={`${FRAME} border-[color:var(--jd-line)]`}>
      <Text as="p" className="text-base font-semibold">
        Couldn&apos;t load the system map
      </Text>
      <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
        {message}
      </Text>
      <Button type="button" register="ui" variant="outline" onClick={onRetry}>
        <Text>Try again</Text>
      </Button>
    </div>
  );
}
