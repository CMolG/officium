"use client";

import { OFFICIUM_MCP_ENDPOINT } from "../../lib/mcp-clients";

/**
 * The after half: one Javadaba sign-in, the agent's address, and every project that sign-in
 * reaches. The sign-in is drawn, not performed: nothing on this half signs anyone in.
 */
export function ConnectOfficiumHalf({ signedIn, projects }: { signedIn: boolean; projects: readonly string[] }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 bg-[color:var(--jd-page)] p-6 pl-14 text-[color:var(--jd-ink)]">
      <h2 className="text-lg font-semibold">One sign-in, every project</h2>
      <p className="text-sm">
        Sign in once with your Javadaba account. Your agent sees all your projects through that one connection.
      </p>
      {signedIn && (
        <p className="w-fit rounded-full border border-[color:var(--jd-ink)]/[0.15] px-3 py-1 text-xs">
          Signed in with your Javadaba account
        </p>
      )}
      <p className="break-all font-mono text-xs text-[color:var(--jd-muted)]">{OFFICIUM_MCP_ENDPOINT}</p>
      <ul className="flex flex-wrap gap-2">
        {projects.map((name) => (
          <li key={name} className="rounded-full border border-[color:var(--jd-ink)]/[0.15] px-3 py-1 text-sm">
            {name}
          </li>
        ))}
      </ul>
      {projects.length > 0 && (
        <p className="text-sm font-medium">
          1 sign-in, {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
      )}
    </div>
  );
}
