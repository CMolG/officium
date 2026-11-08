/*
 * Tours that stopped at a step held back by `when` (Son-Tour): the step to pick up from, kept in
 * this browser so the tour resumes the first time its condition holds, even on a later visit.
 * Like the "seen" record, a blocked or missing storage only costs the memory of where it stopped.
 */

const KEY = "jd-tours-paused";

function read(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, index]) => Number.isInteger(index)));
  } catch {
    return {};
  }
}

function write(paused: Record<string, number>): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(paused));
  } catch {
    // Storage blocked: the tour will not resume after a reload, and nothing else is lost.
  }
}

/** The step a stopped tour picks up from, or undefined when it is not stopped. */
export function pausedAt(tourId: string): number | undefined {
  return read()[tourId];
}

export function pauseTourAt(tourId: string, index: number): void {
  write({ ...read(), [tourId]: index });
}

export function clearPaused(tourId: string): void {
  const { [tourId]: _gone, ...rest } = read();
  write(rest);
}

/** Every tour that is waiting for its step's condition. */
export function pausedTourIds(): string[] {
  return Object.keys(read());
}
