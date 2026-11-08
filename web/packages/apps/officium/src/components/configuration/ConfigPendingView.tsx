"use client";

import { Button, EmptyState, Text } from "@javadaba/ui";

import { PENDING_COPY, type PendingSection } from "../../lib/configuration/pending";
import { useCopy } from "../../lib/i18n/use-copy";
import { ConfigPage } from "./ConfigPage";
import { ConfigSection } from "./ConfigSection";

/**
 * A Configuration section the design draws and the server does not keep yet (Capabilities, Wake reasons, Glossary).
 * It says so in words, names what the page will do, and shows its actions off with the reason beside them, instead of
 * a list of invented rows. See `lib/configuration/pending.ts` for the endpoints each needs.
 */
export function ConfigPendingView({ section }: { section: PendingSection }) {
  const { configuration } = useCopy();
  const copy = PENDING_COPY[section];
  const reasonId = `pending-${section}`;
  return (
    <ConfigPage title={configuration.sections[section]} lede={copy.lede}>
      <ConfigSection title={configuration.sections[section]} note="Not available yet">
        <EmptyState title={copy.title}>
          <span id={reasonId}>{copy.body}</span>
        </EmptyState>
        <div className="flex flex-row flex-wrap items-center gap-2">
          {copy.actions.map((label) => (
            <Button key={label} type="button" register="ui" variant="outline" className="min-h-11" disabled aria-describedby={reasonId}>
              {label}
            </Button>
          ))}
        </div>
        <Text as="p" className="text-xs text-[color:var(--jd-faint)]">
          {`Will list: ${copy.columns.join(", ")}.`}
        </Text>
      </ConfigSection>
    </ConfigPage>
  );
}
