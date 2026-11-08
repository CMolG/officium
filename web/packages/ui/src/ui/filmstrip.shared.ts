/*
 * Filmstrip's pure half (JAVA-1290): the types, the words and the arithmetic. No JSX, so the
 * strip, its segments and its ruler share one definition and Theatrum's runtime can import
 * `formatTimecode` instead of writing a second one.
 */

export type FilmstripState = "received" | "pending" | "gap";

export interface FilmstripSegment {
  id: string;
  /** Width on the time axis: the strip tiles these exactly. */
  seconds: number;
  state: FilmstripState;
  label?: string;
}

/** The word each state carries, so color is never the only channel. */
export const STATE_WORDS: Record<FilmstripState, string> = {
  received: "received",
  pending: "pending",
  gap: "gap",
};

/** Narrow strategy: at least this many px per second at every width, then the strip scrolls. */
export const PX_PER_SECOND = 12;

export const secondsLabel = (seconds: number) => `${Number(seconds.toFixed(1))} seconds`;

/** "SH009, 2.2 seconds, gap" */
export function segmentName(segment: FilmstripSegment): string {
  return `${segment.id}, ${secondsLabel(segment.seconds)}, ${STATE_WORDS[segment.state]}`;
}

/** m:ss, rounded down to the second. */
export function formatTimecode(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export const totalSeconds = (segments: readonly FilmstripSegment[]) =>
  segments.reduce((sum, s) => sum + s.seconds, 0);

/** An integer, so server and client render the same style. */
export const minTrackWidth = (total: number) => Math.ceil(total * PX_PER_SECOND);

/**
 * Round timecodes for the ruler: every 10 s up to 90 s, then every 30 s. A tick closer to the end
 * than half a step is dropped, so it does not collide with the total printed there.
 */
export function rulerTicks(total: number): number[] {
  const step = total <= 90 ? 10 : 30;
  const ticks: number[] = [];
  for (let t = 0; t < total; t += step) {
    if (t === 0 || total - t >= step / 2) ticks.push(t);
  }
  return ticks;
}

/** The segment that holds the roving tab stop: current, else playing, else first gap, else first. */
export function tabStopId(segments: readonly FilmstripSegment[], current?: string, playing?: string): string | undefined {
  const has = (id?: string) => (id && segments.some((s) => s.id === id) ? id : undefined);
  return has(current) ?? has(playing) ?? segments.find((s) => s.state === "gap")?.id ?? segments[0]?.id;
}

/** The accessible name of the whole strip. */
export function stripName(segments: readonly FilmstripSegment[]): string {
  const n = segments.length;
  return `Timeline, ${n} ${n === 1 ? "shot" : "shots"}, ${formatTimecode(totalSeconds(segments))}`;
}
