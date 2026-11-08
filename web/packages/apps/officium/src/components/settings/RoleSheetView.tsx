"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "@javadaba/account";
import { Link } from "@javadaba/ui/navigation";
import { Button, Select, Skeleton, Text, typeClass } from "@javadaba/ui";

import { ApiError } from "../../lib/backlog/api-error";
import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { readRecents } from "../../lib/backlog/last-project";
import type { BoardCard } from "../../lib/backlog/board-copy";
import { useOpenCards } from "../backlog/board/use-open-cards";
import { refreshProjectList, useProjectList } from "../../lib/backlog/project-list";
import { readRoleMatrix } from "../../lib/backlog/role-matrix-cache";
import { DEFAULT_ROLE_MATRIX, PHASE_VERB, roleLabel } from "../../lib/backlog/role-config";
import { mainPhase, roleCells, roleSignalCells, roleSuggestions, unnamedPhases } from "../../lib/backlog/role-matrix";
import { parseRoleSheet } from "../../lib/backlog/role-sheet";
import type { Project, RoleMatrix, RoleSheet } from "../../lib/backlog/types";
import { RoleEligibleCards } from "./RoleEligibleCards";
import { RoleDoesSection } from "./RoleDoesSection";
import { RoleFingerprint } from "./RoleFingerprint";
import { RoleModsSection } from "./RoleModsSection";
import { RolePhaseTrack } from "./RolePhaseTrack";
import { Crumbs, KICKER, SectionHead, SheetLoading } from "./SheetParts";
import { useCopy } from "../../lib/i18n/use-copy";

type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "error"; message: string };

/** `roles.get` as the page reads it: the sheet, `unknown` for an id the catalog lacks (404 unknown_role), or a failed read. */
type SheetRead = { state: "loading" } | { state: "ready"; sheet: RoleSheet } | { state: "unknown" } | { state: "error"; message: string };

function errorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) return "This project doesn't exist, or you're not one of its members.";
  return err instanceof Error ? err.message : "Couldn't reach the Officium API.";
}

/**
 * A role's sheet (JAVA-517, to JAVA-516's design): what the role does, from its atom in Fluxor's
 * catalog, and where it works under a project's role matrix -- the fingerprint, the phase track,
 * the signals that bring it in, and the cards it can take right now. When the sheet can't be read, its section says
 * so and offers a retry: no text is invented in its place (card://JAVA-534).
 */
