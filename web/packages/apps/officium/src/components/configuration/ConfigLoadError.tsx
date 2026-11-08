"use client";

import type { ReactNode } from "react";
import { Button, ErrorState } from "@javadaba/ui";

/** A Configuration page that could not load: what failed, what is safe, and the one way on. */
export function ConfigLoadError({
  title,
  detail,
  retryLabel = "Try again",
  onRetry,
  children,
}: {
  title: string;
  detail?: string | null;
  retryLabel?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <ErrorState
      title={title}
      actions={
        onRetry && (
          <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={onRetry}>
            {retryLabel}
          </Button>
        )
      }
    >
      {children ?? detail}
    </ErrorState>
  );
}
