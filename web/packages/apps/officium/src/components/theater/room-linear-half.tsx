"use client";

import { LINEAR, PEOPLE } from "./room-script";

/**
 * The before half: what the same four people cost on Linear, from the one `LINEAR` source. The
 * free plan is on screen too, muted, because the proof says "paid plans" and a half that left out
 * the free plan the same page shows would be a half-truth.
 */
export function RoomLinearHalf({ seats }: { seats: number }) {
  const shown = PEOPLE.slice(0, seats);
  return (
    <div className="flex h-full flex-col justify-center gap-4 bg-[color:var(--jd-page)] p-6 text-[color:var(--jd-ink)]">
      <h2 className="text-lg font-semibold">Paying for a seat for everyone who opens the board?</h2>
      <ul className="flex flex-col gap-1 text-sm">
        <li className="text-[color:var(--jd-muted)]">Free: $0, unlimited members, 250 issues</li>
        <li>Basic: ${LINEAR.basic} per person per month, billed yearly</li>
        <li>Business: ${LINEAR.business} per person per month, billed yearly</li>
      </ul>
      <ul className="flex flex-wrap gap-2">
        {shown.map((name) => (
          <li key={name} className="rounded-full border border-[color:var(--jd-ink)]/[0.15] px-3 py-1 text-sm">
            {name} · ${LINEAR.basic}
          </li>
        ))}
      </ul>
      {shown.length > 0 && (
        <p className="text-sm font-medium">
          {shown.length} people x ${LINEAR.basic} = ${shown.length * LINEAR.basic} a month, billed yearly
        </p>
      )}
    </div>
  );
}
