"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldError,
  Input,
  Label,
  Select,
  Switch,
  Text,
} from "@javadaba/ui";

import { ConditionsEditor } from "./ConditionsEditor";
import { PRIORITY_CONFIG } from "../../../lib/backlog/status-config";
import { useReturnFocus } from "../../../lib/backlog/use-return-focus";
import type { Priority } from "../../../lib/backlog/types";
import { previewPrecedence, type PrecedencePreview, type PrecedenceRule } from "../../../lib/configuration/precedence";
import {
  conditionsOf,
  ruleProblem,
  withConditions,
  type Condition,
} from "../../../lib/configuration/precedence-model";

const NO_PRIORITY = "none";

/**
 * Editing one rule (Cfg-Rules "Editing a rule"): a name and the reason cards will show, the conditions that combine with
 * "and" (one per facet, from the project's own categories and signals), what the rule does, and how many open cards it
 * would catch right now. Done keeps the rule in the draft; the list is saved from the page.
 */
export function PrecedenceRuleDialog({
  projectId,
  index,
  rule,
  onDone,
  onDelete,
  onClose,
}: {
  projectId: string;
  index: number;
  rule: PrecedenceRule;
  onDone: (rule: PrecedenceRule) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const returnFocus = useReturnFocus();
  const [draft, setDraft] = useState(rule);
  const [conditions, setConditions] = useState<Condition[]>(() => {
    const named = conditionsOf(rule);
    return named.length > 0 ? named : [{ facet: "category", value: "" }];
  });
  const [preview, setPreview] = useState<PrecedencePreview | null>(null);
  const built = withConditions(draft, conditions);
  const problem = ruleProblem(built);

  useEffect(() => {
    if (conditionsOf(built).length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      previewPrecedence(projectId, built).then(
        (value) => !cancelled && setPreview(value),
        () => !cancelled && setPreview(null),
      );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // The rule is rebuilt each render: its JSON is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, JSON.stringify(built)]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{`Rule ${index}`}</DialogTitle>
          <DialogDescription>Conditions combine with &quot;and&quot;. Each list offers only the project&apos;s categories and signals.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input id="rule-name" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-reason">Why (shown on the cards it raises)</Label>
            <Input id="rule-reason" value={draft.reason} maxLength={500} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
          </div>
          <ConditionsEditor conditions={conditions} onChange={setConditions} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">
              <Text>Then</Text>
            </legend>
            
            <Select
              aria-label="Minimum priority"
              value={draft.defaults.priority ?? NO_PRIORITY}
              onChange={(value) => setDraft({ ...draft, defaults: { ...draft.defaults, priority: value === NO_PRIORITY ? null : (value as Priority) } })}
              options={[
                { value: NO_PRIORITY, label: "No minimum" },
                ...(Object.keys(PRIORITY_CONFIG) as Priority[]).map((id) => ({ value: id, label: `At least ${PRIORITY_CONFIG[id].label}` })),
              ]}
              className="min-h-11 max-w-60"
            />
            <div className="flex flex-row items-center justify-between gap-3 pt-1">
              <Text id="rule-join" className="text-sm font-medium">
                Join the current sprint
              </Text>
              <Switch
                checked={draft.defaults.sprint === "join"}
                aria-labelledby="rule-join"
                onCheckedChange={(on) => setDraft({ ...draft, defaults: { ...draft.defaults, sprint: on ? "join" : "none" } })}
              />
            </div>
          </fieldset>
          {preview && (
            <Text as="p" role="status" className="text-sm text-[color:var(--jd-muted)]">
              {`Matches ${preview.openMatches} open ${preview.openMatches === 1 ? "card" : "cards"} now.${preview.sampleKeys.length > 0 ? ` ${preview.sampleKeys.join(", ")}.` : ""}`}
            </Text>
          )}
          {preview?.refusals.map((r) => (
            <FieldError key={r.code + r.field}>{r.message}</FieldError>
          ))}
          {problem && <Text className="text-xs text-[color:var(--jd-muted)]">{problem}</Text>}
        </div>
        <DialogFooter>
          <Button type="button" register="ui" variant="destructive" className="mr-auto min-h-11" onClick={onDelete}>
            Delete rule
          </Button>
          <Button type="button" register="ui" variant="ghost" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" register="ui" className="min-h-11" disabled={problem !== null} onClick={() => onDone(built)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
