import { Input, Select } from "@javadaba/ui";

import { CATEGORY_CONFIG, CATEGORY_ORDER } from "../../../lib/backlog/category-config";
import { SIGNAL_LABEL, SIGNAL_ORDER } from "../../../lib/backlog/role-config";
import type { Condition } from "../../../lib/configuration/precedence-model";

/** The value of one condition: a category or a signal from the project own lists, a tag or an epic typed in. */
export function ConditionValueField({ condition, onChange, label }: { condition: Condition; onChange: (value: string) => void; label: string }) {
  if (condition.facet === "category") {
    return (
      <Select
        aria-label={label}
        value={condition.value}
        onChange={onChange}
        placeholder="Choose a category"
        options={CATEGORY_ORDER.map((id) => ({ value: id, label: CATEGORY_CONFIG[id].label }))}
        className="min-h-11 min-w-0 flex-1"
      />
    );
  }
  if (condition.facet === "signal") {
    return (
      <Select
        aria-label={label}
        value={condition.value}
        onChange={onChange}
        placeholder="Choose a signal"
        options={SIGNAL_ORDER.map((id) => ({ value: id, label: SIGNAL_LABEL[id] }))}
        className="min-h-11 min-w-0 flex-1"
      />
    );
  }
  return <Input aria-label={label} value={condition.value} onChange={(e) => onChange(e.target.value)} placeholder={condition.facet === "tag" ? "A tag" : "An epic's key or title"} className="min-w-0 flex-1" />;
}
