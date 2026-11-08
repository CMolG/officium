"use client";

import { Button, Select, Text } from "@javadaba/ui";

import { FACET_LABEL, FACET_ORDER, type Condition, type ConditionFacet } from "../../../lib/configuration/precedence-model";
import { ConditionValueField } from "./ConditionValueField";

/** The "If a card has" block of a rule: one condition per facet, each a facet and its value, combined with "and". */
export function ConditionsEditor({ conditions, onChange }: { conditions: Condition[]; onChange: (next: Condition[]) => void }) {
  const unused = FACET_ORDER.filter((facet) => !conditions.some((c) => c.facet === facet));
  const setFacet = (at: number, facet: ConditionFacet) => onChange(conditions.map((c, i) => (i === at ? { facet, value: "" } : c)));
  const setValue = (at: number, value: string) => onChange(conditions.map((c, i) => (i === at ? { ...c, value } : c)));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">
        <Text>If a card has</Text>
      </legend>
      {conditions.map((condition, at) => (
        <div key={condition.facet} className="flex flex-row items-center gap-2">
          <Select
            aria-label={`Condition ${at + 1}`}
            value={condition.facet}
            onChange={(facet) => setFacet(at, facet as ConditionFacet)}
            options={[condition.facet, ...unused].map((facet) => ({ value: facet, label: FACET_LABEL[facet] }))}
            className="min-h-11 w-32 shrink-0"
          />
          <ConditionValueField condition={condition} onChange={(value) => setValue(at, value)} label={`${FACET_LABEL[condition.facet]} value`} />
          <Button
            type="button"
            register="ui"
            variant="ghost"
            size="icon"
            aria-label="Remove this condition"
            disabled={conditions.length === 1}
            onClick={() => onChange(conditions.filter((_, i) => i !== at))}
          >
            <span aria-hidden="true">×</span>
          </Button>
        </div>
      ))}
      {unused.length > 0 && (
        <div>
          <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={() => onChange([...conditions, { facet: unused[0]!, value: "" }])}>
            Add a condition
          </Button>
        </div>
      )}
    </fieldset>
  );
}
