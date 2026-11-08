"use client";

import { Star } from "lucide-react";
import { Button } from "@javadaba/ui";

import type { DocStar } from "../../lib/backlog/types";
import { useDocStars } from "../../lib/docs/use-doc-stars";

/**
 * Star or unstar a page or collection (JAVA-799). `aria-pressed` carries the state for assistive
 * technology; sighted people get the filled shape AND the word, so it never rests on colour alone.
 */
export function DocStarButton({ path, kind = "page" }: { path: string; kind?: DocStar["kind"] }) {
  const { isStarred, toggle, failure } = useDocStars();
  const starred = isStarred(path, kind);
  return (
    <>
      {failure && <span className="text-xs text-destructive">{failure}</span>}
      <Button
      type="button"
      register="ui"
      size="sm"
      variant="outline"
      aria-pressed={starred}
      onClick={() => void toggle(path, kind)}
      data-testid="star-button"
    >
      <Star size={14} aria-hidden="true" fill={starred ? "currentColor" : "none"} /> {starred ? "Starred" : "Star"}
    </Button>
    </>
  );
}
