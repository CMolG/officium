"use client";

import { useMemo } from "react";
import { Badge, Button, Note, Text } from "@javadaba/ui";
import { useSearchParams } from "@javadaba/ui/navigation";
import { openUrl } from "@javadaba/sdk/platform";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { GithubRepository } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";
import type { GithubRepositoriesState } from "./use-github-repositories";

/** What the callback said when it sent the browser back here (`?github=`). */
function returnNotice(github: string | null, reason: string | null): { tone: "ok" | "error"; text: string } | null {
  if (github === "authorized") {
    return { tone: "ok", text: "GitHub is authorized. The repositories it says you reach are listed below." };
  }
  if (github !== "failed") return null;
  return reason === "unavailable"
    ? { tone: "error", text: "GitHub couldn't be reached, so nothing changed. Try authorizing again in a minute." }
    : { tone: "error", text: "GitHub didn't accept the authorization (it may have expired), so nothing changed. Authorize again." };
}

/**
 * Which GitHub repositories feed this project's cards (officium-api.md §8.10). A repository is offered
 * only once GitHub says, through "Authorize with GitHub", that this account reaches it (JAVA-397), so
 * nobody sees or claims a repository someone else installed. The owner's setting, the GitHub section of
 * Integrations (JAVA-243, JAVA-1629); the authorization comes back there with `?github=`. The read
 * belongs to the page (`useGithubRepositories`), which the Documentation changelog section shares.
 */
export function GithubSettingsView({ projectId, github }: { projectId: string; github: GithubRepositoriesState }) {
  const copy = useCopy().configuration.integrations;
  const repository = useMemo(() => getBacklogRepository(), []);
  const searchParams = useSearchParams();
  const notice = returnNotice(searchParams.get("github"), searchParams.get("reason"));
  const { project, load, busy, actionError, change, retry } = github;
  const authorizeUrl = repository.githubAuthorizeUrl(projectId, false);
  const installUrl = repository.githubAuthorizeUrl(projectId, true);

  const heading = (
    <div className="flex flex-col gap-1">
      <h2 id="github-heading" className="text-lg font-bold">
        <Text>{copy.githubHeading}</Text>
        {project ? <Text className="font-medium text-[color:var(--jd-muted)]">{` · ${project.name}`}</Text> : null}
      </h2>
      <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
        {copy.githubScope}
      </Text>
    </div>
  );

  const authorizable = load.state === "ready" && load.value.authorizable && authorizeUrl !== null;
  const unavailableReason =
    authorizeUrl === null
      ? "The demo has no GitHub: connect repositories from your own Officium account."
      : "GitHub isn't set up on this Officium yet, so there is nothing to authorize with.";

  return (
    <section className="flex flex-col gap-6" aria-labelledby="github-heading">
      {heading}

      <div className="flex flex-col gap-3" role="group" aria-label="Authorize with GitHub">
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          Commits, branches and pull requests that name a card show on it, and a merge to the default branch closes the
          card in deploy. Officium lists the repositories the Officium GitHub App is installed on that GitHub says you
          reach, so nobody else can see or claim yours.
        </Text>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <Button
            type="button"
            register="ui"
            className="min-h-11"
            disabled={!authorizable}
            onClick={() => authorizeUrl && openUrl(authorizeUrl)}
          >
            <Text>Authorize with GitHub</Text>
          </Button>
          <Button
            type="button"
            register="ui"
            variant="outline"
            className="min-h-11"
            disabled={!authorizable}
            onClick={() => installUrl && openUrl(installUrl)}
          >
            <Text>Install the App on a repository</Text>
          </Button>
        </div>
        {load.state === "ready" && !authorizable && (
          <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
            {unavailableReason}
          </Text>
        )}
        {notice && (
          <Note tone={notice.tone === "error" ? "danger" : "success"} role={notice.tone === "error" ? "alert" : "status"}>
            <span className="font-semibold">{notice.text}</span>
          </Note>
        )}
      </div>

      {load.state === "loading" && (
        <Text as="p" role="status" className="py-10 text-center text-sm text-[color:var(--jd-muted)]">
          Loading the repositories…
        </Text>
      )}

      {load.state === "error" && (
        <Note tone={load.ownerOnly ? "neutral" : "danger"} role="alert" className="items-start">
          <div className="flex flex-col items-start gap-2">
            <Text className="text-sm font-semibold">
              {load.ownerOnly ? "Only the project's owner connects GitHub repositories" : "Couldn't load the GitHub repositories"}
            </Text>
            <Text className="text-sm">{load.ownerOnly ? "Ask the owner to connect the repository this project's work happens in." : load.message}</Text>
            {!load.ownerOnly && (
              <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={retry}>
                Try again
              </Button>
            )}
          </div>
        </Note>
      )}

      {load.state === "ready" && (
        <>
          {actionError && (
            <Note tone="danger" role="alert">
              <span className="font-semibold">{actionError}</span>
            </Note>
          )}
          <RepositoryList
            heading="Connected"
            empty="No repository feeds this project yet. Connect one of yours below."
            repos={load.value.connected}
            action="Disconnect"
            busy={busy}
            onAction={(repo) => void change(repo, false)}
          />
          <RepositoryList
            heading="Yours to connect"
            empty={
              authorizable
                ? "None yet. Install the App on a repository, or authorize with GitHub if you installed it already: what GitHub lists shows here for a day."
                : "None to connect."
            }
            repos={load.value.available}
            action="Connect"
            busy={busy}
            onAction={(repo) => void change(repo, true)}
          />
        </>
      )}
    </section>
  );
}

function RepositoryList({
  heading,
  empty,
  repos,
  action,
  busy,
  onAction,
}: {
  heading: string;
  empty: string;
  repos: GithubRepository[];
  action: string;
  busy: string | null;
  onAction: (repo: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2" aria-label={heading}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">{heading}</h3>
      {repos.length === 0 ? (
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          {empty}
        </Text>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {repos.map((r) => (
            <li key={r.repo} className="flex flex-row items-center gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] px-4 py-2">
              <Text className="min-w-0 flex-1 break-words font-mono text-sm">{r.repo}</Text>
              {action === "Disconnect" && (
                <Badge register="chip" size="sm" tone="success" fill="subtle">
                  Connected
                </Badge>
              )}
              <Button
                type="button"
                register="ui"
                variant={action === "Connect" ? "solid" : "ghost"}
                className="min-h-11"
                disabled={busy !== null}
                aria-label={`${action} ${r.repo}`}
                onClick={() => onAction(r.repo)}
              >
                {busy === r.repo ? `${action === "Connect" ? "Connecting" : "Disconnecting"}…` : action}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
