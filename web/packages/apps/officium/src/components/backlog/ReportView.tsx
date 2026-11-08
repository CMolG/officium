"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "@javadaba/ui/navigation";
import { Printer } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import type { Timesheet } from "../../lib/backlog/types";
import { formatDate } from "../../lib/backlog/format";

export interface ReportViewProps {
  projectId: string;
}

/**
 * The printable timesheet -- JDB-224 item 4. The concept's `ReportModal.exportPdf` built the
 * whole document into a hidden iframe with `document.write`, and silently did nothing when
 * `iframe.contentDocument` was `null` (e.g. under a strict `sandbox`). This is a dedicated,
 * `noindex` route with its own print stylesheet (`print:hidden` on everything but the report
 * itself): `window.print()` opens the browser's OWN print dialog on THIS document, no
 * `document.write`, and a failure is shown inline instead of swallowed.
 */
export function ReportView({ projectId }: ReportViewProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  // The backend the rest of the app uses, not the in-memory demo: this read the demo seed
  // directly, so a printed report showed invented hours outside the e2e build (found 2026-09-22).
  const repository = useMemo(() => getBacklogRepository(), []);

  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    void (async () => {
      try {
        const sheet = await repository.getTimesheet(projectId, from, to);
        if (cancelled) return;
        setTimesheet(sheet);
      } catch {
        if (!cancelled) setLoadError("Couldn't load the report for this project.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, from, to, repository]);

  function handlePrint() {
    try {
      window.print();
    } catch {
      setPrintError("Couldn't open the print dialog. Use your browser's Print command (Ctrl/Cmd+P) instead.");
    }
  }

  if (!from || !to) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[color:var(--jd-ink)]">This report needs a date range.</p>
        <p className="mt-1 text-sm text-[color:var(--jd-muted)]">Open it again from the board's time report dialog.</p>
      </main>
    );
  }

  const total = timesheet?.entries.reduce((sum, e) => sum + e.hours, 0) ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex flex-row flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-[color:var(--jd-muted)]">Time report for {formatDate(from)} — {formatDate(to)}</p>
        <Button type="button" register="ui" onClick={handlePrint} disabled={!timesheet || timesheet.entries.length === 0}>
          <Printer size={16} /> Print / Save as PDF
        </Button>
      </div>

      {loadError && (
        <p role="alert" className="mb-4 rounded-[var(--radius-jd-md)] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive print:hidden">
          {loadError}
        </p>
      )}
      {printError && (
        <p role="alert" className="mb-4 rounded-[var(--radius-jd-md)] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive print:hidden">
          {printError}
        </p>
      )}

      <h1 className="text-2xl font-black uppercase">Time report</h1>
      <p className="mt-1 text-xs font-medium text-[color:var(--jd-muted)]">
        Range: {formatDate(from)} — {formatDate(to)} · {timesheet?.entries.length ?? 0} entries · {total.toFixed(2)}h total
      </p>

      {!timesheet ? (
        <p className="py-10 text-sm text-[color:var(--jd-muted)]">Loading…</p>
      ) : timesheet.entries.length === 0 ? (
        <p className="py-10 text-sm text-[color:var(--jd-muted)]">No time was logged in this range.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-xs">
              <thead>
                <tr className="text-left">
                  {["Date", "Card", "Title", "Epic", "Status", "Person", "Work", "Hours"].map((h) => (
                    <th key={h} className="border border-[color:var(--jd-line)] p-2 text-xs uppercase text-[color:var(--jd-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timesheet.entries.map((entry) => {
                  return (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap border border-[color:var(--jd-line)] p-2 font-bold">{formatDate(entry.date)}</td>
                      <td className="border border-[color:var(--jd-line)] p-2 font-bold">{entry.cardKey}</td>
                      <td className="border border-[color:var(--jd-line)] p-2">{entry.cardTitle ?? "—"}</td>
                      <td className="border border-[color:var(--jd-line)] p-2">{entry.cardEpic ?? "—"}</td>
                      <td className="border border-[color:var(--jd-line)] p-2">{entry.cardStatus ? STATUS_CONFIG[entry.cardStatus].label : "—"}</td>
                      <td className="border border-[color:var(--jd-line)] p-2">{entry.who}</td>
                      <td className="border border-[color:var(--jd-line)] p-2">{entry.note}</td>
                      <td className="border border-[color:var(--jd-line)] p-2 text-right font-black">{entry.hours.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className="border border-[color:var(--jd-line)] p-2 text-right font-black uppercase">
                    <Text>Total</Text>
                  </td>
                  <td className="border border-[color:var(--jd-line)] p-2 text-right font-black">{total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <h2 className="mt-8 text-xs font-black uppercase tracking-widest">Totals by person</h2>
          <table className="mt-2 w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-[color:var(--jd-line)] p-2 text-left text-xs uppercase text-[color:var(--jd-muted)]"><Text>Person</Text></th>
                <th className="border border-[color:var(--jd-line)] p-2 text-right text-xs uppercase text-[color:var(--jd-muted)]"><Text>Hours</Text></th>
              </tr>
            </thead>
            <tbody>
              {timesheet.totals.map((t) => (
                <tr key={t.who}>
                  <td className="border border-[color:var(--jd-line)] p-2 font-bold">{t.who}</td>
                  <td className="border border-[color:var(--jd-line)] p-2 text-right font-black">{t.hours.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
