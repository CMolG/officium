"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import type { ReactNode } from "react";

import { Badge, Select } from "@javadaba/ui";

import type { CardDetail, Status } from "../../../lib/backlog/types";
import { ALL_STATUSES, STATUS_CONFIG } from "../../../lib/backlog/status-config";
import { epicMovableTo } from "../../../lib/backlog/epic-status";
import { landingStatus } from "../../../lib/backlog/quality-lineage";
import { useReadOnly } from "../../../lib/backlog/read-only-context";
import { StatusShape } from "../StatusShape";

/** JAVA-292's two rules, in the words the disabled controls give as their reason. */
const EPIC_NEEDS_A_CHILD = "Give it a child first";
const EPIC_FOLLOWS_CHILDREN = "Its status follows its children";

export interface CardStatusLineProps {
  detail: CardDetail;
  childlessEpic: boolean;
  followsChildren: boolean;
  epicChildren: number;
  openChildren: number;
  changeStatus: (next: Status) => Promise<void>;
  /** What sits right after the picker: the Reject action (card://JAVA-1415). */
  action?: ReactNode;
}

/** A rejected card reopens only in Refine (card://JAVA-1415), so the picker says so on every other state. */
const REJECTED_REOPENS = "A rejected card reopens in Refine";

/** The card's key, its status picker and the badges that say who has to act. */
export function CardStatusLine({ detail, childlessEpic, followsChildren, epicChildren, openChildren, changeStatus, action }: CardStatusLineProps) {
  const status = STATUS_CONFIG[detail.status];
  const rejected = detail.status === "rejected";
  const readOnly = useReadOnly();
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      {/* Grey, like the project's own label on the board (user decision, 2026-09-23): the
          key names the card, it is not the loudest thing on the screen. */}
      <span
        data-testid="card-key"
        className="flex flex-row h-8 items-center rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.06] px-2.5 font-[family-name:var(--font-jd-kicker)] text-xs font-medium uppercase tracking-widest text-[color:var(--jd-ink)]"
      >
        {detail.key}
      </span>
      {/* One 32px control: the state's tint around a trigger that reads at body size. It
          used to stack the Select's own 36px minimum inside a padded pill, with the label
          at 10px (reported 2026-09-15). */}
      <div
        className="flex flex-row h-8 items-center gap-1.5 rounded-[var(--radius-jd-pill)] border pl-2.5 pr-1"
        style={{ background: status.tone.fill, color: status.tone.ink, borderColor: status.tone.line }}
      >
        <StatusShape status={detail.status} className="size-4 shrink-0" />
        {readOnly ? (
          // A viewer is told the state, not offered a control that would fail (Off-Shell, "Viewers are told").
          <span data-testid="card-status-readonly" className="px-1 text-sm font-semibold">
            {status.label}
          </span>
        ) : (
          <Select
            aria-label="Change status"
            data-theater-target="card-status"
            value={detail.status}
            onChange={(v) => void changeStatus(v as Status)}
            // Completed is offered here, not on the board: it has no column, so this is
            // where a card is closed -- and where a completed one is reopened. Rejected is listed only
            // as a rejected card's own value: a card is rejected through its Reject action.
            // A spike never reaches Deploy: its approval is review -> done, which this list already offers.
            // Its own status stays listed, so a spike already there still shows what it is.
            options={ALL_STATUSES.filter((s) => (s !== "rejected" || rejected) && (s === detail.status || landingStatus(detail.status, s, detail.category) === s)).map((s) => {
              const reopens = rejected && s !== "refine" && s !== "rejected";
              const childless = childlessEpic && s !== "refine" && s !== detail.status;
              const derived = followsChildren && s !== detail.status && !epicMovableTo(epicChildren, openChildren, s);
              const reason = reopens ? REJECTED_REOPENS : childless ? EPIC_NEEDS_A_CHILD : derived ? EPIC_FOLLOWS_CHILDREN : undefined;
              return { value: s, label: STATUS_CONFIG[s].label, disabled: reason !== undefined, description: reason };
            })}
            menuWidth={180}
            className="h-7 min-h-0 border-0 bg-transparent py-0 pl-0 pr-2 text-sm font-semibold text-current hover:text-current"
          />
        )}
      </div>
      {action}
      {detail.executor === "human" && (
        <Badge tone="accent" fill="subtle" register="tag">
          Needs a person
        </Badge>
      )}
      {detail.blocked && (
        <Badge tone="danger" fill="subtle" register="tag">
          Blocked
        </Badge>
      )}
      {/* Closes the loop on a "needs a person" card: the person did their part here, and
          sees that the agent has not read it yet. */}
      {detail.executor === "human" && detail.humanEditPending && (
        <Badge tone="neutral" fill="subtle" register="tag">
          Waiting for an agent to review
        </Badge>
      )}
    </div>
  );
}
