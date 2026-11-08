import { renderAppIcon } from "@javadaba/brand/favicon";

/*
 * The installed app's icon (Off-Shell, "Install as an app"): the seal at the two sizes a web manifest needs, 192 and 512.
 * A route handler like the tab icon, for the same basePath reason (see `tab-icon/route.tsx`).
 */
export const dynamic = "force-static";

const SIZES = [192, 512];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const side = Number(size);
  if (!SIZES.includes(side)) return new Response("Not found", { status: 404 });
  return renderAppIcon("officium", side);
}
