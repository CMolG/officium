"use client";

import { useState } from "react";

import { Button, Text } from "@javadaba/ui";

import { refreshProjectList } from "../../lib/backlog/project-list";
import { useCopy } from "../../lib/i18n/use-copy";

/**
 * The unavailable row of the project badge: the list came back empty, so the badge can only show the project in view.
 * Try again asks for the list once more; while it runs the button stays put (focus kept) and says so.
 */
export function ProjectBadgeRetry({ onLoaded }: { onLoaded: () => void }) {
  const copy = useCopy().configuration;
  const [pending, setPending] = useState(false);

  const retry = () => {
    if (pending) return;
    setPending(true);
    void refreshProjectList()
      .then((list) => {
        if (list.length > 0) onLoaded();
      })
      .finally(() => setPending(false));
  };

  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <Text as="span" role="alert" className="text-xs text-[color:var(--jd-muted)]">
        {copy.loadFailed}
      </Text>
      <Button
        type="button"
        register="ui"
        variant="ghost"
        size="sm"
        aria-disabled={pending || undefined}
        onClick={retry}
        className="min-h-11 sm:min-h-8"
      >
        {pending ? copy.projectBadge.retrying : copy.retry}
      </Button>
    </div>
  );
}
