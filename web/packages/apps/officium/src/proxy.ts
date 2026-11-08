import { NextResponse, type NextRequest } from "next/server";
import { appEntryRedirect } from "@javadaba/account/app-entry";

/**
 * JAVA-1025: a signed-in person who already opened Officium goes straight into it from the root.
 * Anyone else, or any failure of the check, gets the landing: see `appEntryRedirect`.
 */
export async function proxy(request: NextRequest) {
  return (await appEntryRedirect(request, { app: "officium", entryPath: "/app" })) ?? NextResponse.next();
}

// Relative to the zone: Next prefixes the basePath itself. The root only.
export const config = {
  matcher: "/",
};
