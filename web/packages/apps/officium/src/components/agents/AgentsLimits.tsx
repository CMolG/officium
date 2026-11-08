import { SectionHead } from "@javadaba/ui";

import { AGENT_LIMITS } from "@/lib/agents/agents-copy";

/** What the figures above do not show. A number with no stated limits is read as stronger than it is. */
export function AgentsLimits() {
  return (
    <section id="limits" aria-label="What the figures do not show" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <SectionHead kicker="05 · Limits" title="What the figures from Javadaba's board do not show" />
      <ul className="m-0 mt-6 flex max-w-prose list-disc flex-col gap-3 pl-5 text-pretty">
        {AGENT_LIMITS.map((limit) => (
          <li key={limit}>{limit}</li>
        ))}
      </ul>
    </section>
  );
}
