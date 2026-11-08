"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input, Radio } from "@javadaba/ui";

import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import type { DocTreeNode } from "../../lib/backlog/types";
import { destinationsOf, resultPath, type Destination } from "../../lib/docs/doc-move";
import { findNode } from "../../lib/docs/doc-tree";

const showsPath = (place: Destination) => place.path !== "" && place.path !== place.name;

/**
 * "Move to…" (JAVA-792): the keyboard-reachable way to re-nest a page or a whole section. A filter, then
 * the places it can go -- the top level, and every shown node outside the moved one -- as a radio group,
 * so the arrow keys, Tab and Space all work. It shows the path the page will have, and names a taken one
 * before anything is sent.
 */
export function MoveDocDialog({
  node,
  roots,
  onClose,
  onSubmit,
}: {
  node: DocTreeNode;
  roots: DocTreeNode[];
  onClose: () => void;
  /** Resolves to what to tell the person, or `null` once it moved. */
  onSubmit: (destination: string) => Promise<string | null>;
}) {
  const returnFocus = useReturnFocus();
  const [filter, setFilter] = useState("");
  const [destination, setDestination] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const places = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return destinationsOf(roots, node.path).filter(
      (place) => !needle || place.path === "" || place.name.toLowerCase().includes(needle) || place.path.includes(needle),
    );
  }, [roots, node.path, filter]);

  // A pick the filter now hides counts as no pick: nothing visibly chosen is never what "Move here" sends.
  const chosen = destination !== null && places.some((place) => place.path === destination) ? destination : null;
  const target = chosen === null ? null : resultPath(chosen, node.path);
  const problem =
    target === null
      ? null
      : target === node.path
        ? `${node.name} is already there.`
        : findNode(roots, target)
          ? `"${target}" is already taken. Rename one of them first, or pick another place.`
          : null;
  const ready = chosen !== null && !problem && !busy;

  async function submit() {
    if (!ready || chosen === null) return;
    setBusy(true);
    setError(null);
    const failure = await onSubmit(chosen);
    setBusy(false);
    if (failure) setError(failure);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-md">
        <DialogTitle>Move {node.name}</DialogTitle>
        <DialogDescription>Pick where it goes. Everything under it moves along, and the old address keeps working.</DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Find a place</span>
            <Input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. guides" />
          </label>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div
              role="radiogroup"
              aria-label={`Move ${node.name} to`}
              className="flex max-h-64 min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain"
              data-testid="move-places"
            >
              {places.map((place) => (
                <div
                  key={place.path || "top"}
                  className="flex min-h-11 flex-row items-center rounded-[var(--radius-jd-sm)] pr-2 text-sm [&>label]:min-h-11 [&>label]:w-full [&>label]:items-center hover:bg-[color:var(--jd-ink)]/[0.06] has-[:checked]:bg-[color:var(--jd-ink)]/[0.08] has-[:checked]:font-semibold"
                  style={{ paddingLeft: 8 + Math.max(place.depth - 1, 0) * 14 }}
                >
                  <Radio
                    name="move-destination"
                    // The path is part of the name wherever it says more: two sections can share a title ("Deploy").
                    aria-label={showsPath(place) ? `${place.name}, ${place.path}` : place.name}
                    checked={chosen === place.path}
                    onChange={() => {
                      setDestination(place.path);
                      setError(null);
                    }}
                    description={showsPath(place) ? <span className="truncate font-mono">{place.path}</span> : undefined}
                  >
                    <span className="truncate">{place.name}</span>
                  </Radio>
                </div>
              ))}
              {places.length === 1 && filter.trim() && (
                <p className="px-2 py-2 text-sm text-[color:var(--jd-muted)]">No section matches &ldquo;{filter.trim()}&rdquo;.</p>
              )}
            </div>
          </div>
          <p className={`text-xs ${problem ? "text-destructive" : "text-[color:var(--jd-muted)]"}`} role={problem ? "alert" : "status"}>
            {problem ?? (target ? `It will live at ${target}.` : "Pick a place to see the new address.")}
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
            <Button type="button" register="ui" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" register="ui" disabled={!ready}>
              {busy ? "Moving…" : "Move here"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
