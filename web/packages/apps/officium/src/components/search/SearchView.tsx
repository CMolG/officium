"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, usePathname, useRouter, useSearchParams } from "@javadaba/ui/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Bot, Link2Off, Search, UserRound } from "lucide-react";

import { Button, Input, Select, Text, ToggleGroup, ToggleGroupItem } from "@javadaba/ui";

import { ProjectBadgeSelect } from "../projects/ProjectBadgeSelect";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import {
  EMPTY_BASIC,
  fromBasic,
  parseJql,
  toBasic,
  withOrder,
  type BasicFilters,
  type FieldId,
  type JqlOrder,
} from "../../lib/backlog/jql";
import { cardPath, SAVED_FILTERS, searchPath } from "../../lib/backlog/search-links";
import { ALL_STATUSES, PRIORITY_CONFIG, STATUS_CONFIG } from "../../lib/backlog/status-config";
import { SearchRowStatus } from "./SearchRowStatus";
import { CATEGORY_CONFIG, categoryOptions } from "../../lib/backlog/category-config";
import type { Card, Category, Executor, Priority, Project, ProjectMeta, Status } from "../../lib/backlog/types";
import { formatDate } from "../../lib/backlog/format";
import { StatusShape } from "../backlog/StatusShape";
import { CategoryIcon } from "../backlog/CategoryMarker";
import { JqlInput } from "./JqlInput";

type Mode = "basic" | "jql";

/** Rows mounted at once; "Show more" adds the next batch. */
const PAGE = 100;

const COLUMNS: { field: FieldId | null; label: string }[] = [
  { field: "key", label: "Key" },
  { field: "summary", label: "Summary" },
  { field: "status", label: "Status" },
  { field: "category", label: "Category" },
  { field: "priority", label: "Priority" },
  { field: "executor", label: "Executor" },
  { field: "assignee", label: "Assignee" },
  { field: "epic", label: "Epic" },
  { field: "updated", label: "Updated" },
];

const ERROR_INK = "text-destructive";

/**
 * The card search, laid out like Jira's issue navigator because that is what the people who
 * run a backlog already know (user decision, 2026-09-22): saved filters down the side, a BASIC
 * mode of one control per field, an ADVANCED mode that is a query language, and a results table
 * whose column headers sort it.
 *
 * The URL holds the query that ran (`?jql=`): a search can be linked, bookmarked and reached
 * from the board ("View completed", "Search"), and Back steps through searches. The box holds
 * the draft; nothing runs until Enter or the button, so a half-typed query never flashes an
 * error at every keystroke.
 *
 * The language and its errors are `lib/backlog/jql.ts` -- parsed here too, so a typo shows its
 * error without a round trip. EVALUATION, since JDB-270, runs on the server (`?jql=` on
 * `GET .../cards`, or the memory repository's own copy of the same parser for the demo/e2e
 * seed): the query text is what travels, never every card of the project, and results page
 * through `nextCursor` the same way the board's does.
 */
