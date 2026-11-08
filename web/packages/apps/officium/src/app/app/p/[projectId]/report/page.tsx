import { redirect } from "next/navigation";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * JAVA-52 folded the printable time report into Contributions' "Time report" tab, so this route
 * is now a redirect -- kept so an old bookmark or a link an agent already sent out still works
 * (invariant: "existing URLs keep working"). `from`/`to` travel unchanged; `ReportView` (still
 * the component that renders the table and owns `window.print()`) is unmoved, only where it's
 * mounted changed.
 */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { projectId } = await params;
  const { from, to } = await searchParams;
  const qs = new URLSearchParams({ tab: "report", ...(from ? { from } : {}), ...(to ? { to } : {}) });
  redirect(`/app/p/${projectId}/contributions?${qs.toString()}`);
}
