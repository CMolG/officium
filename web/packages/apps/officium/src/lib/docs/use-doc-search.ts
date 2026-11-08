"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "@javadaba/ui/navigation";

import { ApiError } from "../backlog/api-error";
import { docsPath } from "../backlog/search-links";
import type { BacklogRepository } from "../backlog/repository";
import type { DocSearchFilters, DocSearchRange, DocSearchResult, DocSearchState } from "../backlog/types";
import { SEARCH_PATH } from "./doc-path";
import { UPDATED_RANGES } from "./doc-search-query";

export const PAGE_SIZE = 25;
const STATES: readonly DocSearchState[] = ["published", "unpublished", "archived"];

/** The text and filters the URL carries; anything unreadable is dropped rather than shown. */
export function filtersFromUrl(params: URLSearchParams): DocSearchFilters {
  const updated = params.get("updated") as DocSearchRange | null;
  const state = params.get("state") as DocSearchState | null;
  return {
    q: params.get("q") ?? "",
    collection: params.get("collection") || undefined,
    author: params.get("author") || undefined,
    updated: updated && UPDATED_RANGES.includes(updated) && updated !== "any" ? updated : undefined,
    state: state && STATES.includes(state) ? state : undefined,
  };
}

export function urlFor(projectId: string, filters: DocSearchFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return `${docsPath(projectId, SEARCH_PATH)}${query ? `?${query}` : ""}`;
}

export type SearchFailure = { offline: boolean; message: string };
type MoreState = { loading: boolean; failure: SearchFailure | null; done: boolean };
const IDLE: MoreState = { loading: false, failure: null, done: false };

const failureOf = (err: unknown): SearchFailure =>
  err instanceof ApiError && err.code === "network_error"
    ? { offline: true, message: err.message }
    : { offline: false, message: err instanceof Error ? err.message : "Couldn't reach the Officium API." };

/**
 * The search section's state (JAVA-800): the text and filters live in the URL (replace, so Reload and Back
 * keep them), a search runs 250 ms after typing stops or at once on Enter, a newer one aborts the older,
 * and "Show more" asks for the next page of 25.
 */
export function useDocSearch(projectId: string, repository: BacklogRepository) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromUrl(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [text, setText] = useState(filters.q);
  // The text the URL last carried on our own account; a different one came from outside (the command menu,
  // Back), and replaces what is typed. Adjusting state during render is React's way to do that.
  const [applied, setApplied] = useState(filters.q);
  if (filters.q !== applied) {
    setApplied(filters.q);
    setText(filters.q);
  }
  // What a search answered, tagged with the search it answered: another search makes it stale without a reset.
  const [outcome, setOutcome] = useState<{ key: string; results: DocSearchResult[] | null; failure: SearchFailure | null; more: MoreState } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback(
    (next: DocSearchFilters) => {
      setApplied(next.q);
      router.replace(urlFor(projectId, next));
    },
    [projectId, router],
  );
  // A filter change keeps what is typed, even before its 250 ms are up, and takes the place of that pending
  // search: left armed, it would fire with the filters it captured and undo this change.
  const applyFilters = useCallback(
    (next: DocSearchFilters) => {
      if (timer.current) clearTimeout(timer.current);
      apply({ ...next, q: text });
    },
    [apply, text],
  );

  const type = useCallback(
    (value: string) => {
      setText(value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => apply({ ...filters, q: value }), 250);
    },
    [apply, filters],
  );
  const submit = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    apply({ ...filters, q: text });
  }, [apply, filters, text]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const { q, collection, author, updated, state } = filters;
  const key = JSON.stringify([projectId, q, collection, author, updated, state, attempt]);
  useEffect(() => {
    if (!q.trim()) return;
    const controller = new AbortController();
    const settle = (next: { results: DocSearchResult[] | null; failure: SearchFailure | null }) =>
      !controller.signal.aborted && setOutcome({ key, ...next, more: IDLE });
    repository.searchDocs(projectId, { q, collection, author, updated, state }, { limit: PAGE_SIZE, signal: controller.signal }).then(
      (found) => settle({ results: found, failure: null }),
      (err) => settle({ results: null, failure: failureOf(err) }),
    );
    return () => controller.abort();
  }, [projectId, repository, q, collection, author, updated, state, key]);

  const current = q.trim() && outcome?.key === key ? outcome : null;
  const results = current?.results ?? null;
  const showMore = useCallback(() => {
    if (!results) return;
    const patch = (more: MoreState, added: DocSearchResult[] = []) =>
      setOutcome((now) => (now?.key === key ? { ...now, results: [...(now.results ?? []), ...added], more } : now));
    patch({ ...IDLE, loading: true });
    repository.searchDocs(projectId, filters, { limit: PAGE_SIZE, offset: results.length }).then(
      (next) => patch({ ...IDLE, done: next.length < PAGE_SIZE }, next),
      (err) => patch({ ...IDLE, failure: failureOf(err) }),
    );
  }, [filters, key, projectId, repository, results]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { filters, text, type, submit, applyFilters, results, failure: current?.failure ?? null, more: current?.more ?? IDLE, showMore, retry };
}
