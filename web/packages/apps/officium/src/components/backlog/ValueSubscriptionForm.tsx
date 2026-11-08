"use client";

import { useMemo, useState } from "react";

import { Button, Input } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { formatMoney } from "../../lib/backlog/value-format";
import type { Subscription } from "../../lib/backlog/value-types";

/** The caller's own subscription price (card://JAVA-1047). Only they see it; saving it reloads the report. */
export function ValueSubscriptionForm({
  subscription,
  onSaved,
}: {
  subscription: Subscription | null;
  onSaved: (next: Subscription) => void;
}) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const value = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(value) || value < 0) {
      setError("Give a dollar amount, zero or more.");
      return;
    }
    try {
      onSaved(await repository.setSubscription(value));
      setDraft("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the price.");
    }
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label htmlFor="value-subscription" className="text-sm font-semibold">
        <span>Your subscription, USD a month</span>
      </label>
      <p className="text-xs text-[color:var(--jd-muted)]">
        {subscription?.monthlyUsd == null
          ? "Not set. Only you see this price."
          : `Set to ${formatMoney.format(subscription.monthlyUsd)}. Only you see this price.`}
      </p>
      <div className="flex flex-row flex-wrap gap-2">
        <Input
          id="value-subscription"
          inputMode="decimal"
          value={draft}
          placeholder="20"
          className="min-h-11"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button register="ui" className="min-h-11" type="submit">
          Save
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[color:var(--jd-danger)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
