"use client";

import { useMemo, useRef, useState } from "react";
import { Link } from "@javadaba/ui/navigation";
import { Button, Input, Text } from "@javadaba/ui";

import { firstSentence, modLabel, modSheetHref, roleLabel } from "../../lib/backlog/role-config";
import { useModCatalog } from "../../lib/backlog/use-mods";
import { KICKER, SectionHead, SheetLoading } from "./SheetParts";

/**
 * Every mod of Fluxor's catalog (card://JAVA-1569), under the roles on the Roles page: a mod is a rule an agent follows on
 * top of its role, and a work profile mounts them on a cell. A filter by name and tags narrows the list; each mod leads
 * to its sheet. The list is read through the person's last project: the catalog is Fluxor's, not a project's.
 */
export function ModsIndexSection() {
  const catalog = useModCatalog();
  const [filter, setFilter] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const filterField = useRef<HTMLInputElement>(null);
  const mods = useMemo(() => (catalog.state === "ready" ? catalog.mods : []), [catalog]);
  // The tags that sort the catalog: the commonest ones, not every word a mod was ever tagged with.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const name of mods.flatMap((m) => m.tags)) counts.set(name, (counts.get(name) ?? 0) + 1);
    const common = [...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([name]) => name);
    return (tag && !common.includes(tag) ? [...common, tag] : common).sort();
  }, [mods, tag]);
  const query = filter.trim().toLowerCase();
  const shown = mods.filter(
    (m) => (!query || modLabel(m.modId).toLowerCase().includes(query) || m.modId.includes(query)) && (!tag || m.tags.includes(tag)),
  );

  return (
    <section aria-labelledby="mods-all" className="flex flex-col gap-6">
      <SectionHead id="mods-all">Mods</SectionHead>
      <Text as="p" className="max-w-[62ch] text-sm text-[color:var(--jd-muted)]">
        A mod is a rule an agent follows on top of its role, such as walking the written rules in a review. A role can require
        some, and a work profile mounts more on any cell.
      </Text>
      {catalog.state === "loading" ? (
        <SheetLoading label="Loading the mods" />
      ) : catalog.state === "none" ? (
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">Mods are read through a project. Create one, and they show up here.</Text>
      ) : catalog.state === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
          <Text className="text-sm font-semibold">Couldn&apos;t load the mods</Text>
          <Text className="text-sm text-[color:var(--jd-muted)]">{catalog.message}</Text>
          <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={catalog.retry}>
            <Text>Try again</Text>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-row flex-wrap items-center gap-3">
            <Input
              ref={filterField}
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name"
              aria-label="Filter mods by name"
              className="min-h-11 w-full sm:max-w-sm"
            />
            <Text role="status" className={KICKER}>{`${shown.length} of ${mods.length} mods`}</Text>
          </div>
          <ul aria-label="Filter mods by tag" className={`${tags.length === 0 ? "hidden" : "flex"} flex-row flex-wrap gap-2`}>
            {tags.map((name) => (
              <li key={name}>
                <Button
                  type="button"
                  register="ui"
                  size="sm"
                  variant="outline"
                  aria-pressed={tag === name}
                  className={`min-h-11 ${tag === name ? "border-[color:var(--jd-ink)] bg-muted font-bold" : ""}`}
                  onClick={() => setTag(tag === name ? null : name)}
                >
                  <Text>{name}</Text>
                </Button>
              </li>
            ))}
          </ul>
          {shown.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
              <Text className="font-semibold">No mod matches.</Text>
              <Button
                type="button"
                register="ui"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setFilter("");
                  setTag(null);
                  filterField.current?.focus();
                }}
              >
                <Text>Clear the filters</Text>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col border-t border-[color:var(--jd-line)]">
              {shown.map((mod) => (
                <li key={mod.modId} className="border-b border-[color:var(--jd-line)]">
                  <Link
                    href={modSheetHref(mod.modId)}
                    data-testid="mod-entry"
                    data-mod={mod.modId}
                    className="flex min-h-14 flex-row items-center gap-3.5 px-1 py-2.5 hover:bg-muted"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Text className="font-bold">{modLabel(mod.modId)}</Text>
                      <Text className="text-sm text-[color:var(--jd-muted)]">{firstSentence(mod.description)}</Text>
                      <Text className="text-xs text-[color:var(--jd-muted)]">{mod.tags.join(" · ")}</Text>
                    </div>
                    {mod.requiredBy.length > 0 && (
                      <Text className="max-w-40 shrink-0 text-right font-[family-name:var(--font-jd-kicker)] text-xs font-bold text-[color:var(--jd-muted)]">
                        {`Required by ${mod.requiredBy.length === 1 ? roleLabel(mod.requiredBy[0]) : `${mod.requiredBy.length} roles`}`}
                      </Text>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
