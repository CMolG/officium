"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Link } from "@javadaba/ui/navigation";
import { Badge, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton, Text } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { ModSheet, ModSummary } from "../../lib/backlog/mod-types";
import { modLabel, modSheetHref, roleLabel } from "../../lib/backlog/role-config";
import { sheetMarkdown } from "../../lib/backlog/role-sheet";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";

const MarkdownView = dynamic(() => import("@javadaba/rich-text").then((m) => m.MarkdownView), {
  ssr: false,
  loading: () => <Skeleton className="h-4 w-full" />,
});

/**
 * A mod, explained where it is followed (Cfg-Reference, decided): pressing one in "Mods it follows" opens this modal with
 * what it asks of the role, the other roles that follow it and what it cannot be combined with, without leaving the role.
 * The copy is Fluxor's catalog; the full mod sheet is one link away.
 */
export function ModExplainDialog({
  mod,
  roleId,
  projectId,
  onClose,
}: {
  mod: ModSummary;
  roleId: string;
  projectId: string | null;
  onClose: () => void;
}) {
  const returnFocus = useReturnFocus();
  const repository = useMemo(() => getBacklogRepository(), []);
  const [sheet, setSheet] = useState<ModSheet | null | "failed">(null);
  const role = roleLabel(roleId);
  const others = mod.requiredBy.filter((id) => id !== roleId);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    repository.getMod(projectId, mod.modId).then(
      (value) => !cancelled && setSheet(value),
      () => !cancelled && setSheet("failed"),
    );
    return () => {
      cancelled = true;
    };
  }, [repository, projectId, mod.modId]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{modLabel(mod.modId)}</DialogTitle>
          <DialogDescription>{`A mod changes how a role behaves. ${mod.description}`}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {mod.domains.length > 0 && (
            <div className="flex flex-row flex-wrap gap-1.5">
              {mod.domains.map((domain) => (
                <Badge key={domain} register="tag" tone="neutral" fill="subtle" size="xs">
                  {domain}
                </Badge>
              ))}
            </div>
          )}
          <section className="flex flex-col gap-1.5">
            <Text as="h3" className="text-sm font-bold">{`What it asks of the ${role}`}</Text>
            {sheet === null && projectId && <Skeleton className="h-4 w-5/6" />}
            {sheet === "failed" && <Text className="text-sm text-[color:var(--jd-muted)]">Couldn&apos;t load what it asks. The mod sheet has it.</Text>}
            {sheet !== null && sheet !== "failed" && <MarkdownView markdown={sheetMarkdown(sheet.body)} className="text-sm leading-relaxed" />}
          </section>
          {others.length > 0 && (
            <Text as="p" className="text-sm">
              <strong>Also followed by </strong>
              {others.map(roleLabel).join(", ")}
            </Text>
          )}
          {mod.incompatibleWith.length > 0 && (
            <Text as="p" className="text-sm">
              <strong>Can&apos;t be combined with </strong>
              {mod.incompatibleWith.map(modLabel).join(", ")}
            </Text>
          )}
        </div>
        <DialogFooter>
          <Button asChild register="ui" variant="outline" className="min-h-11">
            <Link href={modSheetHref(mod.modId)}>Open the mod sheet</Link>
          </Button>
          <DialogClose asChild>
            <Button type="button" register="ui" className="min-h-11">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
