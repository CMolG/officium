"use client";

import { cardPath } from "../../lib/backlog/search-links";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter, useSearchParams } from "@javadaba/ui/navigation";
import { useAuthSession } from "@javadaba/account";
import { FolderPlus, Plug, Plus } from "lucide-react";
import { JavadabaLogo } from "@javadaba/brand";

import { Button, EmptyState, LoadingRegion, Note, Skeleton } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { loadHomeFigures, loadProjectGlances, type HomeFigures as Figures, type ProjectGlance } from "../../lib/backlog/home-metrics";
import { readRecents } from "../../lib/backlog/last-project";
import type { Folder, Project } from "../../lib/backlog/types";
import { configurationPath } from "../../lib/configuration/places";
import type { StorageUsage } from "../../lib/backlog/storage-usage";
import { refreshProjectList, useProjectList } from "../../lib/backlog/project-list";
import { refreshFolderList } from "../../lib/backlog/folder-list";
import { NeedsYouLane, type NeedsYouItem } from "../backlog/NeedsYouLane";
import { AgentWorkAcrossProjects } from "./AgentWorkAcrossProjects";
import { ArchivedProjects } from "./ArchivedProjects";
import { FolderMenuScope } from "./FolderMenuScope";
import { FolderTree } from "./FolderTree";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { HomeFigures } from "./HomeFigures";
import { ProjectMenuScope } from "./ProjectMenuScope";
import { ProjectTile } from "./ProjectTile";
import { UsageMeter } from "./UsageMeter";
import { IS_LOCAL } from "../../lib/edition";

/**
 * `/officium/app` -- the projects home (JDB-225), redrawn as the dashboard the owner asked for (Off-Home): the
 * usage meter that names the plan, what needs you across projects, the figures that exist, the projects as tiles
 * with the agents working in each, and the archived ones at the bottom. A folder tree beside it, only inside the
 * desktop's window (the page has the workspace sidebar). Replaces the single hardcoded board JDB-223 mounted here
 * directly; the board itself lives at `/app/p/[projectId]`.
 */
