import { SectionHead, Text } from "@javadaba/ui";

import { AGENT_ACTIONS } from "@/lib/agents/agents-copy";

/** What an AI agent does in an Officium backlog, each action with the operations that do it. */
export function AgentsActions() {
  return (
    <section id="actions" aria-label="Agent actions" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <SectionHead kicker="01 · Actions" title="What an AI agent can do in an Officium backlog" />
      <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
        {AGENT_ACTIONS.map((action) => (
          <li key={action.title} className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-jd-bento-m)] bg-[color:var(--jd-card)] p-6">
            <Text type="ui" weight="semibold">{action.title}</Text>
            <Text tone="muted" className="text-pretty">{action.body}</Text>
            <p className="m-0 flex flex-row flex-wrap gap-2">
              {action.ops.map((op) => (
                <code key={op} className="rounded-[var(--radius-jd-md)] bg-[color:var(--jd-page)] px-2 py-1 text-xs [overflow-wrap:anywhere]">
                  {op}
                </code>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
