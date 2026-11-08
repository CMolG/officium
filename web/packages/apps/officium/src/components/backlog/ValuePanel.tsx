"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { todayISO } from "../../lib/backlog/format";
import { formatMoney, formatRatio, shiftMonth } from "../../lib/backlog/value-format";
import type { Subscription, ValueView } from "../../lib/backlog/value-types";
import { ValueBreakdownTable } from "./ValueBreakdownTable";
import { ValueFacts } from "./ValueFacts";
import { ValueSubscriptionForm } from "./ValueSubscriptionForm";
import { ValueTile } from "./ValueTile";

/** The value report (card://JAVA-1047): what a month's agent work delivered and what its usage was worth at API
 *  prices, per subscription dollar. A figure that needs the fee says so until the person sets their price. */
export function ValuePanel({ projectId }: { projectId: string }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const thisMonth = todayISO().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [view, setView] = useState<ValueView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    let cancelled = false;
    void repository.getValue(projectId, month).then(
      (next) => {
        if (cancelled) return;
        setView(next);
        setError(null);
      },
      (err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't reach the Officium API.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, month, reloads, repository]);

  useEffect(() => {
    let cancelled = false;
    void repository.getSubscription().then((next) => {
      if (!cancelled) setSubscription(next);
    }, () => undefined);
    return () => {
      cancelled = true;
    };
  }, [repository]);

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
        <p className="text-sm font-semibold">Couldn't load the value report</p>
        <p className="text-sm text-[color:var(--jd-muted)]">{error}</p>
        <Button register="ui" className="min-h-11" variant="outline" onClick={() => setReloads((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }
  if (!view) return <p className="text-sm text-[color:var(--jd-muted)]">Loading the value report…</p>;

  const { current, previous } = view;
  const empty = current.delivered === 0 && current.agentHours === 0 && current.apiValue === 0;
  // A null ratio means one of two things, and each says its own: no price yet, or another account reported usage
  // (the ratios then leave for everyone but that account, whatever their price).
  const priceSet = subscription?.monthlyUsd != null;
  const ratioMissing = priceSet
    ? "Shows only when no other account reported usage this month. Ask the other accounts to stop reporting to this project."
    : "Set your subscription price below";
  const costMissing = priceSet && current.delivered === 0 ? "Shows once a card is delivered" : ratioMissing;

  return (
    <section aria-label="Value" className="flex flex-col gap-6">
      <div className="flex flex-row flex-wrap items-center gap-3">
        <Button register="ui" className="min-h-11" variant="outline" aria-label="Previous month"
          onClick={() => setMonth(shiftMonth(month, -1))}>
          Previous
        </Button>
        <p className="min-w-28 text-center text-sm font-semibold">{month} (UTC)</p>
        <Button register="ui" className="min-h-11" variant="outline" aria-label="Next month"
          disabled={month >= thisMonth} onClick={() => setMonth(shiftMonth(month, 1))}>
          Next
        </Button>
      </div>

      {empty ? (
        <p className="text-sm text-[color:var(--jd-muted)]">Nothing ran in {month} yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ValueTile
              label="Cost per delivered card"
              value={current.costPerDeliveredCard === null ? null : formatMoney.format(current.costPerDeliveredCard)}
              before={previous.costPerDeliveredCard === null ? null : formatMoney.format(previous.costPerDeliveredCard)}
              missing={costMissing}
            />
            <ValueTile
              label="Value per subscription dollar"
              value={current.valuePerDollar === null ? null : formatRatio(current.valuePerDollar)}
              before={previous.valuePerDollar === null ? null : formatRatio(previous.valuePerDollar)}
              missing={ratioMissing}
            />
            <ValueTile
              label="API-equivalent value"
              value={formatMoney.format(current.apiValue)}
              before={formatMoney.format(previous.apiValue)}
            />
          </div>
          <ValueFacts current={current} />
          <div className="flex flex-col gap-6">
            <ValueBreakdownTable title="By category" lines={view.breakdown.byCategory} />
            <ValueBreakdownTable title="By phase" lines={view.breakdown.byPhase} />
            <ValueBreakdownTable title="By model" lines={view.breakdown.byModel} />
          </div>
        </>
      )}

      <p className="text-sm text-[color:var(--jd-muted)]">
        The model and effort each role runs with are set on the{" "}
        <Link href="/app/configuration/roles" className="inline-flex min-h-11 flex-row items-center underline">
          roles page
        </Link>
        ; the figures above follow them.
      </p>

      <ValueSubscriptionForm
        subscription={subscription}
        onSaved={(next) => {
          setSubscription(next);
          setReloads((n) => n + 1);
        }}
      />
    </section>
  );
}
