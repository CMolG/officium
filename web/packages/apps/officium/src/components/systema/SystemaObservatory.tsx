"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, ListRow, Text } from "@javadaba/ui";

import { getObservatory, OBSERVATORY_SCORES } from "../../lib/systema/observatory";

/**
 * The Observatory tab (Doc-Sweeps, Doc-Scores, Doc-Lenses): control branches swept against a baseline. The server keeps
 * no sweeps yet (`lib/systema/observatory.ts` lists what it needs), so the tab says so, names the five scores it will
 * show, and keeps Run sweep off with the reason beside it, instead of drawing numbers nobody measured.
 */
export function SystemaObservatory({ projectId }: { projectId: string }) {
  const [answer, setAnswer] = useState<"loading" | "unavailable">("loading");
  useEffect(() => {
    let cancelled = false;
    void getObservatory(projectId).then(() => !cancelled && setAnswer("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6" data-testid="systema-observatory">
      <EmptyState
        title={answer === "loading" ? "Reading the observatory" : "No sweeps yet"}
        action={
          <Button type="button" register="ui" disabled aria-describedby="observatory-reason" className="min-h-11">
            Run sweep
          </Button>
        }
      >
        <span id="observatory-reason">
          The observatory sweeps a control branch against a baseline and scores it. The server does not run sweeps yet, so there is nothing to
          show or to run.
        </span>
      </EmptyState>
      <section aria-labelledby="observatory-scores" className="flex flex-col gap-2">
        <Text as="h2" id="observatory-scores" className="text-base font-bold">
          Five scores, from 1 to 100
        </Text>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {OBSERVATORY_SCORES.map((score) => (
            <li key={score.id}>
              <ListRow className="flex-col items-start gap-0.5">
                <Text className="text-sm font-semibold">{score.name}</Text>
                <Text className="text-sm text-[color:var(--jd-muted)]">{score.about}</Text>
              </ListRow>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
