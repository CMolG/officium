/*
 * The analytics consent bar (`@javadaba/analytics`, role="region", name "Analytics consent")
 * floats over every surface until a choice is made, and Playwright's click retries report it
 * verbatim: "subtree intercepts pointer events". PROMOTED from javadaba-web-os/tests/helpers/
 * unlock.ts (2026-08-29), where it was written first — creatio hit the identical interceptor
 * the same day, which is the moment a copy becomes a package.
 *
 * The choice is "denied", not "granted": a test suite should not send telemetry, and refusing
 * is the state that needs no justification. The event is dispatched as well as the key written,
 * so an already-open page hides the bar without a reload (packages/analytics/src/consent.ts).
 */
import type { Page } from "@playwright/test";

export async function seedConsentDenied(page: Page): Promise<void> {
  const seed = () => {
    try {
      window.localStorage.setItem(
        "jdb_consent",
        JSON.stringify({ v: 1, choice: "denied", ts: Date.now() }),
      );
      window.dispatchEvent(new CustomEvent("javadaba-consent-change", { detail: "denied" }));
    } catch {
      /* storage disabled: the banner stays, and the caller's click retry will say so */
    }
  };
  await page.addInitScript(seed);
  await page.evaluate(seed).catch(() => {});
}
