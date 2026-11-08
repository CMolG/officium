import type { HomeFigures as Figures } from "../../lib/backlog/home-metrics";
import type { Card } from "../../lib/backlog/types";
import { Text } from "@javadaba/ui";

interface Figure {
  label: string;
  value: string;
  help: string;
}

/** "Oldest: 2 days" from the instants of what waits, or nothing when nothing does. */
function oldestWaiting(cards: readonly Card[], now: number): string {
  const oldest = Math.min(...cards.map((c) => Date.parse(c.updatedAt)).filter((t) => !Number.isNaN(t)));
  if (!Number.isFinite(oldest)) return "";
  const days = Math.floor((now - oldest) / 86_400_000);
  return days < 1 ? "Oldest: today" : `Oldest: ${days} ${days === 1 ? "day" : "days"}`;
}

function figuresOf(figures: Figures | null, waiting: readonly Card[], now: number): Figure[] {
  const out: Figure[] = [];
  if (figures?.doneThisWeek) {
    const { count, lastWeek } = figures.doneThisWeek;
    const diff = count - lastWeek;
    out.push({
      label: "Cards done this week",
      value: String(count),
      help: diff === 0 ? "Same as last week" : `${Math.abs(diff)} ${diff > 0 ? "more" : "fewer"} than last week`,
    });
  }
  if (figures?.cycleDays != null) {
    out.push({ label: "Cycle time", value: `${figures.cycleDays} d`, help: "From To do to Deploy" });
  }
  if (figures?.doneByAgents != null) {
    out.push({ label: "Done by agents", value: `${figures.doneByAgents}%`, help: `People: ${100 - figures.doneByAgents}%` });
  }
  if (figures?.hoursLogged != null) {
    out.push({ label: "Hours logged", value: `${figures.hoursLogged} h`, help: "This sprint, all projects" });
  }
  if (waiting.length > 0) {
    out.push({ label: "Waiting on you", value: String(waiting.length), help: oldestWaiting(waiting, now) });
  }
  return out;
}

/**
 * The figures across projects (Off-Home, five of them). Only the ones with a value are drawn: "Waiting on you"
 * is counted from what the page loaded; the other four wait for `loadHomeFigures`, so a missing measurement
 * leaves no tile instead of a zero that reads as a measurement.
 */
export function HomeFigures({ figures, waiting, now }: { figures: Figures | null; waiting: readonly Card[]; now: number }) {
  const list = figuresOf(figures, waiting, now);
  if (list.length === 0) return null;
  return (
    <ul aria-label="Across your projects" className="m-0 flex list-none flex-row flex-wrap gap-3 p-0">
      {list.map((figure) => (
        <li key={figure.label} className="flex min-w-36 grow basis-36 flex-col gap-0.5 rounded-[var(--radius-jd-md)] bg-[color:var(--jd-card)] p-3">
          <Text size="xs" tone="muted">
            {figure.label}
          </Text>
          <span className="font-[family-name:var(--font-jd-display)] text-3xl font-bold leading-none tracking-tight">{figure.value}</span>
          <Text size="xs" tone="muted">
            {figure.help}
          </Text>
        </li>
      ))}
    </ul>
  );
}
