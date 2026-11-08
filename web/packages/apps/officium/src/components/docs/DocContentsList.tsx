import type { MarkdownHeading } from "@javadaba/rich-text";
import { ScrollArea } from "@javadaba/ui";

const INDENT = ["pl-0", "pl-3", "pl-6", "pl-9"];

/**
 * The page's headings H1 to H4, indented by level; each one is a button that jumps to it. The list
 * scrolls inside its own area past `max-h-96`, so a long page never pushes the panel off the screen;
 * `fill` makes it take the height its column leaves instead (the side pane, JAVA-1535).
 */
export function DocContentsList({ headings, onJump, fill = false }: { headings: MarkdownHeading[]; onJump: (id: string) => void; fill?: boolean }) {
  return (
    <nav aria-label="Contents" className={fill ? "flex min-h-0 flex-1 flex-col" : undefined}>
      <ScrollArea className={fill ? "min-h-0 flex-1" : "max-h-96"}>
        <ul className="flex flex-col gap-0.5">
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                type="button"
                onClick={() => onJump(heading.id)}
                className={`flex min-h-[44px] w-full flex-row items-center rounded-[var(--radius-jd-sm)] px-2 text-left text-sm text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06] hover:text-[color:var(--jd-ink)] ${INDENT[heading.level - 1] ?? "pl-9"}`}
              >
                <span className="min-w-0 break-words">{heading.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </nav>
  );
}
