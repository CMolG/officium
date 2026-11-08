import { Text } from "@javadaba/ui";

import { conditionsOf, FACET_LABEL, priorityLabel, valueLabel } from "../../../lib/configuration/precedence-model";
import type { DraftRule } from "./use-precedence";

/** A rule read as a sentence: if its conditions, then its priority floor and whether it joins the sprint, and how many open cards it caught. */
export function PrecedenceRuleSentence({ draft }: { draft: DraftRule }) {
  const { rule } = draft;
  const priority = priorityLabel(rule);
  return (
    <Text className="min-w-0 flex-1 text-sm">
      <span className="text-[color:var(--jd-muted)]">If </span>
      {conditionsOf(rule).map((c, i) => (
        <span key={c.facet}>
          {i > 0 && <span className="text-[color:var(--jd-muted)]"> and </span>}
          {FACET_LABEL[c.facet]} is <strong>{valueLabel(c)}</strong>
        </span>
      ))}
      <span className="text-[color:var(--jd-muted)]"> then </span>
      {priority && <strong>{`At least ${priority}`}</strong>}
      {priority && rule.defaults.sprint === "join" && <span>, </span>}
      {rule.defaults.sprint === "join" && <strong>Joins the sprint</strong>}
      {draft.openMatches !== null && (
        <span className="text-[color:var(--jd-muted)]">{` · ${draft.openMatches} open ${draft.openMatches === 1 ? "card" : "cards"}`}</span>
      )}
    </Text>
  );
}
