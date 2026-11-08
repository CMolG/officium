"use client";

import { UsageMeter } from "../projects/UsageMeter";
import { PEOPLE } from "./room-script";
import type { RoomView } from "./use-room-script";

/**
 * The after half: the same four people with no price on them, the card counter, and the real room
 * meter drawn wide. The meter is the one the projects home header shows, not a copy of it.
 */
export function RoomOfficiumHalf({ seats, cards, usage }: Pick<RoomView, "seats" | "cards" | "usage">) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 bg-[color:var(--jd-page)] py-6 pr-6 pl-16 text-[color:var(--jd-ink)]">
      <h2 className="text-lg font-semibold">Room, not seats</h2>
      <ul className="flex flex-wrap gap-2">
        {PEOPLE.slice(0, seats).map((name) => (
          <li key={name} className="rounded-full border border-[color:var(--jd-ink)]/[0.15] px-3 py-1 text-sm">
            {name}
          </li>
        ))}
      </ul>
      <p className="text-sm font-medium">{cards.toLocaleString("en-US")} cards</p>
      <UsageMeter usage={usage} barClassName="h-2 w-full" />
    </div>
  );
}
