/*
 * Ports, in one place.
 *
 * Every suite builds and serves its own production bundle on a port of its own, so two suites (and two
 * worktrees) can run at once. The same four lines were copied into eighteen `playwright.config.ts`
 * files: the variable that overrides the port, and the offset a parallel loop slot adds so its servers
 * do not collide with the main checkout's (card://JAVA-558, `AUTOLOOP_PORT_OFFSET`, 0 outside the loop).
 * A config that reads them through here cannot forget the offset, which is how two slots ended up
 * fighting for one port.
 */

/** Where a dev API runs for a suite that needs one: the same default `ReleaseGate` reads. */
export const DEV_API_BASE = "http://localhost:8088";

type Env = Record<string, string | undefined>;

/** The dev API's base URL: `JAVADABA_API_BASE`, else `DEV_API_BASE`, with no trailing slash. */
export function devApiBase(env: Env = process.env): string {
  return (env.JAVADABA_API_BASE || DEV_API_BASE).replace(/\/$/, "");
}

/**
 * The port a suite serves on: `base`, or the value of `variable` when set, plus the loop slot's offset.
 * A malformed value falls back to `base` rather than becoming NaN, which Playwright would read as "any port".
 */
export function e2ePort(base: number, variable = "PLAYWRIGHT_PORT", env: Env = process.env): number {
  const number = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return value !== undefined && value !== "" && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  };
  return number(env[variable], base) + number(env.AUTOLOOP_PORT_OFFSET, 0);
}