export function SearchView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const repository = useMemo(() => getBacklogRepository(), []);

  const ranJql = searchParams.get("jql") ?? "";
  const ran = useMemo(() => parseJql(ranJql), [ranJql]);

  const [project, setProject] = useState<Project | null>(null);
  const [projectHasCards, setProjectHasCards] = useState<boolean | null>(null);
  const [meta, setMeta] = useState<ProjectMeta>({ epics: [], tags: [], assignees: [] });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [results, setResults] = useState<Card[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState(ranJql);
  const [mode, setMode] = useState<Mode>(() => (ran.ok && toBasic(ran.query) ? "basic" : "jql"));
  const [modeNote, setModeNote] = useState<string | null>(null);
  const [basicText, setBasicText] = useState(() => (ran.ok ? (toBasic(ran.query)?.text ?? "") : ""));

  // The box follows the URL when the URL changes under it: a saved filter, Back, a link in.
  const [seenJql, setSeenJql] = useState(ranJql);
  if (seenJql !== ranJql) {
    setSeenJql(ranJql);
    setDraft(ranJql);
    const basic = ran.ok ? toBasic(ran.query) : null;
    setBasicText(basic?.text ?? "");
    if (!basic) setMode("jql");
  }

  // Project chrome + whether the project has ANY card at all (one row is enough to tell), so the
  // empty state can say "no cards yet" instead of "no match" -- separate from the search results
  // below, which are a full page (JDB-270 moved their evaluation to the server).
  const load = useCallback(async () => {
    try {
      const [proj, projectMeta, firstRow] = await Promise.all([
        repository.getProject(projectId),
        repository.getProjectMeta(projectId),
        repository.listCards(projectId, { limit: 1 }),
      ]);
      setProject(proj);
      setMeta(projectMeta);
      setProjectHasCards(firstRow.items.length > 0);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't reach the Officium API.");
    }
  }, [projectId, repository]);

  useEffect(() => {
    void load();
  }, [load]);

  // The query that ran, fetched fresh -- the server (or the memory repository's own copy of
  // jql.ts, for the demo/e2e seed) parses, filters and sorts; this only pages through what comes
  // back. Runs again whenever the URL's `?jql=` changes.
  const loadResults = useCallback(async () => {
    if (!ran.ok) {
      setResults(null);
      setNextCursor(null);
      return;
    }
    setResults(null);
    setNextCursor(null);
    try {
      const page = await repository.listCards(projectId, { jql: ranJql, limit: PAGE });
      setResults(page.items);
      setNextCursor(page.nextCursor);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't reach the Officium API.");
    }
  }, [projectId, repository, ranJql, ran.ok]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const showMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await repository.listCards(projectId, { jql: ranJql, cursor: nextCursor, limit: PAGE });
      setResults((prev) => [...(prev ?? []), ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't reach the Officium API.");
    } finally {
      setLoadingMore(false);
    }
  }, [projectId, repository, ranJql, nextCursor, loadingMore]);

  // Live, like the board: any change to the project refetches (officium-api.md §4, "reconnect =
  // refetch"), so a card an agent finishes shows up in "Completed" without a reload.
  useEffect(
    () =>
      repository.subscribe(projectId, (event) => {
        if (event.type !== "card.working" && event.type !== "project.machine" && event.type !== "card.queue") {
          void load();
          void loadResults();
        }
      }),
    [projectId, repository, load, loadResults],
  );

  const run = useCallback(
    (jql: string) => {
      const q = jql.trim();
      router.push(q ? `${pathname}?jql=${encodeURIComponent(q)}` : pathname);
    },
    [pathname, router],
  );

  const basic: BasicFilters = (ran.ok && toBasic(ran.query)) || EMPTY_BASIC;
  const order: JqlOrder[] = ran.ok ? ran.query.orderBy : [];
  const setBasic = (patch: Partial<BasicFilters>) => run(fromBasic({ ...basic, ...patch }, order));

  const vocabulary = useMemo(
    () => ({ epics: meta.epics, labels: meta.tags, assignees: meta.assignees.map((a) => a.name) }),
    [meta],
  );

  function switchMode(next: Mode) {
    setModeNote(null);
    if (next === "jql") {
      setDraft(ranJql);
      setMode("jql");
      return;
    }
    const parsed = parseJql(draft);
    const asBasic = parsed.ok ? toBasic(parsed.query) : null;
    if (!parsed.ok || !asBasic) {
      // Jira refuses the same switch, for the same reason: basic mode would have to drop part
      // of the query to show it.
      setModeNote(
        parsed.ok
          ? "This query can't be shown in basic mode: it uses OR, NOT, a date or two conditions on one field."
          : "Fix the query first: basic mode can only show a query that runs.",
      );
      return;
    }
    if (draft.trim() !== ranJql) run(draft);
    setBasicText(asBasic.text);
    setMode("basic");
  }

  function sortBy(field: FieldId) {
    if (!ran.ok) return;
    const current = ran.query.orderBy[0];
    const dir = current?.field === field && current.dir === "asc" ? "desc" : "asc";
    run(withOrder(ranJql, ran.query, [{ field, dir }]));
  }

  const draftError = draft.trim() === ranJql && !ran.ok ? ran.error : null;
  const errorId = "search-query-error";

  return (
    <div className="officium-rise mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-row flex-wrap items-center gap-3">
        <Link
          href={`/app/p/${projectId}`}
          className="flex min-h-11 flex-row items-center gap-1 text-sm font-medium text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)]"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Board
        </Link>
        <span className="h-4 w-px bg-[color:var(--jd-line)]" aria-hidden="true" />
        <h1 className="text-lg font-bold">Search</h1>
        <ProjectBadgeSelect projectId={projectId} project={project} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Saved filters" className="lg:sticky lg:top-4 lg:w-52 lg:shrink-0 lg:self-start">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--jd-muted)]">Filters</h2>
          <ul className="flex flex-row flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
            {SAVED_FILTERS.map((f) => {
              const current = f.jql === ranJql;
              return (
                <li key={f.id}>
                  <Link
                    href={searchPath(projectId, f.jql)}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-11 flex-row items-center rounded-[var(--radius-jd-sm)] px-3 text-sm lg:min-h-9 ${
                      current
                        ? "bg-[color:var(--jd-ink)] font-semibold text-[color:var(--jd-page)]"
                        : "text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-ink)]/[0.06]"
                    }`}
                  >
                    {f.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <section aria-label="Search" className="min-w-0 lg:flex-1">
          <div className="mb-3 flex flex-row flex-wrap items-center justify-between gap-3">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && switchMode(v as Mode)}
              aria-label="Search mode"
              className="rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] p-1"
            >
              <ToggleGroupItem value="basic" size="sm">Basic</ToggleGroupItem>
              <ToggleGroupItem value="jql" size="sm" aria-label="OQL (Officium Query Language)" title="Officium Query Language: filters written as text, like Jira's JQL">
                OQL
              </ToggleGroupItem>
            </ToggleGroup>
            {modeNote && <p role="status" className="text-xs text-[color:var(--jd-muted)]">{modeNote}</p>}
          </div>

          {mode === "basic" ? (
            <BasicFiltersBar
              filters={basic}
              meta={meta}
              text={basicText}
              onText={setBasicText}
              onSubmitText={() => setBasic({ text: basicText })}
              onChange={setBasic}
            />
          ) : (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                run(draft);
              }}
            >
              <div className="flex flex-row items-start gap-2">
                <div className="min-w-0 flex-1">
                  <JqlInput
                    value={draft}
                    onChange={setDraft}
                    onSubmit={() => run(draft)}
                    vocabulary={vocabulary}
                    invalid={Boolean(draftError)}
                    describedBy={draftError ? errorId : undefined}
                  />
                </div>
                <Button type="submit" register="ui" size="sm" className="h-11">
                  <Search size={16} aria-hidden="true" /> Search
                </Button>
              </div>
              {draftError && (
                <p id={errorId} role="alert" className={`text-sm font-medium ${ERROR_INK}`}>
                  Error in the query: {draftError.message} (character {draftError.at + 1})
                </p>
              )}
              <SyntaxHelp />
            </form>
          )}

          <div className="mt-6">
            {loadError ? (
              <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
                <p className="text-sm font-semibold">Couldn't load this project's cards</p>
                <p className="text-sm text-[color:var(--jd-muted)]">{loadError}</p>
                <Button type="button" register="ui" size="sm" onClick={() => void load()}>
                  Try again
                </Button>
              </div>
            ) : !ran.ok ? (
              <p className="rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] px-6 py-10 text-center text-sm text-[color:var(--jd-muted)]">
                Fix the query above to see results.
              </p>
            ) : results === null ? (
              <p className="py-10 text-center text-sm text-[color:var(--jd-muted)]" role="status">Loading the cards…</p>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] px-6 py-12 text-center">
                <p className="text-sm font-semibold">
                  {projectHasCards === false ? "This project has no cards yet" : "No cards match this search"}
                </p>
                {ranJql ? (
                  <Button type="button" register="ui" variant="outline" size="sm" onClick={() => run("")}>
                    Show every card
                  </Button>
                ) : (
                  <Button asChild register="ui" size="sm">
                    <Link href={`/app/p/${projectId}`}>Go to the board</Link>
                  </Button>
                )}
              </div>
            ) : (
              <>
                <p className="mb-2 text-xs font-medium text-[color:var(--jd-muted)]" role="status">
                  {results.length === 1 && !nextCursor ? "1 card" : `${results.length}${nextCursor ? "+" : ""} cards`}
                </p>
                <ResultsTable
                  projectId={projectId}
                  cards={results}
                  order={order}
                  onSort={sortBy}
                />
                {nextCursor && (
                  <div className="mt-4 flex flex-row justify-center">
                    <Button type="button" register="ui" variant="outline" size="sm" onClick={() => void showMore()}
                      disabled={loadingMore}>
                      {loadingMore ? "Loading…" : "Show more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function BasicFiltersBar({
  filters,
  meta,
  text,
  onText,
  onSubmitText,
  onChange,
}: {
  filters: BasicFilters;
  meta: ProjectMeta;
  text: string;
  onText: (value: string) => void;
  onSubmitText: () => void;
  onChange: (patch: Partial<BasicFilters>) => void;
}) {
  const any = (label: string) => ({ value: "", label });
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-3">
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitText();
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--jd-faint)]" size={16} aria-hidden="true" />
        <Input
          type="search"
          aria-label="Contains text"
          placeholder="Contains text… (Enter to search)"
          className="h-11 pl-9"
          value={text}
          onChange={(event) => onText(event.target.value)}
          onBlur={() => text !== filters.text && onSubmitText()}
        />
      </form>

      <div className="flex flex-row flex-wrap items-center gap-2">
        <ToggleGroup
          type="multiple"
          value={filters.statuses}
          onValueChange={(values) => onChange({ statuses: values as Status[] })}
          aria-label="Status"
          className="flex-wrap justify-start gap-1.5"
        >
          {/* Completed and Rejected included: they have no column on the board, and this is where they are found. */}
          {ALL_STATUSES.map((id) => (
            <ToggleGroupItem key={id} value={id} variant="outline" size="sm">
              <StatusShape status={id} className="size-3.5" />
              {STATUS_CONFIG[id].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-row flex-wrap items-center gap-2">
        <ToggleGroup
          type="multiple"
          value={filters.priorities}
          onValueChange={(values) => onChange({ priorities: values as Priority[] })}
          aria-label="Priority"
          className="flex-wrap justify-start gap-1.5"
        >
          {(Object.values(PRIORITY_CONFIG)).map((p) => (
            <ToggleGroupItem key={p.id} value={p.id} variant="outline" size="sm">
              <p.icon size={14} strokeWidth={2.5} style={{ color: p.color }} aria-hidden="true" />
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <span className="mx-1 h-4 w-px bg-[color:var(--jd-line)]" aria-hidden="true" />

        <ToggleGroup
          type="single"
          value={filters.executor ?? ""}
          onValueChange={(v) => onChange({ executor: v ? (v as Executor) : null })}
          aria-label="Executor"
          className="flex-wrap justify-start gap-1.5"
        >
          <ToggleGroupItem value="ai" variant="outline" size="sm"><Bot size={13} strokeWidth={2.5} /> AI</ToggleGroupItem>
          <ToggleGroupItem value="human" variant="outline" size="sm"><UserRound size={13} strokeWidth={2.5} /> Human</ToggleGroupItem>
        </ToggleGroup>

        <Button
          type="button"
          register="ui"
          variant="outline"
          size="sm"
          aria-pressed={filters.blockedOnly}
          onClick={() => onChange({ blockedOnly: !filters.blockedOnly })}
          className={filters.blockedOnly ? "border-[color:var(--jd-ink)]" : undefined}
        >
          <Link2Off size={14} /> Blocked
        </Button>
      </div>

      <div className="flex flex-row flex-wrap items-center gap-2">
        <Select
          aria-label="Category"
          value={filters.category}
          onChange={(v) => onChange({ category: v ? (v as Category) : null })}
          placeholder="Any category"
          options={[any("Any category"), ...categoryOptions()]}
          menuWidth={220}
        />
        <Select
          aria-label="Assignee"
          value={filters.assignee || null}
          onChange={(v) => onChange({ assignee: v })}
          placeholder="Any assignee"
          options={[any("Any assignee"), ...meta.assignees.map((a) => ({ value: a.name, label: a.name }))]}
        />
        <Select
          aria-label="Epic"
          value={filters.epic || null}
          onChange={(v) => onChange({ epic: v })}
          placeholder="Any epic"
          options={[any("Any epic"), ...meta.epics.map((e) => ({ value: e, label: e }))]}
        />
        <Select
          aria-label="Label"
          value={filters.label || null}
          onChange={(v) => onChange({ label: v })}
          placeholder="Any label"
          options={[any("Any label"), ...meta.tags.map((t) => ({ value: t, label: t }))]}
        />
      </div>
    </div>
  );
}

function ResultsTable({
  projectId,
  cards,
  order,
  onSort,
}: {
  projectId: string;
  cards: Card[];
  order: JqlOrder[];
  onSort: (field: FieldId) => void;
}) {
  const sorted = order[0] ?? { field: "updated" as FieldId, dir: "desc" as const };
  return (
    <div className="overflow-x-auto rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)]">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <thead className="bg-[color:var(--jd-ink)]/[0.03]">
          <tr>
            {COLUMNS.map((col) => {
              const active = col.field !== null && sorted.field === col.field;
              return (
                <th
                  key={col.label}
                  scope="col"
                  aria-sort={active ? (sorted.dir === "asc" ? "ascending" : "descending") : undefined}
                  className="border-b border-[color:var(--jd-line)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest text-[color:var(--jd-muted)]"
                >
                  {col.field ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.field!)}
                      className="inline-flex flex-row min-h-8 items-center gap-1 uppercase hover:text-[color:var(--jd-ink)]"
                    >
                      {col.label}
                      {active && (sorted.dir === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const priority = PRIORITY_CONFIG[card.priority];
            return (
              <tr key={card.id} className="border-b border-[color:var(--jd-line)] last:border-b-0 hover:bg-[color:var(--jd-ink)]/[0.03]">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[color:var(--jd-muted)]">{card.key}</td>
                <td className="px-3 py-2">
                  {/* Opens the card's own page. */}
                  <Link
                    href={cardPath(projectId, card.key)}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {card.title}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2"><SearchRowStatus card={card} /></td>
                <td className="whitespace-nowrap px-3 py-2">
                  {card.category ? (
                    <span className="inline-flex flex-row items-center gap-1.5" title={CATEGORY_CONFIG[card.category].hint}>
                      <CategoryIcon category={card.category} />
                      {CATEGORY_CONFIG[card.category].label}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="inline-flex flex-row items-center gap-1.5">
                    <priority.icon size={14} strokeWidth={2.5} style={{ color: priority.color }} aria-hidden="true" />
                    {priority.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{card.executor === "ai" ? "AI" : "Human"}</td>
                <td className="px-3 py-2">{card.assignees.map((a) => a.name).join(", ") || "—"}</td>
                <td className="px-3 py-2">{card.epic ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[color:var(--jd-muted)]">{formatDate(card.updatedAt.slice(0, 10))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The cheat sheet, closed by default: a Jira user needs it once, and it should not push the results down. */
function SyntaxHelp() {
  return (
    <details className="text-sm text-[color:var(--jd-muted)]">
      <summary className="inline-flex flex-row min-h-11 cursor-pointer items-center font-medium text-[color:var(--jd-ink)]">
        <Text>Query syntax</Text>
      </summary>
      <div className="mt-2 flex flex-col gap-4 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-4 md:flex-row">
        <div className="min-w-0 md:flex-1">
          <p className="mb-1 font-semibold text-[color:var(--jd-ink)]">Fields</p>
          <p className="font-mono text-xs leading-relaxed">
            status, category (type), priority, assignee, executor, epic, labels, blocked, text, summary,
            description, key, created, updated, estimate
          </p>
        </div>
        <div className="min-w-0 md:flex-1">
          <p className="mb-1 font-semibold text-[color:var(--jd-ink)]">Operators</p>
          <p className="font-mono text-xs leading-relaxed">= != &gt; &gt;= &lt; &lt;= ~ !~ in (…) not in (…) is EMPTY is not EMPTY</p>
          <p className="mt-2 font-mono text-xs leading-relaxed">AND OR NOT ( ) ORDER BY field ASC|DESC</p>
        </div>
        <div className="min-w-0 md:flex-1">
          <p className="mb-1 font-semibold text-[color:var(--jd-ink)]">Examples</p>
          <ul className="flex flex-col gap-1 font-mono text-xs leading-relaxed">
            <li><Text>assignee = currentUser() AND status not in (Deploy, Completed, Rejected)</Text></li>
            <li><Text>type = Bug AND status = Completed</Text></li>
            <li><Text>priority &gt;= High AND text ~ &quot;checkout&quot;</Text></li>
            <li><Text>updated &gt;= -7d ORDER BY updated DESC</Text></li>
            <li><Text>labels is EMPTY OR epic = &quot;Launch week&quot;</Text></li>
          </ul>
        </div>
      </div>
    </details>
  );
}
