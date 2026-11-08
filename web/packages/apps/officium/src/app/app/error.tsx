"use client";

import { Button, ErrorState } from "@javadaba/ui";

/**
 * What the app says when a page fails to draw (Off-Shell: "Officium had no error ... page of its own"). It
 * keeps the shell, says what failed and that nothing was lost, and offers Try again. The error's own text is
 * never printed: it can name internals, and the person cannot act on it.
 */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 py-8 sm:px-6">
      <ErrorState
        title="Something went wrong on this page."
        actions={
          <Button type="button" register="ui" variant="outline" onClick={reset}>
            Try again
          </Button>
        }
      >
        <span>Your cards are safe: nothing you saved is lost. Try again, or go back to your projects.</span>
      </ErrorState>
    </div>
  );
}
