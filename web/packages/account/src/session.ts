/**
 * Officium Local has exactly one person, the owner of the machine it runs on, and no sign-in. This
 * package keeps the names the app imports from the Cloud edition's ecosystem login, so the app
 * code is the same in both editions; here every call answers "the local owner, already in".
 */
export interface JavadabaSession {
  accountId: string;
  email: string;
  name: string;
}

// The same id the Local API gives its owner (officium.local.account-id), so "mine" filters match.
const LOCAL_OWNER: JavadabaSession = {
  accountId: "00000000-0000-4000-8000-000000000001",
  email: "owner@localhost",
  name: "Local owner",
};

/** Always signed in and always resolved: there is no session to ask for. */
export function useAuthSession(): { session: JavadabaSession; resolved: true } {
  return { session: LOCAL_OWNER, resolved: true };
}

/** Local has no account inbox: nothing to claim. */
export function claimInboxToasts(_app: string, _owner: string): () => void {
  return () => {};
}
