import type { BacklogRepository } from "./repository";
import { ApiDocComments } from "./api/doc-comments";

/**
 * `BacklogRepository` against the real API (JDB-226): `/officium/v1/**` per
 * `doc://contracts/officium-api` §3, read through the app's own same-origin `/api` proxy
 * (`next.config.ts`'s `/api/:path*` rewrite -> `JAVADABA_API_PROXY_TARGET` in dev, Traefik
 * same-origin in prod -- same pattern as `packages/apps/curriculum`). `credentials: "include"`
 * on every call so the `jdb_session` cookie (`@javadaba/account`) travels.
 *
 * **Differences found between the contract doc and the real resources
 * (`javadaba-api/apps/app-api/.../officium/*Resource.java`, which wins -- invariant 10):**
 *
 * 1. `GET .../cards` takes `status`/`priority`/`executor` as ONE value each
 *    (`@QueryParam("status") String`), not a list, even though this app's own `CardQuery.status`
 *    is typed `Status[]`. Harmless: no caller filters by more than one status on the server, and
 *    the board's filters live client-side in `Board.matches()`.
 * 2. `CardComment.author` is a raw domain `Actor`, not the `ActorJson` wrapper `CardView`'s
 *    `createdBy`/`updatedBy` use -- so `author.kind` comes over the wire as `"PERSON"`/`"AGENT"`
 *    (Jackson's default enum serialization), not the contract's lowercase `"person"`/`"agent"`.
 *    Normalized in `mapComment` (`api/core.ts`); every other `Actor`-shaped field on the wire is already
 *    lowercase.
 * 3. `POST .../comments`, `.../time`, `.../attachments` and their `PATCH`/`DELETE` siblings
 *    return the single created/updated resource (or `204`), never the full `CardDetail` this
 *    repository's interface promises its callers. Each of those methods here does the write,
 *    then one extra `GET .../cards/{id}` to hand back the same aggregate shape
 *    `InMemoryBacklogRepository` already returns -- one more round trip, never a second source of
 *    truth for what the card looks like.
 * 4. Project creation's `key_prefix_taken` and a `blocks`-link's `blocks_cycle` are real `409`s
 *    that are NOT `version_conflict` -- they throw as a normal `ApiError` instead of the
 *    `WriteResult` conflict shape, which is reserved for an actual stale `expectedVersion`.
 */
export class ApiBacklogRepository extends ApiDocComments implements BacklogRepository {}
