import { Text } from "@javadaba/ui";

import { DOC_PAGE_PENDING } from "../../lib/docs/pending-options";
import { OPTION_ROW } from "./doc-page-option-row";

/**
 * The wiki features the design draws in "Page options" that nothing serves yet (Doc-Page "More for the wiki"): a public
 * link, who viewed, export as PDF or HTML, find and replace, two pages side by side, presenting and asking the wiki.
 * Each row is there, off, and says why in words, instead of vanishing or pretending (`lib/docs/pending-options.ts`
 * lists what each needs).
 */
export function DocPageMoreOptions() {
  return (
    <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 border-t border-[color:var(--jd-line)] p-0 pt-1" aria-label="Not available yet">
      {DOC_PAGE_PENDING.map((option) => (
        <li key={option.id}>
          <button type="button" disabled aria-describedby={`pending-${option.id}`} className={`${OPTION_ROW} flex-col items-start justify-center gap-0 opacity-60`}>
            <Text>{option.label}</Text>
            <Text id={`pending-${option.id}`} className="text-xs font-normal text-[color:var(--jd-muted)]">
              {option.reason}
            </Text>
          </button>
        </li>
      ))}
    </ul>
  );
}
