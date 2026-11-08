/*
 * The ecosystem session, faked at its API, for suites that run without a dev API on :8088.
 *
 * One door, as in production (invariant 7): every app reads the session from `/api/account/v1/auth/me`,
 * the balance from `/wallet` and the inbox from `/notifications`. A suite that needs "signed in" or
 * "signed out" answers those and nothing else, so no API has to be up. It was copied into a dozen
 * suites, each with its own idea of the wallet's shape; this is the one.
 */
import type { Page } from "@playwright/test";

export interface AccountSessionOptions {
  signedIn?: boolean;
  email?: string;
  admin?: boolean;
  /** The balance in dollars as a decimal string; `"0"` unless a spec is about the number. */
  balance?: string;
}

/**
 * Answers the account API for `page`. Signed out is the API's own answer, 204 with no body.
 * The wallet is sent the way the server still spells it.
 *
 * TODO(backend): MIG-B017 the wallet's JSON still names the balance `balanceTokensJ` (no balance is held
 * in Tokens J any more; the amount is dollars). When the server serves the dollar fields (bought and
 * promotional), this answers them and the old name goes.
 */
export async function mockAccountSession(page: Page, options: AccountSessionOptions = {}): Promise<void> {
  const { signedIn = true, email = "e2e@javadaba.dev", admin = false, balance = "0" } = options;
  await page.route("**/api/account/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) {
      return signedIn ? route.fulfill({ json: { accountId: "a1", email, admin } }) : route.fulfill({ status: 204 });
    }
    if (path.endsWith("/wallet")) return route.fulfill({ json: { balanceTokensJ: balance } });
    // The menu's inbox (JAVA-1621): an empty list, and no live channel (204 ends the EventSource).
    if (path.endsWith("/notifications")) return route.fulfill({ json: { unread: 0, items: [] } });
    if (path.endsWith("/notifications/events")) return route.fulfill({ status: 204 });
    return route.fulfill({ json: {} });
  });
}
