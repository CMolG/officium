"use client";

import { useEffect, useMemo } from "react";
import { useAuthSession } from "@javadaba/account";
import { Button } from "@javadaba/ui";
import { Link, useRouter } from "@javadaba/ui/navigation";
import { ArrowLeft } from "lucide-react";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { recordProjectOpened } from "../../lib/backlog/last-project";
import { HideWhoProvider } from "../../lib/backlog/hide-who-context";
import { ReadOnlyProvider } from "../../lib/backlog/read-only-context";
import { boardPath, cardPath } from "../../lib/backlog/search-links";
import { CardPageBody } from "./CardPageBody";
import { CardPageNotice } from "./CardPageNotice";
import { useCardPage } from "./use-card-page";

/**
 * A card's own page (JAVA-1567), `/app/p/<projectId>/<KEY>`: the card fills Officium's work canvas,
 * the area the board renders in. Reload, share and the links from search, the role sheet and the
 * projects home land here; the board's modal links here too.
 */
export function CardPageSurface({ projectId, cardKey }: { projectId: string; cardKey: string }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const router = useRouter();
  const { session } = useAuthSession();
  const key = useMemo(() => {
    try {
      return decodeURIComponent(cardKey).toUpperCase();
    } catch {
      return cardKey.toUpperCase();
    }
  }, [cardKey]);
  const { state, retry, setDetail } = useCardPage(projectId, key, repository);
  const board = boardPath(projectId);

  useEffect(() => {
    recordProjectOpened(projectId, session?.accountId);
  }, [projectId, session?.accountId]);

  // A lower-case key is typed by hand: land it on the canonical address.
  useEffect(() => {
    if (cardKey !== encodeURIComponent(key)) router.replace(cardPath(projectId, key));
  }, [cardKey, key, projectId, router]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Card page" className="flex shrink-0 flex-row items-center border-b border-[color:var(--jd-line)] px-3 py-1">
        <Button asChild register="ui" variant="ghost" className="min-h-11">
          <Link href={board}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to the board
          </Link>
        </Button>
      </nav>
      {state.phase === "loading" && <CardPageNotice title={`Loading ${key}...`} boardHref={board} />}
      {state.phase === "missing" && (
        <CardPageNotice
          title={`Card ${key} doesn't exist`}
          detail="It may have been deleted, or the key may be mistyped. Pick the card on the board."
          boardHref={board}
        />
      )}
      {state.phase === "error" && (
        <CardPageNotice title={`Couldn't load ${key}`} detail={state.message} boardHref={board} onRetry={retry} />
      )}
      {state.phase === "ready" && (
        <ReadOnlyProvider value={state.readOnly}>
          <HideWhoProvider projectId={projectId} viewer={state.readOnly}>
          <CardPageBody
            projectId={projectId}
            repository={repository}
            detail={state.detail}
            assignees={state.assignees}
            agentWork={state.agentWork}
            onChanged={setDetail}
            onOpenOther={(keyOrId) => router.push(cardPath(projectId, keyOrId))}
            onDeleted={() => router.push(board)}
          />
          </HideWhoProvider>
        </ReadOnlyProvider>
      )}
    </div>
  );
}
