import { Link } from "@javadaba/ui/navigation";
import { Text } from "@javadaba/ui";

import { CATEGORY_CONFIG, CATEGORY_GROUPS, categoryColor, categorySheetHref } from "../../lib/backlog/category-config";
import { DEFAULT_ROLE_MATRIX, PHASE_STATUS } from "../../lib/backlog/role-config";
import { PHASES } from "../../lib/backlog/role-matrix";
import type { Category } from "../../lib/backlog/types";
import { StatusShape } from "../backlog/StatusShape";
import { ConfigPage } from "../configuration/ConfigPage";
import { KICKER } from "./SheetParts";

/**
 * Categories, in the workspace's settings (JAVA-519; rebuilt to JAVA-516's design by JAVA-518):
 * every kind of card in its group, each row leading to the category's sheet, where its contract
 * and who works it live.
 */
export function CategoriesView() {
  return (
    <ConfigPage wide title="Categories" lede="What a card is decides who works it. Each row shows how many roles work it in each phase.">
      {/* The mini tracks count the default matrix; a sheet counts the last-opened project, which an override can change. */}
      <Text as="p" className="hidden max-w-[62ch] text-sm text-[color:var(--jd-muted)] sm:block">
        Beside each category, how many roles work it in each phase by default. A project can change that; its sheet shows the
        project you last opened.
      </Text>
      {CATEGORY_GROUPS.map((group) => (
        <section key={group.label} aria-labelledby={`group-${group.categories[0]}`} className="flex flex-col gap-2.5">
          <h2 id={`group-${group.categories[0]}`} className={KICKER}>
            {group.label}
          </h2>
          <ul className="flex flex-col border-t border-[color:var(--jd-line)]">
            {group.categories.map((id) => (
              <li key={id} id={`category-${id}`} className="border-b border-[color:var(--jd-line)]">
                <Link
                  href={categorySheetHref(id)}
                  data-testid="category-entry"
                  data-category={id}
                  className="flex min-h-14 flex-row items-center gap-3.5 px-1 py-2.5 hover:bg-muted"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span aria-hidden="true" className="h-1 w-7 rounded-full" style={{ background: categoryColor(id) }} />
                    <Text className="font-bold">{CATEGORY_CONFIG[id].label}</Text>
                    <Text className="text-sm text-[color:var(--jd-muted)]">{CATEGORY_CONFIG[id].hint}</Text>
                  </div>
                  <MiniTrack id={id} />
                  <Text aria-hidden="true" className="w-6 shrink-0 text-right font-[family-name:var(--font-jd-kicker)] font-bold">
                    →
                  </Text>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </ConfigPage>
  );
}

/** Each phase's polygon over how many roles work the category there (the default matrix): the
 *  sheet says it in words, so here it is decoration. */
function MiniTrack({ id }: { id: Category }) {
  return (
    <div aria-hidden="true" className="hidden shrink-0 flex-row items-end gap-1.5 sm:flex">
      {PHASES.map((phase) => (
        <div key={phase} className="flex w-6 flex-col items-center gap-1">
          <StatusShape status={PHASE_STATUS[phase]} className="size-4" />
          <Text className="font-[family-name:var(--font-jd-kicker)] text-[10px] font-bold text-[color:var(--jd-muted)]">
            {DEFAULT_ROLE_MATRIX.categories[id]?.[phase]?.length ?? 0}
          </Text>
        </div>
      ))}
    </div>
  );
}
