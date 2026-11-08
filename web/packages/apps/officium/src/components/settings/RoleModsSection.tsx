"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton, Text } from "@javadaba/ui";

import type { ModSummary } from "../../lib/backlog/mod-types";
import { firstSentence, modLabel } from "../../lib/backlog/role-config";
import { sheetMarkdown } from "../../lib/backlog/role-sheet";
import { useModCatalog } from "../../lib/backlog/use-mods";
import { ModExplainDialog } from "./ModExplainDialog";
import { SectionHead } from "./SheetParts";

// The rich-text renderer comes with the first open of the sheet, not with the role page (JAVA-1647).
const MarkdownView = dynamic(() => import("@javadaba/rich-text").then((m) => m.MarkdownView), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
});

/**
 * What a role follows besides its own sheet (card://JAVA-1569): the mods its sheet requires, always on whatever the
 * work profile says, each leading to its sheet; and the whole sheet the API served, in Markdown, for the person who
 * wants the text the summary above was read from.
 */
export function RoleModsSection({ roleId, projectId, body }: { roleId: string; projectId: string | null; body: string | null }) {
  const catalog = useModCatalog(projectId ?? undefined);
  const [sheetOpened, setSheetOpened] = useState(false);
  const [explained, setExplained] = useState<ModSummary | null>(null);
  const required = catalog.state === "ready" ? catalog.mods.filter((mod) => mod.requiredBy.includes(roleId)) : [];

  return (
    <>
      <section aria-labelledby="role-mods" className="flex flex-col gap-5">
        <SectionHead id="role-mods">Mods it follows</SectionHead>
        {catalog.state === "loading" ? (
          <Text role="status" className="text-sm text-[color:var(--jd-muted)]">Loading its mods…</Text>
        ) : catalog.state === "error" ? (
          <Text role="alert" className="text-sm text-[color:var(--jd-muted)]">{`Couldn't load the mods: ${catalog.message}`}</Text>
        ) : required.length === 0 ? (
          <Text as="p" className="max-w-[62ch] text-sm text-[color:var(--jd-muted)]">
            Its sheet requires no mod. A work profile or a project can still mount mods on the cells it works.
          </Text>
        ) : (
          <>
            <ul aria-label="Mods this role requires" className="flex flex-col border-t border-[color:var(--jd-line)]">
              {required.map((mod) => (
                <li key={mod.modId} className="border-b border-[color:var(--jd-line)]">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setExplained(mod)}
                    data-testid="role-required-mod"
                    data-mod={mod.modId}
                    className="flex min-h-14 flex-col justify-center px-1 py-2.5 hover:bg-muted w-full text-left"
                  >
                    <Text className="font-bold">{modLabel(mod.modId)}</Text>
                    <Text className="text-sm text-[color:var(--jd-muted)]">{firstSentence(mod.description)}</Text>
                  </button>
                </li>
              ))}
            </ul>
            <Text as="p" className="max-w-[62ch] text-sm text-[color:var(--jd-muted)]">
              Always on for this role. A work profile or the project&apos;s roles can mount more on the cells it works.
            </Text>
          </>
        )}
      </section>

      {explained && <ModExplainDialog mod={explained} roleId={roleId} projectId={projectId} onClose={() => setExplained(null)} />}

      {body && (
        <details
          className="rounded-[var(--radius-jd-xl)] border border-[color:var(--jd-line)] p-4"
          data-testid="role-full-sheet"
          onToggle={(event) => {
            if (event.currentTarget.open) setSheetOpened(true);
          }}
        >
          <summary className="min-h-11 cursor-pointer content-center font-[family-name:var(--font-jd-kicker)] text-sm font-bold uppercase tracking-[0.22em]">
            <Text>Read its whole sheet</Text>
          </summary>
          <div className="max-w-[72ch] pt-4">
            {sheetOpened && <MarkdownView markdown={sheetMarkdown(body)} className="text-pretty text-base leading-relaxed" />}
          </div>
        </details>
      )}
    </>
  );
}