export function ProjectsHomeSurface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repository = useMemo(() => getBacklogRepository(), []);
  const { session } = useAuthSession();
  const [folders, setFolders] = useState<Folder[] | null>(null);
  // The shared list, not a copy: a project deleted from the menu leaves this page at once (JAVA-1554).
  const projects = useProjectList();
  const [archived, setArchived] = useState<Project[]>([]);
  const [needsYou, setNeedsYou] = useState<NeedsYouItem[]>([]);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [figures, setFigures] = useState<Figures | null>(null);
  const [glances, setGlances] = useState<Record<string, ProjectGlance>>({});
  const [working, setWorking] = useState<Record<string, number>>({});
  // One reading of the clock per visit: "Updated 2 min ago" is a sentence about when the page was drawn.
  const [now] = useState(() => Date.now());
  // Kept in the URL (`?folder=`), not only in local state: a browser back/forward from a
  // project's board must land back on the SAME folder, not reset to "All projects".
  const selectedFolderId = searchParams.get("folder");
  const selectFolder = useCallback(
    (id: string | null) => {
      router.replace(id ? `/app?folder=${id}` : "/app");
    },
    [router],
  );
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  // Height the agent-work tray covers at the bottom; the projects' scroll area pads by it (JAVA-120).
  const [trayInset, setTrayInset] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [nextFolders, nextProjects] = await Promise.all([refreshFolderList(), refreshProjectList()]);
      setFolders(nextFolders);
      const perProject = await Promise.all(
        nextProjects.map(async (p) => {
          const cards = await repository.cardsNeedsHuman(p.id, true);
          return cards.map((card): NeedsYouItem => ({ card, projectId: p.id, projectName: p.name }));
        }),
      );
      setNeedsYou(perProject.flat());
      setLoadError(null);
      // The allowance, the figures and what sits beside them are information, not the page: a failure leaves them out.
      repository.getUsage().then(setUsage, () => setUsage(null));
      loadHomeFigures().then(setFigures, () => setFigures(null));
      loadProjectGlances(nextProjects.map((p) => p.id)).then(setGlances, () => setGlances({}));
      repository.listWorkingEverywhere().then(
        (all) => setWorking(Object.fromEntries(all.map(({ project, items }) => [project.id, items.length]))),
        () => setWorking({}),
      );
    } catch (err) {
      // Offline/API down (JDB-226 acceptance criterion): an error state, not an empty home.
      setLoadError(err instanceof Error ? err.message : "Couldn't reach the Officium API.");
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The archived ones are read again whenever the live list changes: archiving a project (from its menu, which
  // knows nothing of this page) or restoring one both move it between the two.
  useEffect(() => {
    if (projects === null) return;
    let stale = false;
    repository.listProjects({ archived: true }).then(
      (all) => !stale && setArchived(all.filter((p) => p.archivedAt)),
      () => !stale && setArchived([]),
    );
    return () => {
      stale = true;
    };
  }, [repository, projects]);

  // `?q=` is the 404 page's search ("Search your projects"): it narrows the home to the projects whose name or key matches.
  const query = (searchParams.get("q") ?? "").trim();
  const needle = query.toLowerCase();
  const visibleProjects = (projects ?? []).filter((p) =>
    needle ? p.name.toLowerCase().includes(needle) || p.keyPrefix.toLowerCase().includes(needle) : p.folderId === selectedFolderId,
  );
  const recentProjects = readRecentProjects(projects ?? [], session?.accountId);
  const folderName = (folders ?? []).find((f) => f.id === selectedFolderId)?.name;
  const heading = query ? `Projects matching “${query}”` : selectedFolderId === null ? "All projects" : (folderName ?? "Projects");
  const needsYouHere = needsYou.filter((item) => (projects ?? []).some((p) => p.id === item.projectId));

  return (
    // `relative`: same reason as `Board`'s root -- absolutely positioned `sr-only` labels must
    // be clipped by this box, not measured against the viewport.
    //
    // Below `md` it is a document: it grows and the shell's scroll box scrolls it, the way `Board`
    // does below `lg` (JAVA-59). As a fixed box on a phone, the folder tree stacked above the
    // projects took whatever height it needed and the projects' own scroll area was left none.
    <div className="officium-rise relative flex min-h-full flex-col md:h-full md:min-h-0 md:overflow-hidden">
      <header className="flex flex-row shrink-0 flex-wrap items-center gap-3 border-b border-[color:var(--jd-line)] px-4 py-3 sm:px-6">
        {/* The same identity the product page's bar wears (`ProductNavBar`): the seal and the
            Doto wordmark closed by the accent period. Under that bar (`data-chrome="product"`, set by
            `AppShellClient`) it would be the same logo twice in a row, so it stays only as the page's
            heading for assistive tech. */}
        <h1 className="flex flex-row min-w-0 items-center gap-2.5 group-data-[chrome=product]/shell:sr-only">
          <JavadabaLogo brand="officium" size={26} title="Officium" />
          <span className="truncate font-[family-name:var(--font-jd-display)] text-xl font-bold uppercase leading-none tracking-tight text-[color:var(--jd-ink)] md:text-2xl">
            Officium<span className="text-[color:var(--jd-accent-mark)]">.</span>
          </span>
        </h1>
        {usage && !IS_LOCAL && <UsageMeter usage={usage} />}
        <div className="ml-auto flex flex-row flex-wrap items-center gap-2">
          <Button type="button" register="ui" variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus size={14} /> New folder
          </Button>
          <Button asChild type="button" register="ui" variant="outline" size="sm">
            <Link href={configurationPath("integrations")}>
              <Plug size={14} /> Connect an agent
            </Link>
          </Button>
          <Button type="button" register="ui" size="sm" onClick={() => setCreateProjectOpen(true)}>
            <Plus size={14} /> New project
          </Button>
        </div>
      </header>

      <NeedsYouLane items={needsYouHere} onOpen={(item) => router.push(cardPath(item.projectId, item.card.key))} />

      <div className="flex flex-1 flex-col md:min-h-0 md:flex-row md:overflow-hidden">
        {/* The folders live in the workspace sidebar's tree, under All Projects (JAVA-52): one tree,
            not two. This column is only for the desktop's window (`data-chrome="framed"`), where
            the shell mounts no sidebar at all -- the window is the chrome there. */}
        <nav
          aria-label="Project folders"
          className="w-full shrink-0 border-b border-[color:var(--jd-line)] p-3 group-data-[chrome=product]/shell:hidden md:w-64 md:overflow-y-auto md:border-b-0 md:border-r"
        >
          {folders ? (
            <FolderMenuScope
              folders={folders}
              projects={projects ?? []}
              repository={repository}
              onChanged={(deleted) => {
                void refresh();
                if (deleted && deleted.id === selectedFolderId) selectFolder(deleted.parentId);
              }}
            >
              <FolderTree folders={folders} selectedFolderId={selectedFolderId} onSelect={selectFolder} />
            </FolderMenuScope>
          ) : (
            <p className="text-sm text-[color:var(--jd-muted)]">Loading…</p>
          )}
        </nav>

        <ProjectMenuScope projects={projects ?? []} repository={repository} label="Projects">
        <main
          className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-4 sm:px-6 md:min-h-0 md:overflow-y-auto"
          style={trayInset ? { paddingBottom: trayInset } : undefined}
        >
          <HomeFigures figures={figures} waiting={needsYouHere.map((item) => item.card)} now={now} />

          {recentProjects.length > 0 && selectedFolderId === null && !query && (
            <section aria-labelledby="home-recent-heading">
              <h2 id="home-recent-heading" className="mb-3 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">Recent</h2>
              <ProjectGrid projects={recentProjects} working={working} glances={glances} now={now} />
            </section>
          )}

          <section aria-labelledby="home-projects-heading">
            <h2 id="home-projects-heading" className="mb-3 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">{heading}</h2>
            {loadError ? (
              <div className="flex flex-col items-start gap-3" role="alert">
                <Note tone="danger" role="presentation">
                  <b className="font-semibold">Couldn't load your projects.</b> {loadError}
                </Note>
                <Button type="button" register="ui" onClick={() => void refresh()}>
                  Try again
                </Button>
              </div>
            ) : projects === null ? (
              <LoadingRegion loading label="Loading your projects">
                <div className="flex flex-row flex-wrap gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} shape="block" className="h-36 min-w-64 grow basis-64 rounded-[var(--radius-jd-bento-m)]" />
                  ))}
                </div>
              </LoadingRegion>
            ) : visibleProjects.length === 0 ? (
              projects.length === 0 ? (
                <EmptyState
                  doodle="point"
                  title="Welcome to Officium."
                  action={
                    <Button type="button" register="ui" size="sm" onClick={() => setCreateProjectOpen(true)}>
                      <Plus size={14} /> Create your first project
                    </Button>
                  }
                  secondary={
                    <a href="/developers/docs/officium-mcp" className="text-sm font-semibold underline underline-offset-4">
                      <span>How agents connect</span>
                    </a>
                  }
                >
                  <span>A project holds one backlog. Start one, then connect your coding agent to it.</span>
                </EmptyState>
              ) : (
                <EmptyState
                  title={folderName ? `Nothing in ${folderName} yet.` : "Nothing here yet."}
                  action={
                    // Distinct wording from the header's own "New project" (not just repeated) --
                    // also avoids two same-named buttons on screen at once while a folder is
                    // empty, which would be ambiguous for anyone navigating by name (assistive
                    // tech included).
                    <Button type="button" register="ui" variant="outline" size="sm" onClick={() => setCreateProjectOpen(true)}>
                      <Plus size={14} /> Create a project
                    </Button>
                  }
                >
                  <span>Create a project here, or move one in from its menu.</span>
                </EmptyState>
              )
            ) : (
              <ProjectGrid projects={visibleProjects} working={working} glances={glances} now={now} />
            )}
          </section>

          {selectedFolderId === null && <ArchivedProjects projects={archived} repository={repository} onRestored={() => void refresh()} />}
        </main>
        </ProjectMenuScope>
      </div>

      {/* Below `md` this root grows and the shell scrolls it, so the tray docks to the screen
          there instead of to this box's bottom, mid-page (JAVA-422). */}
      <AgentWorkAcrossProjects
        repository={repository}
        onOpen={(projectId, cardKey) => router.push(cardPath(projectId, cardKey))}
        onInsetChange={setTrayInset}
        dock="screen-below-md"
      />

      {createFolderOpen && (
        <CreateFolderDialog
          parentId={selectedFolderId}
          onClose={() => setCreateFolderOpen(false)}
          onCreate={async (input) => {
            const folder = await repository.createFolder(input);
            setCreateFolderOpen(false);
            selectFolder(folder.id);
            await refresh();
          }}
        />
      )}
      {createProjectOpen && (
        <CreateProjectDialog
          folderId={selectedFolderId}
          existingPrefixes={[...(projects ?? []), ...archived].map((p) => p.keyPrefix)}
          onClose={() => setCreateProjectOpen(false)}
          onCreate={async (input) => {
            const created = await repository.createProject(input);
            setCreateProjectOpen(false);
            await refresh();
            // A new project opens its board (Off-Flows, "A new project opens its board"), where Connect an agent waits.
            router.push(`/app/p/${created.id}`);
          }}
        />
      )}
    </div>
  );
}

function readRecentProjects(projects: Project[], accountId?: string): Project[] {
  const ids = readRecents(accountId);
  return ids.map((id) => projects.find((p) => p.id === id)).filter((p): p is Project => Boolean(p));
}

// A declared grid exception (`scripts/native-subset.baseline.json`): auto-fit sizes its columns
// from the container, and a wrapped flex row stretches a partial last row instead of keeping it
// at column width. On Android this is a FlatList whose `numColumns` comes from its own width.
function ProjectGrid({
  projects,
  working,
  glances,
  now,
}: {
  projects: Project[];
  /** Agents at work per project id. */
  working: Record<string, number>;
  glances: Record<string, ProjectGlance>;
  now: number;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
      {projects.map((project) => (
        <ProjectTile key={project.id} project={project} working={working[project.id] ?? 0} glance={glances[project.id]} now={now} />
      ))}
    </div>
  );
}