export function RoleSheetView({ roleId }: { roleId: string }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const projects = useProjectList();
  const { session } = useAuthSession();
  const accountId = session?.accountId;
  const open = useMemo(() => projects?.filter((p) => p.archivedAt === null) ?? null, [projects]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // A retry unmounts its button into a skeleton: focus goes to the section's heading first (WCAG 2.4.3).
  const worksHeading = useRef<HTMLHeadingElement>(null);
  const doesHeading = useRef<HTMLHeadingElement>(null);
  const cardsHeading = useRef<HTMLHeadingElement>(null);
  const retry = (heading: React.RefObject<HTMLHeadingElement | null>) => {
    heading.current?.focus();
    setAttempt((n) => n + 1);
  };
  // Each answer is kept with the read it answers, so a new project or a retry reads as loading
  // until its own answer arrives.
  const [matrixRead, setMatrixRead] = useState<{ key: string; load: Load<RoleMatrix> } | null>(null);
  // card://JAVA-1569: the role's sheet itself, from Fluxor's catalog through the API (`roles.get`).
  const [sheetRead, setSheetRead] = useState<{ key: string; read: SheetRead } | null>(null);

  // The project the sheet is read against: the one picked here, else the last one opened.
  const project: Project | null = useMemo(() => {
    if (!open || open.length === 0) return null;
    const recent = readRecents(accountId).find((id) => open.some((p) => p.id === id));
    return open.find((p) => p.id === (chosen ?? recent)) ?? open[0];
  }, [open, chosen, accountId]);
  const projectId = project?.id ?? null;
  const openCards = useOpenCards({ projectId, repository });

  // The shared list swallows a failed first load into an empty one; asking here tells "no
  // projects" (the default table applies) from "couldn't read them", sharing the list's request.
  const [listError, setListError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    refreshProjectList(repository).then(
      () => !cancelled && setListError(null),
      (err: unknown) => !cancelled && setListError(err instanceof Error ? err.message : "Couldn't reach the Officium API."),
    );
    return () => {
      cancelled = true;
    };
  }, [repository, attempt]);

  const readKey = `${projectId}:${roleId}:${attempt}`;
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    const key = `${projectId}:${roleId}:${attempt}`;
    readRoleMatrix(repository, projectId).then(
      (view) => !cancelled && setMatrixRead({ key, load: { state: "ready", value: view.effective } }),
      (err: unknown) => !cancelled && setMatrixRead({ key, load: { state: "error", message: errorText(err) } }),
    );
    repository.getRole(projectId, roleId).then(
      (sheet) => !cancelled && setSheetRead({ key, read: { state: "ready", sheet } }),
      (err: unknown) =>
        !cancelled &&
        setSheetRead({
          key,
          read:
            err instanceof ApiError && err.code === "unknown_role"
              ? { state: "unknown" }
              : { state: "error", message: errorText(err) },
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, roleId, repository, attempt]);
  const matrix: Load<RoleMatrix> = matrixRead?.key === readKey ? matrixRead.load : { state: "loading" };
  // The role's eligible open cards, from the board's copy (JAVA-1633): `eligibleRoles` is on each card's face.
  const cards: Load<BoardCard[]> = openCards.cards
    ? { state: "ready", value: openCards.cards.filter((card) => card.eligibleRoles.includes(roleId)) }
    : openCards.error
      ? { state: "error", message: openCards.error }
      : { state: "loading" };

  // With no project at all, the default table is the one there is; with projects nobody could
  // read, it isn't, and the sheet says so instead of passing the default off as the answer.
  const effective: Load<RoleMatrix> =
    open && open.length === 0
      ? listError
        ? { state: "error", message: `Your projects couldn't be read: ${listError}` }
        : { state: "ready", value: DEFAULT_ROLE_MATRIX }
      : matrix;
  const sheetState: SheetRead = sheetRead?.key === readKey ? sheetRead.read : { state: "loading" };
  const sheet = sheetState.state === "ready" ? sheetState.sheet : null;
  const atom = sheet ? parseRoleSheet(sheet.body) : null;
  const label = roleLabel(roleId);
  const named = effective.state === "ready" && roleCells(effective.value, roleId).length + roleSignalCells(effective.value, roleId).length > 0;
  const tabled = roleSuggestions(DEFAULT_ROLE_MATRIX).includes(roleId);

  // The catalog says no such role: a role the default table or the project's table names is one whose sheet isn't
  // written yet, and anything else is not a role. A failed read can't tell the two apart, so it is not "not found".
  if (sheetState.state === "unknown" && !tabled && !named && effective.state !== "error") {
    // Only a project's own table can still name it: wait for it before saying it doesn't exist.
    if (open === null || effective.state === "loading") {
      return (
        <Page label={label}>
          <SheetLoading label={`Loading ${roleId}`} />
        </Page>
      );
    }
    return (
      <Page label={roleId}>
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
          <Text className={KICKER}>Not found</Text>
          <Text className="font-semibold">{`There's no role called "${roleId}".`}</Text>
          <Text className="text-sm text-[color:var(--jd-muted)]">Role names come from Fluxor&apos;s catalog. It may have been renamed.</Text>
          <Button asChild register="ui" variant="outline" className="min-h-11">
            <Link href="/app/configuration/roles">
              <Text>See all roles</Text>
            </Link>
          </Button>
        </div>
      </Page>
    );
  }

  const worked = effective.state === "ready" ? effective.value : null;
  const main = mainPhase(worked ?? DEFAULT_ROLE_MATRIX, roleId);
  const drift = worked && atom ? unnamedPhases(worked, roleId, atom.phases) : [];
  const description = sheet ? (atom?.mission ?? sheet.description) : null;

  return (
    <Page label={label}>
      <header className="flex flex-col gap-10 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Text className={KICKER}>{`Role · ${main ? PHASE_VERB[main] : "Unassigned"} · From Fluxor's catalog`}</Text>
          <h1 className={`break-words ${typeClass("display-m")}`}>
            {label}
            <span aria-hidden="true" className="text-[color:var(--jd-accent-ink)]">
              .
            </span>
          </h1>
          {sheetState.state === "loading" ? (
            <Skeleton className="h-10 w-2/3" />
          ) : sheetState.state === "unknown" ? (
            <>
              <Text as="p" className="max-w-[34ch] font-[family-name:var(--font-jd-serif)] text-2xl italic leading-tight sm:text-3xl">
                Its description isn&apos;t written yet.
              </Text>
              <Text as="p" className="max-w-[62ch] text-base text-[color:var(--jd-muted)]">
                Until it is, this role works a card under the Phase Contract that card states.
              </Text>
            </>
          ) : sheet ? (
            <>
              <Text as="p" className="max-w-[34ch] font-[family-name:var(--font-jd-serif)] text-2xl italic leading-tight sm:text-3xl">
                {atom?.title ?? sheet.title}
              </Text>
              <Text as="p" className="max-w-[62ch] text-base text-[color:var(--jd-muted)]">
                {description}
              </Text>
            </>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 flex-col justify-end lg:max-w-md">
          {effective.state === "ready" ? (
            <RoleFingerprint matrix={effective.value} defaults={DEFAULT_ROLE_MATRIX} role={roleId} />
          ) : effective.state === "loading" ? (
            <SheetLoading label="Loading where this role works" />
          ) : null}
        </div>
      </header>

      <RoleDoesSection
        state={sheetState.state === "loading" ? "loading" : sheetState.state === "error" ? "error" : "ready"}
        atom={atom}
        drift={drift}
        message={sheetState.state === "error" ? sheetState.message : undefined}
        onRetry={() => retry(doesHeading)}
        headingRef={doesHeading}
      />

      <RoleModsSection roleId={roleId} projectId={projectId} body={sheet?.body ?? null} />

      <section aria-labelledby="role-works" className="flex flex-col gap-5">
        <SectionHead id="role-works" headingRef={worksHeading}>Where it works</SectionHead>
        {effective.state === "error" ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
            <Text className="font-semibold">Couldn&apos;t load where this role works.</Text>
            <Text className="text-sm text-[color:var(--jd-muted)]">{effective.message}</Text>
            <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={() => retry(worksHeading)}>
              <Text>Try again</Text>
            </Button>
          </div>
        ) : effective.state === "loading" ? (
          <SheetLoading label="Loading where this role works" />
        ) : (
          <RolePhaseTrack matrix={effective.value} role={roleId} project={project} />
        )}
      </section>

      {project && (
        <section aria-labelledby="role-cards" className="flex flex-col gap-5">
          <div className="flex flex-row flex-wrap items-end justify-between gap-4">
            <SectionHead id="role-cards" headingRef={cardsHeading}>Cards it can take now</SectionHead>
            {open && open.length > 1 && (
              <Select
                aria-label="Project"
                value={project.id}
                onChange={setChosen}
                options={open.map((p) => ({ value: p.id, label: p.name }))}
                className="min-h-11 w-full sm:w-64"
              />
            )}
          </div>
          <RoleEligibleCards
            cards={cards}
            project={project}
            onRetry={() => {
              retry(cardsHeading);
              void openCards.catchUp();
            }}
          />
        </section>
      )}

      <footer className="flex flex-col items-start gap-4 border-t border-[color:var(--jd-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Text as="p" className="max-w-[56ch] text-sm text-[color:var(--jd-muted)]">
          What this role does is written in Fluxor&apos;s catalog and is read-only here. Which cards it works is set per project.
        </Text>
        {project?.role === "owner" && (
          <Button asChild register="ui" variant="outline" className="min-h-11">
            <Link href={`/app/configuration/p/${project.id}/work-profile`}>
              <Text>
                {`Change it for ${project.name} `}
                <Text aria-hidden="true">→</Text>
              </Text>
            </Link>
          </Button>
        )}
      </footer>
    </Page>
  );
}

function Page({ label, children }: { label: string; children: React.ReactNode }) {
  const configuration = useCopy().configuration;
  return (
    // Inside <main>, the sheet's <header> and <footer> are its own, not a second page banner and contentinfo.
    <main className="officium-rise mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-6 sm:gap-14 sm:px-6">
      <Crumbs trail={[{ label: configuration.title }, { label: "Roles", href: "/app/configuration/roles" }]} here={label} />
      {children}
    </main>
  );
}
