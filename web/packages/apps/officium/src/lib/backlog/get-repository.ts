"use client";

import type { BacklogRepository } from "./repository";
import { getSharedBacklogRepository } from "./memory-backend";
import { ApiBacklogRepository } from "./api-repository";

/**
 * Chosen by ENV, never by editing a component (JDB-226 directive):
 *
 * - `NEXT_PUBLIC_OFFICIUM_BACKEND=memory` is the escape hatch this app's OWN e2e suite uses
 *   (`playwright.config.ts`): JDB-223/224/225/239's specs assert against the deterministic seed
 *   in `memory-repository.ts`, which a live API cannot reproduce. Inlined at build time, like
 *   every other `NEXT_PUBLIC_*` flag in this workspace.
 * - Otherwise (`/app/**` in real use) it's `ApiBacklogRepository`.
 */
let apiInstance: ApiBacklogRepository | null = null;

/**
 * The one flag, read once. The same build-time constant decides the backend here AND whether
 * the ecosystem login stands in front of `/app` and behind the product page's CTA
 * (`AppShellClient`, `OpenOfficiumCta`): a mock-backed build has no account to sign in to, so
 * gating it would only lock the e2e suite and `pnpm dev` out of the tool.
 */
export const USES_MEMORY_BACKEND = process.env.NEXT_PUBLIC_OFFICIUM_BACKEND === "memory";

export function getBacklogRepository(): BacklogRepository {
  if (USES_MEMORY_BACKEND) return getSharedBacklogRepository();
  if (!apiInstance) apiInstance = new ApiBacklogRepository();
  return apiInstance;
}
