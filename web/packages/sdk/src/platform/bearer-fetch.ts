/**
 * The Android half of `apiFetch` (JAVA-413), kept pure so a node test can drive it: the fetch it
 * calls and the session it asks are both passed in.
 */

/** What the app's sign-in hands the transport. `refresh` answers the new access token, or null. */
export interface ApiAuth {
  token(): Promise<string | null>;
  refresh(): Promise<string | null>;
}

/** A body that can be sent twice. A stream is spent by the first send, so it is never retried. */
const replayable = (body: RequestInit["body"]): boolean => body == null || typeof body === "string";

/**
 * Sends the request with the session's bearer and never a cookie: `NativeAppSessionFilter` prefers
 * a `jdb_session` to a bearer, so one left in the cookie jar would outlive sign-out. A 401 on a
 * request that carried a bearer refreshes once and retries once.
 */
export async function bearerFetch(
  send: typeof fetch,
  url: string,
  init: RequestInit | undefined,
  auth: ApiAuth | null,
): Promise<Response> {
  const attempt = async (token: string | null) => {
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return send(url, { ...init, headers, credentials: "omit" });
  };
  const token = auth ? await auth.token() : null;
  const response = await attempt(token);
  if (response.status !== 401 || !token || !auth || !replayable(init?.body)) return response;
  const renewed = await auth.refresh();
  return renewed ? attempt(renewed) : response;
}
