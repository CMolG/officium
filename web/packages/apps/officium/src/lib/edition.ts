/**
 * Which edition this build is: `local` is Officium Local, the free self-hosted one (one owner, no
 * ecosystem login, no telemetry); anything else is Cloud. A build-time flag, inlined like every
 * `NEXT_PUBLIC_*` one, so a Local build carries none of Cloud's gated screens.
 */
export const IS_LOCAL = process.env.NEXT_PUBLIC_OFFICIUM_EDITION === "local";

/** Where Cloud is described. A plain page of the marketing site, not a checkout. */
export const CLOUD_URL = "https://javadaba.com/officium";
