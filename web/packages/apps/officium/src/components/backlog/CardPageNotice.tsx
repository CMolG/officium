import { Button, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

/** What the card's page says when there is no card to show: still loading, missing, or failed, always with the way back. */
export function CardPageNotice({ title, detail, boardHref, onRetry }: { title: string; detail?: string; boardHref: string; onRetry?: () => void }) {
  return (
    <div role="status" className="m-5 flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
      <Text className="font-semibold">{title}</Text>
      {detail && <Text className="text-sm text-[color:var(--jd-muted)]">{detail}</Text>}
      <span className="flex flex-row flex-wrap gap-2">
        {onRetry && (
          <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button asChild register="ui" variant="outline" className="min-h-11">
          <Link href={boardHref}>Back to the board</Link>
        </Button>
      </span>
    </div>
  );
}
