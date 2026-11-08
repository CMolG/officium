"use client";

import { useAuthSession } from "@javadaba/account";
import { useEffect } from "react";

import { forgetBoardStore } from "../../lib/backlog/local-store/board-store";

/**
 * JAVA-1575: a browser that is signed out keeps no board copy. The board reads its copy only while
 * it is open, so this mounts with the app and empties the store once the session is known to be
 * gone, whichever page the sign-out happened on. Renders nothing.
 */
export function ForgetBoardCopyOnSignOut() {
  const { session, resolved } = useAuthSession();
  const signedOut = resolved && !session;

  useEffect(() => {
    if (signedOut) void forgetBoardStore().catch(() => {});
  }, [signedOut]);

  return null;
}
