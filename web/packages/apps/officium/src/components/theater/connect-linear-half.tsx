"use client";

import { CLIENTS } from "./connect-script";

/**
 * The before half: one Linear sign-in per client. Each row carries its state in words as well as
 * colour, so the first sign-in and the repeats read the same to a reader who cannot see the chip's colour.
 * The layer is clipped at the handle, so the content sits in the left half of the frame, where it is
 * on screen at rest; a chip wraps under its name when the half is narrow.
 */
export function ConnectLinearHalf({ clients }: { clients: number }) {
  const shown = CLIENTS.slice(0, clients);
  const count = shown.length;
  return (
    <div className="flex h-full bg-[color:var(--jd-page)] text-[color:var(--jd-ink)]">
      <div className="flex h-full w-1/2 flex-col justify-center gap-4 p-6">
        <h2 className="text-lg font-semibold">
          One more sign-in for every client you work for?
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          {shown.map((name, index) => (
            <li
              key={name}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              <span>{name}</span>
              <span className="rounded-full border border-[color:var(--jd-ink)]/[0.15] px-3 py-1 text-xs">
                {index === 0 ? "Signed in" : "Sign in again"}
              </span>
            </li>
          ))}
        </ul>
        {count > 0 && (
          <p className="text-sm font-medium">
            {count} {count === 1 ? "client" : "clients"}, {count}{" "}
            {count === 1 ? "sign-in" : "sign-ins"}
          </p>
        )}
      </div>
    </div>
  );
}
