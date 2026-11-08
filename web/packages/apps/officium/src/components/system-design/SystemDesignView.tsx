"use client";

import { useMemo } from "react";
import { Link } from "@javadaba/ui/navigation";
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger, Text } from "@javadaba/ui";
import { Pencil } from "lucide-react";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { docsPath } from "../../lib/backlog/search-links";
import { parseSystemDesign } from "../../lib/system-design/parse";
import { SYSTEM_DESIGN_PATH } from "../../lib/system-design/types";
import { SystemaObservatory } from "../systema/SystemaObservatory";
import { MapEmpty } from "./MapEmpty";
import { MapError } from "./MapError";
import { MapInvalid } from "./MapInvalid";
import { MapLoading } from "./MapLoading";
import { SystemMap } from "./SystemMap";
import { useSystemPage } from "./use-system-page";

/**
 * System design (JAVA-58, experimental): a read-only map of the project's system, drawn on the
 * shared canvas engine from the ```system-design block of the documentation page `system-design`.
 * It follows that page live, so an agent's edit redraws it.
 */
export function SystemDesignView({ projectId }: { projectId: string }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const { project, state, retry, create, creating, createError } = useSystemPage(projectId, repository);
  const editHref = docsPath(projectId, SYSTEM_DESIGN_PATH);
  const parsed = useMemo(() => (state.status === "ready" ? parseSystemDesign(state.page.body) : null), [state]);

  let body;
  if (state.status === "error") body = <MapError message={state.message} onRetry={retry} />;
  else if (state.status === "loading" || (state.status === "missing" && project === null)) body = <MapLoading />;
  else if (state.status === "missing") {
    body = <MapEmpty canWrite={project?.role !== "viewer"} creating={creating} error={createError} onCreate={() => void create()} />;
  } else if (parsed && !parsed.ok) body = <MapInvalid problems={parsed.problems} editHref={editHref} />;
  else if (parsed) body = <SystemMap model={parsed.model} />;

  return (
    <div className="officium-rise flex h-full min-h-0 w-full flex-col gap-4 py-6">
      <header className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 px-4 sm:px-6">
        <h1 className="font-[family-name:var(--font-jd-display)] text-[28px] font-bold leading-none">System design</h1>
        <Badge register="tag" tone="info" fill="subtle" size="xs">
          <Text>Experimental</Text>
        </Badge>
        <Badge register="tag" tone="neutral" fill="subtle" size="xs">
          <Text>Read only</Text>
        </Badge>
        <Text as="p" className="basis-full text-sm text-[color:var(--jd-muted)] lg:basis-auto lg:flex-1">
          The project&apos;s system, drawn from its system-design documentation page.
        </Text>
        <Link href={editHref} className="-mx-1 flex min-h-11 flex-row items-center gap-1.5 px-1 text-sm font-medium text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)]">
          <Pencil size={14} aria-hidden="true" />
          <Text>Edit the map</Text>
        </Link>
      </header>
      <Tabs defaultValue="map" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="mx-4 self-start sm:mx-6">
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="observatory">Observatory</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="flex min-h-0 flex-1 flex-col">
          {body}
        </TabsContent>
        <TabsContent value="observatory">
          <SystemaObservatory projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
