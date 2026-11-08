"use client";

import { Ban, CheckCheck } from "lucide-react";
import { Link } from "@javadaba/ui/navigation";

import { Button, Text } from "@javadaba/ui";

export interface ClosedCardLinksProps {
  /** The search view on the finished cards ("View completed"); absent where the board cannot navigate. */
  completedHref?: string;
  /** The search view on the discarded cards ("View rejected", card://JAVA-1415). */
  rejectedHref?: string;
  className: string;
}

/**
 * The two ways to the cards with no column: Completed and Rejected leave the board, and these open
 * the search view on each, newest first.
 */
export function ClosedCardLinks({ completedHref, rejectedHref, className }: ClosedCardLinksProps) {
  return (
    <>
      {completedHref && (
        <Button asChild register="ui" variant="outline" size="sm" className={className}>
          <Link href={completedHref}>
            <CheckCheck size={16} aria-hidden="true" />
            <Text>View completed</Text>
          </Link>
        </Button>
      )}
      {rejectedHref && (
        <Button asChild register="ui" variant="outline" size="sm" className={className}>
          <Link href={rejectedHref}>
            <Ban size={16} aria-hidden="true" />
            <Text>View rejected</Text>
          </Link>
        </Button>
      )}
    </>
  );
}
