"use client";

import { Button, Note, Text } from "@javadaba/ui";

import type { Project } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";
import { PipelineTokenState } from "./PipelineTokenState";
import { PipelineTokenSteps } from "./PipelineTokenSteps";
import type { PipelineToken } from "./use-pipeline-token";

/**
 * The pipeline token block of the Documentation changelog section: the token's status, the owner's controls
 * (create, replace, revoke with one confirmation) and the steps for a CI that is not GitHub.
 */
export function PipelineTokenBlock({ project, token }: { project: Project | null; token: PipelineToken }) {
  const copy = useCopy().configuration.integrations;
  const isOwner = project?.role === "owner";

  return (
    <section aria-labelledby="pipeline-token" className="flex min-w-0 flex-col gap-3">
      <h3 id="pipeline-token" className="text-sm font-semibold">
        Another CI: use a pipeline token
      </h3>
      <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
        For a repository that is not on GitHub, or a CI you would rather keep. The token lets your CI record merges and
        test runs in this project.
      </Text>

      {token.status.state === "loading" && (
        <Text as="p" role="status" className="text-sm text-[color:var(--jd-muted)]">
          Checking the pipeline…
        </Text>
      )}

      {token.status.state === "error" && (
        <Note tone="danger" role="alert" className="items-start">
          <div className="flex flex-col items-start gap-2">
            <Text className="text-sm font-semibold">Couldn't check the pipeline token</Text>
            <Text className="text-sm">{token.status.message}</Text>
            <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={token.retry}>
              Try again
            </Button>
          </div>
        </Note>
      )}

      {token.status.state === "ready" && (
        <>
          <PipelineTokenState
            issued={token.issued}
            configured={token.status.value.configured}
            createdAt={token.status.value.configured ? token.status.value.createdAt : null}
          />

          {isOwner && !token.confirmingRevoke && (
            <div className="flex flex-row flex-wrap gap-2">
              <Button type="button" register="ui" className="min-h-11" disabled={token.busy} onClick={() => void token.issue()}>
                <span>
                  {token.busy ? "Working…" : token.status.value.configured ? "Create a new token" : "Create token"}
                </span>
              </Button>
              {token.status.value.configured && (
                <Button
                  type="button"
                  register="ui"
                  variant="ghost"
                  className="min-h-11"
                  disabled={token.busy}
                  onClick={() => token.setConfirmingRevoke(true)}
                >
                  <span>Revoke</span>
                </Button>
              )}
            </div>
          )}

          {project && !isOwner && (
            <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
              {copy.pipelineOwnerOnly}
            </Text>
          )}

          {token.confirmingRevoke && (
            <Note tone="warning" role="alert" className="items-start">
              <div className="flex flex-col gap-2">
                <Text as="p" className="text-sm">
                  Revoke the token? The pipeline stops recording merges until it is given a new one, and it won&apos;t be told.
                </Text>
                <div className="flex flex-row flex-wrap gap-2">
                  <Button type="button" register="ui" size="sm" variant="outline" disabled={token.busy} onClick={() => void token.revoke()}>
                    <span>Revoke the token</span>
                  </Button>
                  <Button type="button" register="ui" size="sm" variant="ghost" onClick={() => token.setConfirmingRevoke(false)}>
                    <span>Keep it</span>
                  </Button>
                </div>
              </div>
            </Note>
          )}

          {token.error && (
            <Text as="p" role="alert" className="text-sm font-semibold text-destructive">
              {token.error}
            </Text>
          )}

          <PipelineTokenSteps issued={Boolean(token.issued)} />
        </>
      )}
    </section>
  );
}
