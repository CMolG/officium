"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { Link } from "@javadaba/ui/navigation";
import { BetweenHorizontalStart } from "lucide-react";

import { Button, Note } from "@javadaba/ui";

import { backlogPath } from "../../../lib/backlog/search-links";
import type { LiveStatus, Sprint } from "../../../lib/backlog/types";

export interface BoardBannersProps {
  live: LiveStatus;
  error: string | null;
  setError: (message: string | null) => void;
  /** The card a refusal is about, and the way to open it (Flx-Shell, "A move the server refused"). */
  errorCardId?: string | null;
  openCard?: (cardId: string) => void;
  activeSprint: Sprint | null;
  inTheater: boolean;
  projectId: string;
}

/** What the board says above its cards: the live status, an error and the sprint it is scoped to (Off-Board, Off-Shell). */
export function BoardBanners({ live, error, setError, errorCardId, openCard, activeSprint, inTheater, projectId }: BoardBannersProps) {
  return (
    <>
      {/* In the DOM from the start, so a screen reader hears it when it fills; empty, it takes no
          room. Not an error: nothing is lost and there is nothing to do, but what the board shows
          may be going stale, and the person has to know it before trusting it. */}
      <div role="status" data-testid="live-status" className="shrink-0 px-4 empty:hidden sm:px-6">
        {live === "reconnecting" && (
          <Note tone="neutral" role="presentation" className="my-2">
            <b className="font-semibold">Live updates paused.</b> Reconnecting… Anything that changes meanwhile shows up when the
            connection is back.
          </Note>
        )}
      </div>

      {error && (
        <div role="alert" className="shrink-0 px-4 py-2 sm:px-6">
          <Note tone="danger" role="presentation" className="items-center">
            <span className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">{error}</span>
              {errorCardId && openCard && (
                <Button type="button" register="ui" variant="outline" size="sm" onClick={() => openCard(errorCardId)}>
                  Open the card
                </Button>
              )}
              <Button type="button" register="ui" variant="ghost" size="sm" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </span>
          </Note>
        </div>
      )}

      {activeSprint && !inTheater && (
        <div className="shrink-0 px-4 py-2 sm:px-6">
          <Note tone="info" icon={<BetweenHorizontalStart size={16} aria-hidden="true" />} className="items-center">
            <span className="flex flex-row flex-wrap items-center gap-x-2">
              <span>
                Showing <strong className="font-semibold">{activeSprint.name}</strong> only.
              </span>
              <Link href={backlogPath(projectId)} className="font-medium underline underline-offset-4 hover:no-underline">
                Open the Backlog
              </Link>
            </span>
          </Note>
        </div>
      )}
    </>
  );
}
