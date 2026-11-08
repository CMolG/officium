"use client";

import { useAuthSession } from "@javadaba/account";

import { USES_MEMORY_BACKEND } from "./get-repository";
import { YOU as CURRENT_USER } from "./memory-seed";

/**
 * Who is looking: the ecosystem session's account, or the mock backend's one person (it has no
 * session to ask). Undefined while nobody is known, which no card treats as its assignee.
 */
export function useCurrentAccountId(): string | undefined {
  const { session } = useAuthSession();
  return session?.accountId ?? (USES_MEMORY_BACKEND ? CURRENT_USER.accountId : undefined);
}
