import { Link } from "@javadaba/ui/navigation";
import { Text, typeClass } from "@javadaba/ui";
import { MarkdownView } from "@javadaba/rich-text";

import type { ModSheet } from "../../lib/backlog/mod-types";
import { modLabel, modSheetHref, roleLabel, roleSheetHref } from "../../lib/backlog/role-config";
import { sheetMarkdown } from "../../lib/backlog/role-sheet";
import { KICKER, SectionHead } from "./SheetParts";

export function ModSheetBody({ mod, label }: { mod: ModSheet; label: string }) {
  return (
    <>
      <header className="flex flex-col gap-4">
        <Text className={KICKER}>{`Mod · ${mod.domains.join(", ") || "Universal"} · From Fluxor's catalog`}</Text>
        <h1 className={`break-words ${typeClass("display-m")}`}>
          {label}
          <span aria-hidden="true" className="text-[color:var(--jd-accent-ink)]">
            .
          </span>
        </h1>
        <Text as="p" className="max-w-[62ch] text-base text-[color:var(--jd-muted)]">
          {mod.description}
        </Text>
        {mod.tags.length > 0 && (
          <ul aria-label="Tags" className="flex flex-row flex-wrap gap-2">
            {mod.tags.map((tag) => (
              <li key={tag} className="rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] px-2 py-1.5 font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.12em]">
                <Text>{tag}</Text>
              </li>
            ))}
          </ul>
        )}
      </header>

      <section aria-labelledby="mod-required" className="flex flex-col gap-4">
        <SectionHead id="mod-required">Required by</SectionHead>
        {mod.requiredBy.length > 0 ? (
          <ul aria-label="Roles that require this mod" className="flex flex-row flex-wrap gap-2">
            {mod.requiredBy.map((role) => (
              <li key={role} data-role={role}>
                <Link
                  href={roleSheetHref(role)}
                  className="flex min-h-11 flex-row items-center rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] px-3 text-sm font-semibold hover:border-[color:var(--jd-control-border)]"
                >
                  <Text>{roleLabel(role)}</Text>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Text as="p" className="text-sm text-[color:var(--jd-muted)]">No role requires it. A work profile can still mount it on any cell.</Text>
        )}
      </section>

      <section aria-labelledby="mod-excludes" className="flex flex-col gap-4">
        <SectionHead id="mod-excludes">Can&apos;t be combined with</SectionHead>
        {mod.incompatibleWith.length > 0 ? (
          <>
            <ul aria-label="Mods this one excludes" className="flex flex-row flex-wrap gap-2">
              {mod.incompatibleWith.map((other) => (
                <li key={other} data-mod={other}>
                  <Link
                    href={modSheetHref(other)}
                    className="flex min-h-11 flex-row items-center rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] px-3 text-sm font-semibold hover:border-[color:var(--jd-control-border)]"
                  >
                    <Text>{modLabel(other)}</Text>
                  </Link>
                </li>
              ))}
            </ul>
            <Text as="p" className="max-w-[62ch] text-sm text-[color:var(--jd-muted)]">
              On one card the first of the two a role meets stays and the other is left out; a role&apos;s required mods always stay.
            </Text>
          </>
        ) : (
          <Text as="p" className="text-sm text-[color:var(--jd-muted)]">It goes with every other mod.</Text>
        )}
      </section>

      <section aria-labelledby="mod-body" className="flex flex-col gap-5">
        <SectionHead id="mod-body">What it asks</SectionHead>
        <div data-testid="mod-body" className="max-w-[72ch] rounded-[var(--radius-jd-xl)] border border-[color:var(--jd-line)] p-6">
          <MarkdownView markdown={sheetMarkdown(mod.body)} className="text-pretty text-base leading-relaxed" />
        </div>
      </section>

      <footer className="border-t border-[color:var(--jd-line)] pt-5">
        <Text as="p" className="max-w-[56ch] text-sm text-[color:var(--jd-muted)]">
          What this mod asks is written in Fluxor&apos;s catalog and is read-only here. Which cells mount it is set in a work profile or a project&apos;s roles.
        </Text>
      </footer>
    </>
  );
}
