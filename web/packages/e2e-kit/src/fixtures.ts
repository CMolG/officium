/*
 * The hygiene contract: a test fails if the page logged an error nobody declared.
 *
 * PROMOTED, not rewritten, from `javadaba-landing/e2e/fixtures.ts` — where the same fixture
 * had been reimplemented a third time (fabula and web-os had their own). What is shared is the
 * MECHANISM; the allowlist is not, and that is deliberate: an allowlist is a per-app statement
 * about which noise a given surface tolerates and why. A shared one would grow forever and mute
 * the alarm for every other app (`doc://history/plans/2026-08-29-e2e-estados-frontend`, "Allowlist
 * rot").
 */
import { test as playwrightTest, expect, type Page } from "@playwright/test";

import { waitForHydration } from "./hydration";

/**
 * Playwright's `test` with the failure screenshot, taken only when there IS a failure. A suite
 * that wants failure screenshots imports `test` from here (or builds on `createTest`) and sets
 * `screenshot: "off"` in its config. Some suites take no screenshots at all, on purpose
 * (curriculum, quaestio and fluxor-web, by the user's directive).
 *
 * Playwright's own `screenshot: "only-on-failure"` screenshots every page of every PASSING test
 * too, when the context closes, and throws the file away. Measured alone, turning it off took
 * sonus-e2e from 799 to 524 CPU-s, fabula-e2e from 787 to 662 and web-os-e2e from 497 to 353
 * (JAVA-231; the landing measured ~23% of a serial run on 2026-09-13, JDB-211).
 *
 * It wraps `page` rather than adding an auto fixture, so a request-only test opens no page.
 * And it tears down after every fixture that uses the page, `failOnError` included, so a
 * console-error failure gets its picture too. A page a test opens through its own
 * `browser.newContext()` is not captured.
 */
export const test = playwrightTest.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);
    if (testInfo.status === testInfo.expectedStatus) return;
    const body = await page.screenshot().catch(() => null);
    if (body) await testInfo.attach("screenshot", { body, contentType: "image/png" });
  },
});

/*
 * Noise a test INDUCES on purpose — a `forceApiDown` 503, a hand-mocked 404 — is not noise the
 * page owns, and tolerating it suite-wide would blind the suite to a genuinely broken asset.
 * So the tolerance is scoped to the page and the moment: a forcing helper registers the exact
 * pattern it is about to cause and removes it when un-routed. `states.ts` does this for you;
 * a spec that hand-crafts a failing response declares it itself, one line beside the mock.
 */
const inducedConsole = new WeakMap<Page, RegExp[]>();

/** Tolerate `pattern` on this page until the returned function is called. */
export function pushInducedConsole(page: Page, pattern: RegExp): () => void {
  const list = inducedConsole.get(page) ?? [];
  list.push(pattern);
  inducedConsole.set(page, list);
  return () => {
    const current = inducedConsole.get(page) ?? [];
    const at = current.indexOf(pattern);
    if (at >= 0) current.splice(at, 1);
  };
}

/** What a suite declares it tolerates. Every entry earns its place with a reason next to it. */
export interface HygieneAllowlist {
  /** `console.error` texts that are environment noise, not a page bug. */
  console?: RegExp[];
  /**
   * Uncaught exceptions. Normally EMPTY: a `pageerror` means the page threw, and a React
   * hydration mismatch (#418/#422/#423/#425) means server and client rendered different
   * content — always a bug to fix at the source, never to allowlist.
   */
  pageErrors?: RegExp[];
}

/**
 * Builds the suite's `test` object: `test.extend` with an auto fixture that collects
 * `console.error` and `pageerror` for the whole test and asserts, at teardown, that nothing
 * outside the allowlist happened.
 *
 * Auto on purpose — it applies to every test in the suite without anyone remembering to ask
 * for it, which is the only way a hygiene check survives contact with a growing suite.
 */
export function createTest(allowlist: HygieneAllowlist = {}) {
  const allowedConsole = allowlist.console ?? [];
  const allowedPageErrors = allowlist.pageErrors ?? [];

  return test.extend<{ failOnError: void }>({
    failOnError: [
      async ({ page }, use) => {
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];

        page.on("console", (msg) => {
          if (msg.type() !== "error") return;
          // Chromium's "Failed to load resource" text does NOT carry the URL; location() does.
          const loc = msg.location();
          const text = loc.url ? `${msg.text()} [${loc.url}]` : msg.text();
          const induced = inducedConsole.get(page) ?? [];
          if (allowedConsole.some((re) => re.test(text))) return;
          if (induced.some((re) => re.test(text))) return;
          consoleErrors.push(text);
        });
        page.on("pageerror", (err) => {
          if (!allowedPageErrors.some((re) => re.test(err.message))) pageErrors.push(err.message);
        });

        await use();

        expect(pageErrors, `Uncaught JS exceptions:\n${pageErrors.join("\n")}`).toEqual([]);
        expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
      },
      { auto: true },
    ],
  });
}

/**
 * Console noise that is about the TEST ENVIRONMENT rather than about any one app: a headless
 * browser with no favicon, blocked third-party resources, and the dev-server chatter Next
 * prints. Offered as a starting point — a suite composes it with its own entries; it is never
 * applied implicitly.
 */
export const COMMON_CONSOLE_NOISE: RegExp[] = [
  /favicon/i,
  /ResizeObserver loop/i,
  /Failed to load resource/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
];

/**
 * Navigate and assert a non-error HTTP status. Returns the response.
 *
 * It also waits for the page to hydrate (`waitForHydration`): DOMContentLoaded is the server's HTML on screen
 * with no handler attached, and a click made then is lost. `{ hydrate: false }` skips the wait for a spec
 * that asserts the pre-hydration page itself.
 */
export async function gotoOk(page: Page, path: string, { hydrate = true }: { hydrate?: boolean } = {}) {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res, `no response for ${path}`).not.toBeNull();
  expect(res!.status(), `${path} returned HTTP ${res!.status()}`).toBeLessThan(400);
  if (hydrate) await waitForHydration(page);
  return res!;
}

export { expect };
