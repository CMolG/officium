"use client";

import { DIMENSION_LABEL, QUALITY_RULES, type QualityDimension } from "../../lib/backlog/quality-lineage";
import { Checkbox, Text } from "@javadaba/ui";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

/** A rule id as people read it: `clean_code:high-complexity` → "High complexity". */
const ruleLabel = (rule: string) => rule.charAt(0).toUpperCase() + rule.slice(1).replaceAll("-", " ");

/**
 * The engineering rules a send-back says the work broke (card://JAVA-1526), grouped by dimension, closed by
 * default: they are optional, and a reviewer who needs them opens the list. Nothing is preselected.
 */
export function RuleViolationsPicker({ value, onChange }: Props) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <details className="flex flex-col gap-2 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        <Text>Engineering rules it broke (optional){value.length > 0 ? ` · ${value.length}` : ""}</Text>
      </summary>
      {(Object.entries(QUALITY_RULES) as [Exclude<QualityDimension, "functional">, string[]][]).map(([dimension, rules]) => (
        <fieldset key={dimension} className="flex flex-col gap-1">
          <legend className="text-xs font-semibold text-[color:var(--jd-muted)]">{DIMENSION_LABEL[dimension]}</legend>
          {rules.map((rule) => {
            const id = `${dimension}:${rule}`;
            return (
              <div key={id} data-rule={id} className="flex min-h-11 flex-row items-center">
                <Checkbox name="rule-violation" value={id} checked={value.includes(id)} onChange={() => toggle(id)}>
                  {ruleLabel(rule)}
                </Checkbox>
              </div>
            );
          })}
        </fieldset>
      ))}
    </details>
  );
}
