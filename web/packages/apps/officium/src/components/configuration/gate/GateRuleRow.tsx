import type { ReactNode } from "react";
import { Switch, Text } from "@javadaba/ui";

/** One of the gate rules: its number and name, what it does, its switch, and the value it holds. */
export function GateRuleRow({
  n,
  title,
  help,
  on,
  disabled,
  onChange,
  children,
}: {
  n: number;
  title: string;
  help: string;
  on: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-[color:var(--jd-card)] p-4">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Text className="text-sm font-semibold" id={`gate-rule-${n}`}>{`${n} · ${title}`}</Text>
          <Text className="text-sm text-[color:var(--jd-muted)]">{help}</Text>
        </div>
        <Switch checked={on} disabled={disabled} onCheckedChange={onChange} aria-labelledby={`gate-rule-${n}`} />
      </div>
      {children}
    </li>
  );
}
