import { useState } from "react";
import { replaceAddress, useSearchParams } from "@javadaba/ui/navigation";

/**
 * The backlog's search text (JAVA-1566), kept in the address as `?q=`: a reload, or Back from a
 * card, comes back to the same narrowed backlog. Typing replaces the history entry instead of
 * adding one, so Back leaves the page rather than stepping through every keystroke.
 */
export function useBacklogSearch(projectId: string) {
  const params = useSearchParams();
  const [query, setQueryState] = useState(() => params.get("q") ?? "");

  function setQuery(value: string) {
    setQueryState(value);
    const path = `/app/p/${projectId}/backlog`;
    replaceAddress(value.trim() ? `${path}?q=${encodeURIComponent(value)}` : path);
  }

  return { query, setQuery };
}
