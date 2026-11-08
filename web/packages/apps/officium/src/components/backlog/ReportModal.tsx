"use client";

import { useState } from "react";
import { useRouter } from "@javadaba/ui/navigation";
import { CalendarRange } from "lucide-react";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input } from "@javadaba/ui";

import { todayISO } from "../../lib/backlog/format";
import { lastWeek, thisMonth, thisWeek, type ReportRange } from "../../lib/backlog/report-ranges";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";

export interface ReportModalProps {
  projectId: string;
  onClose: () => void;
}

/**
 * Picks a date range and opens the dedicated, printable report view (JDB-224 item 4). The
 * concept's `ReportModal.exportPdf` wrote the whole report into a hidden iframe with
 * `document.write` and no-oped silently when `contentDocument` was null -- forbidden here
 * (`.harness/rules/external-providers.md` treats it as scaffolding to rewrite, and the harness
 * bans `document.write` outright). Instead this only navigates to
 * `/app/p/[projectId]/report`, a real route with its own print stylesheet; that route owns the
 * export and its own failure feedback.
 */
export function ReportModal({ projectId, onClose }: ReportModalProps) {
  const router = useRouter();
  // This month so far. It was a fixed "2026-06-01 .. 2026-07-31" -- the demo seed's months -- so
  // every real report opened on a range with nothing recent in it (2026-09-23 audit).
  const [from, setFrom] = useState(() => `${todayISO().slice(0, 8)}01`);
  const [to, setTo] = useState(todayISO);
  const invalidRange = Boolean(from && to && from > to);
  const returnFocus = useReturnFocus();

  function pick(range: ReportRange) {
    setFrom(range.from);
    setTo(range.to);
  }

  function openReport() {
    if (invalidRange || !from || !to) return;
    // JAVA-52: the printable report lives in Contributions' "Time report" tab now, kept under
    // that name; `/report` itself just redirects here for anyone with an old link.
    router.push(`/app/p/${projectId}/contributions?tab=report&from=${from}&to=${to}`);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-md">
        <DialogTitle>Time report</DialogTitle>
        <DialogDescription>
          Choose a date range. The report opens in its own page, ready to print or save as PDF from the browser.
        </DialogDescription>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {/* The three ranges people ask for most, one press each (Off-Board2). */}
        <div className="flex flex-row flex-wrap gap-2">
          <Button type="button" register="ui" variant="ghost" size="sm" onClick={() => pick(thisWeek(todayISO()))}>
            This week
          </Button>
          <Button type="button" register="ui" variant="ghost" size="sm" onClick={() => pick(lastWeek(todayISO()))}>
            Last week
          </Button>
          <Button type="button" register="ui" variant="ghost" size="sm" onClick={() => pick(thisMonth(todayISO()))}>
            This month
          </Button>
        </div>
        {invalidRange && (
          <p role="alert" className="text-xs font-bold text-destructive">
            The date range is not valid.
          </p>
        )}

        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" register="ui" disabled={invalidRange || !from || !to} onClick={openReport}>
            <CalendarRange size={16} /> Open report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
