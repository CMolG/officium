"use client";

import { useEffect, useRef, useState } from "react";
import { Button, EmptyState, Note, Text } from "@javadaba/ui";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";

import { useSearchParams } from "@javadaba/ui/navigation";

import { ruleProblem } from "../../../lib/configuration/precedence-model";
import { MAX_PRECEDENCE_RULES } from "../../../lib/configuration/precedence";
import { useProjectOwner } from "../../../lib/configuration/use-project-owner";
import { useCopy } from "../../../lib/i18n/use-copy";
import { ConfigPage } from "../ConfigPage";
import { ConfigSection } from "../ConfigSection";
import { ConfigLoadError } from "../ConfigLoadError";
import { ConfigLoading } from "../ConfigLoading";
import { PrecedenceRuleDialog } from "./PrecedenceRuleDialog";
import { PrecedenceRuleSentence } from "./PrecedenceRuleSentence";
import { usePrecedence } from "./use-precedence";

/**
 * Configuration, Precedence (ADR 0032, JAVA-1686, Cfg-Rules): the rules that raise a card's priority or pull it into the
 * sprint, read top to bottom, up to twenty. Owners edit, reorder and save them; members read. Rules move with their
 * Move buttons; a card takes the first rule it matches, and a rule never lowers a priority someone set higher.
 */
export function PrecedenceView({ projectId }: { projectId: string }) {
  const { isOwner } = useProjectOwner(projectId);
  const p = usePrecedence(projectId);
  const { configuration } = useCopy();
  const [editing, setEditing] = useState<string | null>(null);
  const editedAt = p.rules.findIndex((r) => r.key === editing);
  const edited = editedAt >= 0 ? p.rules[editedAt]! : null;

  // A card's "See the rule" link carries ?rule=<id>: scroll to that row and focus it once the rules have loaded.
  const target = useSearchParams().get("rule");
  const rows = useRef(new Map<string, HTMLLIElement>());
  const loaded = p.list !== null && p.list !== undefined;
  useEffect(() => {
    const row = loaded && target ? rows.current.get(target) : undefined;
    row?.scrollIntoView({ block: "center" });
    row?.focus();
  }, [loaded, target]);

  return (
    <ConfigPage title={configuration.sections.precedence} lede="Which open cards rise in priority or join the sprint, read top to bottom.">
      {p.loadError && !p.list && <ConfigLoadError title="Couldn't load the rules" detail={p.loadError} onRetry={p.retry} />}
      {!p.list && !p.loadError && <ConfigLoading label="Loading the precedence rules" />}
      {p.list && (
        <ConfigSection title="Rules" note={`${p.rules.length} of ${MAX_PRECEDENCE_RULES} rules`} hint="A card takes the first rule it matches. A rule never lowers a priority someone set higher, and never removes a card from a sprint.">
          {p.rules.length === 0 ? (
            <EmptyState title="No rules yet" action={isOwner ? <Button type="button" register="ui" className="min-h-11" onClick={() => setEditing(p.add())}>Add the first rule</Button> : undefined}>
              Cards keep the priority their creator gave them.
            </EmptyState>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Precedence rules">
              {p.rules.map((draft, at) => (
                <li key={draft.key} ref={(el) => { if (el) rows.current.set(draft.key, el); else rows.current.delete(draft.key); }} tabIndex={-1} className="flex scroll-mt-24 outline-none focus-visible:ring-2 flex-row flex-wrap items-center gap-3 rounded-2xl bg-[color:var(--jd-card)] px-4 py-3">
                  <Text className="w-5 shrink-0 font-[family-name:var(--font-jd-display)] text-lg font-bold">{at + 1}</Text>
                  <PrecedenceRuleSentence draft={draft} />
                  {isOwner && (
                    <span className="flex flex-row items-center gap-1">
                      <Button type="button" register="ui" variant="ghost" size="icon" aria-label={`Move rule ${at + 1} up`} disabled={at === 0} onClick={() => p.move(draft.key, -1)}>
                        <ArrowUp size={16} aria-hidden="true" />
                      </Button>
                      <Button type="button" register="ui" variant="ghost" size="icon" aria-label={`Move rule ${at + 1} down`} disabled={at === p.rules.length - 1} onClick={() => p.move(draft.key, 1)}>
                        <ArrowDown size={16} aria-hidden="true" />
                      </Button>
                      <Button type="button" register="ui" variant="ghost" size="icon" aria-label={`Edit rule ${at + 1}`} onClick={() => setEditing(draft.key)}>
                        <Pencil size={16} aria-hidden="true" />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          {!isOwner && (
            <Note tone="neutral">
              <strong>Read only.</strong> Owners write the rules; you can see them.
            </Note>
          )}
          {p.conflict && (
            <Note tone="warning">
              <strong>Changed elsewhere.</strong> Another owner saved the rules first. The list now shows theirs.
            </Note>
          )}
          {p.saveError && (
            <Note tone="danger">
              <strong>Couldn&apos;t save.</strong> {p.saveError} Your {p.changes} {p.changes === 1 ? "change is" : "changes are"} kept.
            </Note>
          )}
          {p.saved && (
            <Note tone="success" role="status">
              <strong>Saved.</strong> New and changed cards follow these rules from now on.
            </Note>
          )}
          {isOwner && p.firstProblem && p.changes > 0 && <Note tone="neutral">{p.firstProblem}</Note>}

          {isOwner && p.rules.length > 0 && (
            <div className="flex flex-row flex-wrap items-center gap-2">
              <Button type="button" register="ui" variant="outline" className="min-h-11" disabled={p.full} onClick={() => setEditing(p.add())}>
                Add rule
              </Button>
              {p.full && <Text className="text-sm text-[color:var(--jd-muted)]">20 of 20. Delete or merge a rule to add another.</Text>}
              <span className="ml-auto flex flex-row items-center gap-2">
                {p.changes > 0 && <Text className="text-sm text-[color:var(--jd-muted)]">{`${p.changes} ${p.changes === 1 ? "change" : "changes"}`}</Text>}
                <Button type="button" register="ui" variant="ghost" className="min-h-11" disabled={p.changes === 0 || p.saving} onClick={p.discard}>
                  Discard
                </Button>
                <Button type="button" register="ui" className="min-h-11" disabled={p.changes === 0 || p.saving || p.firstProblem !== null} onClick={() => void p.save()}>
                  {p.saving ? "Saving…" : "Save rules"}
                </Button>
              </span>
            </div>
          )}
        </ConfigSection>
      )}
      {edited && (
        <PrecedenceRuleDialog
          projectId={projectId}
          index={editedAt + 1}
          rule={edited.rule}
          onClose={() => {
            if (edited.rule.id === null && ruleProblem(edited.rule) !== null) p.remove(edited.key);
            setEditing(null);
          }}
          onDone={(rule) => {
            p.replace(edited.key, rule);
            setEditing(null);
          }}
          onDelete={() => {
            p.remove(edited.key);
            setEditing(null);
          }}
        />
      )}
    </ConfigPage>
  );
}
