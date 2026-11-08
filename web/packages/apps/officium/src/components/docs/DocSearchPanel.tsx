"use client";

import { Button, Input } from "@javadaba/ui";
import { Search } from "lucide-react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocTreeNode } from "../../lib/backlog/types";
import { PAGE_SIZE, useDocSearch } from "../../lib/docs/use-doc-search";
import { useNow } from "../../lib/docs/use-now";
import { DocSearchFailure } from "./DocSearchFailure";
import { DocSearchFilterBar, hasFilters } from "./DocSearchFilterBar";
import { DocSearchResultRow } from "./DocSearchResultRow";

const BOX = "flex flex-col items-start gap-2 rounded-[var(--radius-jd-lg)] border p-6";
const OPERATORS = (
  <>
    Use <code className="font-mono">&quot;a phrase&quot;</code>, <code className="font-mono">OR</code> and <code className="font-mono">-word</code>; a partial word matches too.
  </>
);

/**
 * The documentation's Search section (JAVA-800): ranked full-text results with an excerpt, four filters, and
 * its text and filters in the URL. It states every state: initial, searching, results with their count, empty
 * (with a one-click way to clear the filters), error, offline, and "Show more results".
 */
export function DocSearchPanel(props: { projectId: string; repository: BacklogRepository; collections: DocTreeNode[] }) {
  const { projectId, repository, collections } = props;
  const search = useDocSearch(projectId, repository);
  const now = useNow(30_000);
  const { filters, results, failure, more } = search;
  const searched = filters.q.trim() !== "";
  const canShowMore = results !== null && results.length > 0 && results.length % PAGE_SIZE === 0 && !more.done;

  return (
    <section className="flex flex-col gap-4" aria-label="Search the documentation" data-testid="doc-search">
      <header className="flex flex-col gap-1 border-b border-[color:var(--jd-line)] pb-4">
        <h2 className="flex flex-row items-center gap-2 text-2xl font-bold">
          <Search size={20} aria-hidden="true" /> Search
        </h2>
      </header>
      <form
        role="search"
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          search.submit();
        }}
      >
        <Input
          autoFocus
          type="search"
          aria-label="Search the text of every page"
          placeholder="Search the text of every page"
          value={search.text}
          onChange={(event) => search.type(event.target.value)}
          className="h-11 sm:h-9"
          data-testid="doc-search-input"
        />
        <DocSearchFilterBar projectId={projectId} repository={repository} collections={collections} filters={filters} onChange={search.applyFilters} />
      </form>
      {!searched && <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">Type to search titles, paths and text. {OPERATORS}</p>}
      {searched && failure && <DocSearchFailure failure={failure} onRetry={search.retry} />}
      {searched && !failure && results === null && (
        <p role="status" className="text-sm text-[color:var(--jd-muted)]">
          Searching…
        </p>
      )}
      {searched && results?.length === 0 && (
        <div className={`${BOX} border-dashed border-[color:var(--jd-line)]`} data-testid="doc-search-empty">
          {hasFilters(filters) ? (
            <>
              <p className="text-sm font-semibold">No page matches “{filters.q}” with these filters</p>
              <Button type="button" register="ui" variant="outline" size="sm" onClick={() => search.applyFilters({ q: filters.q })}>
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">No page matches “{filters.q}”</p>
              <p className="text-sm text-[color:var(--jd-muted)]">{OPERATORS}</p>
            </>
          )}
        </div>
      )}
      {results !== null && results.length > 0 && (
        <>
          <p aria-live="polite" className="text-sm text-[color:var(--jd-muted)]" data-testid="doc-search-count">
            {results.length}
            {canShowMore ? "+" : ""} {results.length === 1 && !canShowMore ? "page" : "pages"}
          </p>
          <ul className="flex flex-col gap-2">
            {results.map((page) => (
              <DocSearchResultRow key={page.id} projectId={projectId} page={page} now={now} />
            ))}
          </ul>
          {more.failure && <DocSearchFailure failure={more.failure} onRetry={search.showMore} />}
          {canShowMore && !more.failure && (
            <Button type="button" register="ui" variant="outline" disabled={more.loading} onClick={search.showMore}>
              {more.loading ? "Loading…" : "Show more results"}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
