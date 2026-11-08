"use client";

import { useMemo, useState, useEffect } from "react";
import { Link, useRouter, useSearchParams } from "@javadaba/ui/navigation";
import { ArrowLeft } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@javadaba/ui";

import { ProjectBadgeSelect } from "../projects/ProjectBadgeSelect";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { Project, Sprint } from "../../lib/backlog/types";
import { ReportView } from "./ReportView";
import { MetricsPanel } from "./MetricsPanel";
import { ValuePanel } from "./ValuePanel";
import { IS_LOCAL } from "../../lib/edition";
import { CloudLocked } from "../cloud/CloudLocked";

/**
 * Contributions (JAVA-55/56): the project's delivery and time metrics, a period-to-period
 * comparison, and -- folded in from the old standalone `/report` route (JAVA-52) -- the Time
 * report, kept under its own name inside this view's "Time report" tab.
 */
export function ContributionsView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repository = useMemo(() => getBacklogRepository(), []);
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab === "report" || requestedTab === "value" ? requestedTab : "metrics";

  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([repository.getProject(projectId), repository.listSprints(projectId)]).then(
      ([proj, sprintList]) => {
        if (cancelled) return;
        setProject(proj);
        setSprints(sprintList);
        setLoadError(null);
      },
      (err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Couldn't reach the Officium API.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository]);

  function setTab(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next === "metrics") params.delete("tab");
    else params.set("tab", next);
    router.push(`/app/p/${projectId}/contributions${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="officium-rise mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-row flex-wrap items-center gap-3">
        <Link href={`/app/p/${projectId}`} className="flex min-h-11 flex-row items-center gap-1 text-sm font-medium text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)]">
          <ArrowLeft size={14} aria-hidden="true" /> Board
        </Link>
        <span className="h-4 w-px bg-[color:var(--jd-line)]" aria-hidden="true" />
        <h1 className="text-lg font-bold">Contributions</h1>
        <ProjectBadgeSelect projectId={projectId} project={project} />
      </div>

      {loadError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
          <p className="text-sm font-semibold">Couldn't load this project</p>
          <p className="text-sm text-[color:var(--jd-muted)]">{loadError}</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="value">Value</TabsTrigger>
            <TabsTrigger value="report">Time report</TabsTrigger>
          </TabsList>
          <TabsContent value="metrics">
            <MetricsPanel projectId={projectId} sprints={sprints} />
          </TabsContent>
          <TabsContent value="value">
            {IS_LOCAL ? <CloudLocked feature="value" /> : <ValuePanel projectId={projectId} />}
          </TabsContent>
          <TabsContent value="report" className="print:mt-0">
            {/* Everything above this tab's own content prints hidden -- ReportView already hides
                itself down to the table; this hides the page chrome around it. */}
            <div className="print:hidden" />
            {IS_LOCAL ? <CloudLocked feature="timeReport" /> : <ReportView projectId={projectId} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

