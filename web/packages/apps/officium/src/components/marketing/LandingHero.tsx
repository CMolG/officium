import { Button, Text } from "@javadaba/ui";

import { McpSnippet } from "@/components/marketing/McpSnippet";
import { OpenOfficiumCta } from "@/components/shell/OpenOfficiumCta";
import { BoardTheater } from "@/components/theater/BoardTheater";

import { LandingSource } from "./LandingSource";
import { BOARD_PROOF } from "./landing-copy";
import { COMPANY_FROM_PEOPLE } from "./landing-pricing";

/**
 * Section 1 of `/officium`: the line, the two actions, the allowance and the MCP command on the
 * left, the board walkthrough on the right (Off-Page, "Large screen · signed out"). The MCP
 * snippet stays above the fold (JDB-228 directive). The Theater's proof sits under it as a source
 * line, never in a tooltip.
 */
export function LandingHero() {
  return (
    <section
      id="board"
      data-landing-section={1}
      aria-label="Officium"
      className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-center md:py-20"
    >
      <div className="flex min-w-0 flex-col gap-7">
        <Text type="kicker">Officium · Productivity</Text>
        <h1 className="m-0 text-balance font-[family-name:var(--font-jd-display)] text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          A backlog your team and your AI agents work on{" "}
          <em className="font-[family-name:var(--font-jd-italic)] not-italic underline decoration-[color:var(--jd-accent-mark)] decoration-4 underline-offset-8">
            together
          </em>
          .
        </h1>

        <div className="flex flex-row flex-wrap items-center gap-3">
          <OpenOfficiumCta placement="hero" />
          <Button asChild register="cta" variant="outline" size="md">
            {/* Plain `<a>`: the guide lives on the landing, another zone. */}
            <a href="/developers/docs/officium-mcp">MCP guide</a>
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <Text size="sm" tone="muted">
            Free: 15 MB of card and documentation text. Files are not counted.
          </Text>
          <Text size="sm" tone="muted">
            From {COMPANY_FROM_PEOPLE} people on a project it counts as a company, with its own plans.
          </Text>
        </div>

        {/* Above the fold for developers, per JDB-228's directive. */}
        <div className="flex flex-col gap-3">
          <Text type="ui" weight="semibold">
            Connect your coding agent
          </Text>
          <McpSnippet />
        </div>
      </div>

      {/* Hero visual: the real board playing itself in the Theater (`BoardTheater`). */}
      <div className="flex min-w-0 flex-col gap-3">
        <BoardTheater />
        <LandingSource {...BOARD_PROOF} />
      </div>
    </section>
  );
}
