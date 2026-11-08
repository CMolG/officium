"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@javadaba/ui/navigation";
import { useVisualPerformance } from "@javadaba/ui/hooks";
import { GripVertical, X } from "lucide-react";

import { docsPath } from "../../lib/backlog/search-links";
import type { DocStar } from "../../lib/backlog/types";
import { DocNodeIcon } from "./DocNodeIcon";

/** What a star says about its page besides the name: words, never colour alone. */
function stateOf(star: DocStar): string | null {
  if (star.page?.archivedAt) return "Archived";
  if (star.page && !star.page.published) return "Draft";
  return null;
}

/**
 * One starred page or collection (JAVA-799). The grip is a pointer handle; the keyboard path to reorder is
 * Alt+ArrowUp/ArrowDown on the name, announced by the list. A collection with an overview page opens it, and
 * one without reveals itself in the tree instead.
 */
export function StarRow({
  star,
  projectId,
  current,
  onNavigate,
  onReveal,
  onMove,
  onRemove,
}: {
  star: DocStar;
  projectId: string;
  current: string | null;
  onNavigate: () => void;
  onReveal: (path: string) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `${star.kind}:${star.path}`,
  });
  const reducedMotion = useVisualPerformance().mode === "low";
  const selected = star.path === current;
  const state = stateOf(star);
  const opensPage = star.kind === "page" || star.page !== null;
  const label = (
    <>
      <DocNodeIcon icon={star.icon} color={star.iconColor} isSection={star.kind === "collection"} />
      <span className="min-w-0 flex-1 truncate">{star.name}</span>
      {star.kind === "collection" && <span className="shrink-0 text-xs text-[color:var(--jd-muted)]">Collection</span>}
      {state && <span className="shrink-0 text-xs text-[color:var(--jd-muted)]">{state}</span>}
    </>
  );
  const nameClass = `flex min-h-11 min-w-0 flex-1 flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] px-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--jd-ink)]/40 ${
    selected ? "font-semibold text-[color:var(--jd-ink)]" : "text-[color:var(--jd-ink)]/80 hover:text-[color:var(--jd-ink)]"
  }`;
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    onMove(event.key === "ArrowUp" ? -1 : 1);
  };
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition: reducedMotion ? undefined : transition }}
      className={`group flex flex-row items-center gap-0.5 rounded-[var(--radius-jd-sm)] ${
        selected ? "bg-[color:var(--jd-ink)]/[0.08]" : "hover:bg-[color:var(--jd-ink)]/[0.06]"
      } ${isDragging ? "relative z-10 opacity-70" : ""}`}
      data-testid="starred-row"
      data-star-id={`${star.kind}:${star.path}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Drag ${star.name}`}
        className="flex size-6 shrink-0 cursor-grab touch-none flex-row items-center justify-center text-[color:var(--jd-muted)] opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-60"
        {...attributes}
        {...listeners}
        tabIndex={-1}
      >
        <GripVertical size={14} aria-hidden="true" />
      </button>
      {opensPage ? (
        <Link
          href={docsPath(projectId, star.path)}
          onClick={onNavigate}
          aria-current={selected ? "page" : undefined}
          onKeyDown={onKeyDown}
          className={nameClass}
        >
          {label}
        </Link>
      ) : (
        <button type="button" onClick={() => onReveal(star.path)} onKeyDown={onKeyDown} className={nameClass}>
          {label}
        </button>
      )}
      <button
        type="button"
        aria-label={`Remove ${star.name} from Starred`}
        onClick={onRemove}
        className="flex size-11 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)]"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}
