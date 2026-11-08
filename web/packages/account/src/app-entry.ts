import type { NextRequest, NextResponse } from "next/server";

/** Local has no landing to send anyone back to or forward from. */
export async function appEntryRedirect(
  _request: NextRequest,
  _options: { app: string; entryPath: string },
): Promise<NextResponse | null> {
  return null;
}
