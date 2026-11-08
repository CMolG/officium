"use client";

import { Button, Text } from "@javadaba/ui";

/** A failed load says what happened and offers the way out, beside the other choices that still work. */
export function PickerStatus({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex shrink-0 flex-col items-start gap-2">
      <Text size="sm">{message}</Text>
      <Text size="sm" tone="muted">
        You can still switch to Emoji, pick a color or keep the current icon.
      </Text>
      <Button type="button" register="ui" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
