import { isAppReleased } from "@javadaba/account/release-gate";

import { IS_LOCAL } from "./edition";

/**
 * Is Officium released? [[JDB-201]]/[[JDB-229]]: "the app must not be openable by direct URL
 * before release." The list and its local-dev bypass live once, in `isAppReleased`, shared with
 * every other gated tool. `javadaba-landing/src/lib/catalog.ts`'s `releaseStage` is the other
 * half of the same decision, and `scripts/test/released-apps.test.mjs` fails when they disagree.
 *
 * The e2e suite's own bypass (for the specs that predate this gate) is a SEPARATE, explicit one:
 * see `playwright.config.ts`.
 */
export function isOfficiumReleased(): boolean {
  // Officium Local is whole: there is no release list to be on.
  return IS_LOCAL || isAppReleased("officium");
}
