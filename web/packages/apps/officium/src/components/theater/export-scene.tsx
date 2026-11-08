"use client";

import { Download } from "lucide-react";

import { Badge, Text } from "@javadaba/ui";
import { MoreButton } from "@javadaba/ui/feedback";

import { SectionHeading } from "../backlog/SectionHeading";
import { ProjectNotice } from "../projects/ProjectNotice";
import { ExportFiles } from "./export-files";
import { ExportMenu } from "./export-menu";
import { EXPORT_PROOF } from "./export-script";
import { SAMPLE_LABEL } from "./export-sample";
import { useExportScript } from "./use-export-script";

/**
 * The leave-anytime scene: one project's More menu, its "Export backlog" row, and the cards leaving as
 * Markdown files. Officium's own pieces on sample data, labelled as sample; the export itself is never
 * run, so no file is downloaded and no request is made.
 */
export function ExportScene() {
  const script = useExportScript();

  return (
    <ExportMenu onExport={script.startExport}>
      <div className="@container flex h-full min-h-0 flex-col gap-4 p-4">
        <section aria-label="Export the backlog" className="flex min-h-0 flex-1 flex-col gap-3">
          {/* On a phone the badge goes under the heading: the Theater's pause pill sits in the top-right corner. */}
          <div className="flex flex-col items-start gap-2 @2xl:flex-row @2xl:items-center">
            <SectionHeading icon={<Download size={16} />}>Leave with every card</SectionHeading>
            <Badge register="tag" tone="neutral" fill="subtle">
              {SAMPLE_LABEL}
            </Badge>
          </div>
          {/* On a phone the Theater prints this caption under the frame already; the file needs the room. */}
          <Text className="hidden text-sm text-[color:var(--jd-muted)] @2xl:block">
            Pick Export backlog in a project&apos;s menu and every card leaves as its own Markdown file, comments and plan
            included, in one .zip.
          </Text>
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] px-3">
            <span className="min-w-0 truncate text-sm font-medium">Storefront</span>
            <MoreButton aria-label="More actions for Storefront" />
          </div>
          <ExportFiles
            listed={script.listed}
            filed={script.filed}
            opened={script.opened}
            scrolled={script.scrolled}
          />
          <ProjectNotice />
        </section>
        <Text className="text-xs text-[color:var(--jd-muted)]">{EXPORT_PROOF.sentence}</Text>
      </div>
    </ExportMenu>
  );
}
