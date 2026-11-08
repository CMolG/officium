"use client";

import { currentOrigin } from "@javadaba/sdk/platform";

/** The step a CI runs on every merge to main (`scripts/officium-changelog.mjs` is the maintained version). */
function snippet(): string {
  return [
    `curl -X POST ${currentOrigin()}/api/officium/v1/changelog/ingest \\`,
    `  -H "Authorization: Bearer $OFFICIUM_CHANGELOG_TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"ref":"<commit sha>","title":"<commit subject>","url":"<link to the commit>","areas":["<path>"]}'`,
  ].join("\n");
}

/**
 * The pipeline token, for a CI that is not GitHub (JAVA-1565): what to do, in order. The token itself
 * (shown once) and its status are the section's; this is the instructions.
 */
export function PipelineTokenSteps({ issued }: { issued: boolean }) {
  return (
    <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
      <li>
        {issued ? (
          <span>Copy the token above. It is shown once, so copy it before you leave this page.</span>
        ) : (
          <span>
            Select <strong>Create token</strong>. The token is shown once, so copy it before you leave this page.
          </span>
        )}
      </li>
      <li>
        <span>
          In your CI, store it as a secret named <code className="font-mono text-xs">OFFICIUM_CHANGELOG_TOKEN</code>.
        </span>
      </li>
      <li>
        <div className="flex flex-col gap-1.5">
          <span>Add this step to the job that runs on every merge to main:</span>
          <pre
            data-testid="pipeline-snippet"
            className="whitespace-pre-wrap break-all rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.06] p-3 font-mono text-xs"
          >
            {snippet()}
          </pre>
          <span className="text-[color:var(--jd-muted)]">
            Recording the same commit twice keeps one entry, so retries are safe.
          </span>
        </div>
      </li>
    </ol>
  );
}
