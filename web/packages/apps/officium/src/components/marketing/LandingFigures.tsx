import { Text } from "@javadaba/ui";

/** The figures: what the product is, in numbers that are true today (Off-Page, the strip under the hero). */
const FIGURES = [
  { value: "2", label: "MCP tools", detail: "discover and query" },
  { value: "1", label: "Backlog per project", detail: "People and agents on the same cards" },
  { value: "6", label: "States", detail: "Each with its own shape" },
  { value: "0", label: "API keys to manage", detail: "Your Javadaba account signs agents in" },
] as const;

export function LandingFigures() {
  return (
    <div aria-label="Officium in figures" role="region" className="mx-auto max-w-7xl px-4 sm:px-6">
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
        {FIGURES.map((figure) => (
          <li key={figure.label} className="flex flex-col gap-1 rounded-[var(--radius-jd-bento-m)] bg-[color:var(--jd-card)] p-5">
            <span className="font-[family-name:var(--font-jd-display)] text-5xl font-bold leading-none tracking-tight">
              {figure.value}
            </span>
            <Text type="ui" weight="semibold" className="mt-3">
              {figure.label}
            </Text>
            <Text size="sm" tone="muted">
              {figure.detail}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
