import { Link } from "@javadaba/ui/navigation";
import { Button, Text } from "@javadaba/ui";

import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import { cardPath } from "../../lib/backlog/search-links";
import type { BoardCard } from "../../lib/backlog/board-copy";
import type { Project } from "../../lib/backlog/types";
import { CollapsedList } from "../backlog/Collapsed";
import { StatusShape } from "../backlog/StatusShape";
import { KICKER } from "./SheetParts";
import { CardRowsLoading } from "./CardRowsLoading";

export type CardsLoad = { state: "loading" } | { state: "ready"; value: BoardCard[] } | { state: "error"; message: string };


export function RoleEligibleCards({
  cards,
  project,
  onRetry,
}: {
  cards: CardsLoad;
  project: Project;
  onRetry: () => void;
}) {
  if (cards.state === "loading") return <CardRowsLoading />;
  if (cards.state === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
        <Text className="font-semibold">Couldn&apos;t load this project&apos;s cards.</Text>
        <Text className="text-sm text-[color:var(--jd-muted)]">{cards.message}</Text>
        <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={onRetry}>
          <Text>Try again</Text>
        </Button>
      </div>
    );
  }
  if (cards.value.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
        <Text className="font-semibold">{`No card in ${project.name} needs this role right now.`}</Text>
        <Button asChild register="ui" variant="outline" className="min-h-11">
          <Link href={`/app/p/${project.id}`}>
            <Text>{`Open the ${project.name} board`}</Text>
          </Link>
        </Button>
      </div>
    );
  }
  // A role like Frontend developer is eligible for a good part of a backlog: the first ten, and
  // the rest behind one button (the same collapse a card's comments use, JAVA-522).
  return (
    <CollapsedList
      aria-label="Cards it can take now"
      items={cards.value}
      visible={10}
      itemKey={(card) => card.id}
      moreLabel={(hidden) => `Show ${hidden} more ${hidden === 1 ? "card" : "cards"}`}
      className="flex flex-col border-t border-[color:var(--jd-line)]"
      renderItem={(card) => (
        <Link
          href={cardPath(project.id, card.key)}
          data-testid="role-card"
          className="flex min-h-14 flex-row items-center gap-3.5 border-b border-[color:var(--jd-line)] px-1 py-2.5 hover:bg-muted"
        >
          <Text className="w-16 shrink-0 font-[family-name:var(--font-jd-kicker)] text-xs font-bold tracking-wider text-[color:var(--jd-muted)] sm:w-20">
            {card.key}
          </Text>
          <StatusShape status={card.status} className="size-4 shrink-0" />
          <Text className="min-w-0 flex-1 font-semibold break-words">{card.title}</Text>
          <Text className={`shrink-0 ${KICKER}`}>{STATUS_CONFIG[card.status].label}</Text>
        </Link>
      )}
    />
  );
}

