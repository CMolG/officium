import Link from "next/link";
import { Button, Text } from "@javadaba/ui";

import { AGENTS_LEDE } from "@/lib/agents/agents-copy";
import { AGENTS_DATA, longDate } from "@/lib/agents/agents-data";

/** The line, what the page delivers, and the one action: connect an agent. */
export function AgentsHero() {
  const { catalog, generatedOn } = AGENTS_DATA;
  return (
    <section id="top" aria-label="Officium for AI agents" className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-14 sm:px-6 md:py-20">
      <Text type="kicker">Officium · For AI agents</Text>
      <h1 className="m-0 max-w-4xl text-balance font-[family-name:var(--font-jd-display)] text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
        A backlog an AI agent can read and write over MCP
      </h1>
      <Text type="body-l" tone="muted" className="max-w-prose text-pretty">{AGENTS_LEDE}</Text>
      <div className="flex flex-row flex-wrap items-center gap-3">
        <Button asChild register="cta" size="md">
          <a href="#connect">Connect an agent</a>
        </Button>
        <Button asChild register="cta" variant="outline" size="md">
          <Link href="/">About Officium</Link>
        </Button>
      </div>
      <Text size="sm" tone="muted">
        On this page: the {catalog.total} operations an agent can run, the command that connects one, and the figures
        from Javadaba&apos;s own board, as of {longDate(generatedOn)}.
      </Text>
    </section>
  );
}
