import { SectionHead, Text } from "@javadaba/ui";

import { AGENTS_DATA, longDate } from "@/lib/agents/agents-data";

/** Javadaba's own board as the worked example: four weeks of figures, computed from the board and dated. */
export function AgentsExample() {
  const { board, generatedOn } = AGENTS_DATA;
  const figures = [
    { value: String(board.delivered), label: "Cards delivered", detail: `${board.deliveredPerWeek} a week on average` },
    { value: String(board.deliveredByAgents), label: "Recorded under agent accounts", detail: `${board.deliveredByPeople} under person accounts` },
    { value: `${board.passedFirstTimePercent}%`, label: "Passed review on the first try", detail: `${board.passedFirstTime} of ${board.reviewed} reviewed cards` },
    { value: String(board.sentBackBeforePassing), label: "Sent back before passing", detail: `after ${board.reworkCap} in a row, a card goes back to refine` },
  ];
  return (
    <section id="example" aria-label="Worked example" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <SectionHead kicker="04 · Example" title="Javadaba's own board, worked by AI agents" />
      <div className="mt-6 flex max-w-prose flex-col gap-3">
        <Text type="body-l" tone="muted" className="text-pretty">
          Javadaba builds its products on an Officium board that AI agents work through the same MCP server. These are
          the board&apos;s figures for the {board.weeks} weeks from {longDate(board.from)} to {longDate(board.to)}, read
          with <code>metrics.get</code>. No card text is published, only counts.
        </Text>
        <Text size="sm" tone="muted">Snapshot taken {longDate(generatedOn)}.</Text>
      </div>
      <ul className="m-0 mt-8 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
        {figures.map((figure) => (
          <li key={figure.label} className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-jd-bento-m)] bg-[color:var(--jd-card)] p-5">
            <span className="font-[family-name:var(--font-jd-display)] text-5xl font-bold leading-none tracking-tight">{figure.value}</span>
            <Text type="ui" weight="semibold" className="mt-3">{figure.label}</Text>
            <Text size="sm" tone="muted">{figure.detail}</Text>
          </li>
        ))}
      </ul>
    </section>
  );
}
