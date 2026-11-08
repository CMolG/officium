import { Text } from "./text";
import { formatTimecode, rulerTicks, type FilmstripSegment } from "./filmstrip.shared";

/*
 * The ruler under a Filmstrip (JAVA-1290): flex-grow cells on the same time axis as the segments,
 * each labelled at its start; the last one ends with the total.
 */

export interface FilmstripRulerProps {
  mode: "ends" | "ticks";
  total: number;
  /** For `ends`: the current segment and where it starts, printed in the middle. */
  currentAt?: { id: string; start: number };
}

const INK = "text-[10px] tabular-nums text-[color:var(--jd-faint)]";

export function FilmstripRuler({ mode, total, currentAt }: FilmstripRulerProps) {
  if (mode === "ends") {
    return (
      <div className="flex flex-row px-1 pt-1" aria-hidden="true">
        <Text font="kicker" className={INK}>{formatTimecode(0)}</Text>
        <Text font="kicker" className={`${INK} flex-1 text-center`}>
          {currentAt ? `${currentAt.id} at ${formatTimecode(currentAt.start)}` : ""}
        </Text>
        <Text font="kicker" className={INK}>{formatTimecode(total)}</Text>
      </div>
    );
  }
  const ticks = rulerTicks(total);
  return (
    <div className="flex flex-row px-1 pt-1" aria-hidden="true">
      {ticks.map((t, i) => {
        const next = ticks[i + 1] ?? total;
        const last = i === ticks.length - 1;
        return (
          <div key={t} className={`flex min-w-0 basis-0 flex-row ${last ? "justify-between" : ""}`} style={{ flexGrow: next - t }}>
            <Text font="kicker" className={INK}>{formatTimecode(t)}</Text>
            {last ? <Text font="kicker" className={INK}>{formatTimecode(total)}</Text> : null}
          </div>
        );
      })}
    </div>
  );
}

/** Where a segment starts on the time axis. */
export function startOf(segments: readonly FilmstripSegment[], id: string): number {
  let at = 0;
  for (const s of segments) {
    if (s.id === id) return at;
    at += s.seconds;
  }
  return 0;
}
