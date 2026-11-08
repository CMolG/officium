import { Panel, Text } from "@javadaba/ui";

import { STATUS_CONFIG, STATUS_ORDER } from "@/lib/backlog/status-config";
import { StatusShape } from "@/components/backlog/StatusShape";

import { PATH, PROOFS } from "./landing-band-copy";

/**
 * The closing band of the Rule of Seven page (JAVA-1639), as Off-Page draws it: three soft panels,
 * "One path for every write", "Four things you can check" and "The shape is the state". It is a
 * `div`, not a section, so the page keeps exactly seven.
 */
export function LandingBand() {
  // The board's own order, left to right: the first state has three sides, the last eight.
  const states = STATUS_ORDER.map((id) => STATUS_CONFIG[id]);

  return (
    <div aria-label="Under the hood" role="region" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-24">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel material="plain" radius="bento" className="flex flex-col gap-4 p-6">
          <Text type="kicker">One path for every write</Text>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {PATH.map((node, i) => (
              <li key={node.title} className="flex flex-row items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-[30px] shrink-0 flex-row items-center justify-center rounded-full bg-[color:var(--jd-ink)] font-[family-name:var(--font-jd-display)] text-[15px] font-extrabold text-[color:var(--jd-page)]"
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <Text type="ui" weight="semibold">
                    {node.title}
                  </Text>
                  <Text size="sm" tone="muted" className="text-pretty">
                    {node.body}
                  </Text>
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel material="plain" radius="bento" className="flex flex-col gap-4 p-6">
          <Text type="kicker">Four things you can check</Text>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {PROOFS.map((proof) => (
              <li key={proof.title} className="flex flex-col gap-1">
                <h3 className="m-0 text-base font-semibold text-[color:var(--jd-ink)]">{proof.title}</h3>
                <Text size="sm" tone="muted" className="text-pretty">
                  {proof.body}
                </Text>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel material="plain" radius="bento" className="flex flex-col gap-4 p-6">
          <Text type="kicker">The shape is the state</Text>
          <Text size="sm" tone="muted" className="text-pretty">
            Six states on the board, each with its own number of sides, so a card reads without color. The same
            six an agent gets back from <code className="font-[family-name:var(--font-jd-kicker)] text-xs">discover</code>.
          </Text>
          <ol aria-label="The six states" className="m-0 grid list-none grid-cols-2 gap-3 p-0">
            {states.map((state) => (
              <li key={state.id} className="flex flex-row items-center gap-2.5">
                <StatusShape status={state.id} className="size-7 shrink-0" title={`${state.label}: ${state.sides} sides`} />
                <span className="flex min-w-0 flex-col">
                  <Text type="ui" weight="semibold">
                    {state.label}
                  </Text>
                  <Text size="xs" tone="muted">
                    {state.sides} sides
                  </Text>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
