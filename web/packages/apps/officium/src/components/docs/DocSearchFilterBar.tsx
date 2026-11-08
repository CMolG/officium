"use client";

import { useEffect, useState } from "react";
import { Select } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocSearchFilters, DocSearchRange, DocSearchState, DocTreeNode, Member } from "../../lib/backlog/types";
import { FIELD_SELECT } from "../../lib/field-select";

const ANY = "any";

const RANGES: { value: DocSearchRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "day", label: "Past day" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
];

const STATES: { value: DocSearchState | typeof ANY; label: string }[] = [
  { value: ANY, label: "Published and your drafts" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Your unpublished drafts" },
  { value: "archived", label: "Archived" },
];

/** True when any filter narrows the search, which is when an empty result offers to clear them. */
export const hasFilters = (filters: DocSearchFilters) => Boolean(filters.collection || filters.author || filters.updated || filters.state);

/**
 * The four filters of the documentation search (JAVA-800): collection, author, last updated and state. Each
 * shows its value, so what narrows the results is always readable. They wrap on a phone.
 */
export function DocSearchFilterBar(props: {
  projectId: string;
  repository: BacklogRepository;
  collections: DocTreeNode[];
  filters: DocSearchFilters;
  onChange: (next: DocSearchFilters) => void;
}) {
  const { projectId, repository, collections, filters, onChange } = props;
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    let cancelled = false;
    repository.listMembers(projectId).then(
      (list) => !cancelled && setMembers(list),
      () => !cancelled && setMembers([]),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository]);

  // A wrapping row, the native subset's way: padded cells and a negative margin as the gutter (no calc()).
  const item = "min-w-0 w-full px-1 sm:w-1/2 lg:w-1/4";
  return (
    <div className="-mx-1 flex flex-row flex-wrap gap-y-2" role="group" aria-label="Search filters">
      <div className={item}>
        <Select
          aria-label="Collection"
          value={filters.collection ?? ANY}
          onChange={(value) => onChange({ ...filters, collection: value === ANY ? undefined : value })}
          options={[{ value: ANY, label: "Every collection" }, ...collections.map((node) => ({ value: node.path, label: node.name }))]}
          className={FIELD_SELECT}
        />
      </div>
      <div className={item}>
        <Select
          aria-label="Author"
          value={filters.author ?? ANY}
          onChange={(value) => onChange({ ...filters, author: value === ANY ? undefined : value })}
          options={[{ value: ANY, label: "Anyone" }, ...members.map((member) => ({ value: member.accountId, label: member.name }))]}
          className={FIELD_SELECT}
        />
      </div>
      <div className={item}>
        <Select
          aria-label="Updated"
          value={filters.updated ?? ANY}
          onChange={(value) => onChange({ ...filters, updated: value === ANY ? undefined : (value as DocSearchRange) })}
          options={RANGES}
          className={FIELD_SELECT}
        />
      </div>
      <div className={item}>
        <Select
          aria-label="State"
          value={filters.state ?? ANY}
          onChange={(value) => onChange({ ...filters, state: value === ANY ? undefined : (value as DocSearchState) })}
          options={STATES}
          className={FIELD_SELECT}
        />
      </div>
    </div>
  );
}
