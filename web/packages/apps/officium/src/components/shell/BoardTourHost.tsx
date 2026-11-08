"use client";

import { TourHost } from "@javadaba/ui/tour";

import "../../lib/shell/board-tour";

/**
 * The one place "Your first board" is drawn, mounted by the shell so the sidebar's Replay works from
 * wherever the person is. The import registers the tour (`defineTour` runs at module load).
 */
export function BoardTourHost() {
  return <TourHost />;
}
