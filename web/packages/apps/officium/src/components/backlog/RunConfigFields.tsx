"use client";

import { Select } from "@javadaba/ui";

import { EFFORTS, MODEL_SUGGESTIONS, modelLabel } from "../../lib/backlog/role-matrix";
import type { Effort, RunConfig } from "../../lib/backlog/types";

/** What each effort is for, in the words of a person choosing it. */
export const EFFORT_HINT: Record<Effort, string> = {
  low: "Fastest and cheapest, for a mechanical step.",
  medium: "Everyday work: building to a plan.",
  high: "Careful reasoning: checking someone's work.",
  xhigh: "Deep reasoning: planning a card.",
  max: "The most reasoning the model gives, and the slowest.",
};

/**
 * The model and effort an agent works a card with (JAVA-915): the model from the ids Officium knows
 * (one saved through the API that it doesn't know stays offered), and the effort `claude --effort`
 * takes. `label` names the pair for a screen reader: "Bug · Review model".
 */
export function RunConfigFields({
  value,
  onChange,
  label,
  disabled,
}: {
  value: RunConfig;
  onChange: (run: RunConfig) => void;
  label: string;
  disabled?: boolean;
}) {
  const models = MODEL_SUGGESTIONS.includes(value.model) ? MODEL_SUGGESTIONS : [value.model, ...MODEL_SUGGESTIONS];
  return (
    <div className="flex flex-row flex-wrap gap-2">
      <Select
        aria-label={`${label} model`}
        value={value.model}
        disabled={disabled}
        onChange={(model) => onChange({ ...value, model })}
        options={models.map((m) => ({ value: m, label: modelLabel(m), description: m }))}
        className="min-h-11 min-w-0 flex-1 justify-between"
      />
      <Select
        aria-label={`${label} effort`}
        value={value.effort}
        disabled={disabled}
        onChange={(effort) => onChange({ ...value, effort: effort as Effort })}
        options={EFFORTS.map((e) => ({ value: e, label: e, description: EFFORT_HINT[e] }))}
        className="min-h-11 min-w-0 flex-1 justify-between"
      />
    </div>
  );
}
