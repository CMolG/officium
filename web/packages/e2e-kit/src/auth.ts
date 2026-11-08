/*
 * The door into a session, for tests.
 *
 * ONE login for the whole ecosystem (`rules/architecture.md`), so there is one door here too:
 * `POST /api/account/v1/auth/dev-login`, the same endpoint `packages/account/src/session.ts`
 * calls, on the same same-origin relative path — which is why this works identically inside a
 * zone with a `basePath` and one without (`/api` hangs off the domain, not off the basePath).
 *
 * It answers 404 unless the server runs with the dev profile, and that is the point: the same
 * helper cannot open a session against production.
 */
import type { APIRequestContext, Page } from "@playwright/test";

export const DEV_LOGIN_PATH = "/api/account/v1/auth/dev-login";
export const SESSION_PROBE_PATH = "/api/account/v1/auth/me";

/**
 * Opens a session and leaves the `jdb_session` cookie in the page's context.
 *
 * Through `page.request` and not a bare `request` fixture on purpose: they share the cookie jar,
 * so the next `page.goto` is already signed in without driving the login dialog — the UI flow
 * is worth testing once, in its own spec, not as a prelude to every other test.
 *
 * Returns whether it worked instead of asserting, so the caller chooses: a spec ABOUT the
 * session fails; a spec that merely needs one skips.
 *
 * **The email does not pick the account.** Without `accountId` the API signs every caller into
 * ONE shared dev account (`javadaba.account.dev-login.default-account-id`), whatever the email.
 * A spec that needs a fresh account, or that writes state another spec would read, passes its
 * own (`randomUUID()`): [[JDB-163]]'s sweep completed onboarding on the shared account and the
 * "fresh signup" test running beside it saw a dashboard.
 */
export async function devLogin(page: Page, email = "e2e@javadaba.dev", accountId?: string): Promise<boolean> {
  try {
    const res = await page.request.post(DEV_LOGIN_PATH, { data: accountId ? { email, accountId } : { email } });
    return res.ok();
  } catch {
    return false;
  }
}

/** True when the Quarkus API answers through the same-origin `/api` proxy. */
export async function apiUp(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get(SESSION_PROBE_PATH);
    // 204 = up, no session (JAVA-204; 401 before it); 200 = up + session. 5xx/connection error = down.
    return [200, 204, 401].includes(res.status());
  } catch {
    return false;
  }
}

/**
 * What an anonymous visit to `path` got back as a 4xx from the ecosystem API, as
 * `"<status> <METHOD> <path>"` lines — the contract is that it is EMPTY (JAVA-204): the one session
 * probe answers 204 "no session", and every other authenticated read waits for an identity
 * ([[JDB-156]]). Counted from responses, not from the console, because a suite's console allowlist
 * can mute exactly this. `prefixes` names the API paths this surface talks to: an app served with
 * no `basePath` in e2e has route handlers of its own under `/api` too, and those are not the API.
 */
export async function anonymousApiErrors(
  page: Page,
  path: string,
  prefixes: string[] = ["/api/account/"],
): Promise<string[]> {
  const errors: string[] = [];
  page.on("response", (response) => {
    const { pathname } = new URL(response.url());
    if (response.status() >= 400 && response.status() < 500 && prefixes.some((p) => pathname.startsWith(p))) {
      errors.push(`${response.status()} ${response.request().method()} ${pathname}`);
    }
  });
  // Waited on its consequence: the probe answering, then the page going quiet after it.
  const probed = page.waitForResponse((response) => new URL(response.url()).pathname === SESSION_PROBE_PATH);
  await page.goto(path);
  await probed;
  await page.waitForLoadState("networkidle");
  return errors;
}
