"use client";

import { Link } from "@javadaba/ui/navigation";
import { Button, Text, typeClass } from "@javadaba/ui";

import { CATEGORY_CONFIG, categoryColor, categoryGroup, isCategory } from "../../lib/backlog/category-config";
import { PHASE_LABEL, PHASE_STATUS, SIGNAL_LABEL, SIGNAL_ORDER, roleLabel, roleSheetHref } from "../../lib/backlog/role-config";
import { PHASES } from "../../lib/backlog/role-matrix";
import type { Category, Phase, RoleMatrix } from "../../lib/backlog/types";
import { StatusShape } from "../backlog/StatusShape";
import { ExcludeList, Inline, TickList, parsedGuide } from "./CategoryGuideParts";
import { PhaseRunConfig } from "./PhaseRunConfig";
import { Crumbs, KICKER, SectionHead, SheetLoading } from "./SheetParts";
import { useCategoryMatrix } from "./use-category-matrix";
import { useCopy } from "../../lib/i18n/use-copy";

/** Why a phase has no role by design, in words: an empty cell must not read as a gap. */
const EMPTY_BY_DESIGN: Partial<Record<Category, Partial<Record<Phase, string>>>> = {
  epic: { action: "Never worked directly: it moves as its cards do." },
  routine: { refine: "It skips Refine: it follows its runbook." },
  spike: { deploy: "Nothing to deploy: its answer is written on the card." },
  testing: { deploy: "Never deployed: it's validated in the project's gate." },
};

/** The roles a category's row names in each phase of a matrix. */
function rolesPerPhase(matrix: RoleMatrix, id: Category): { phase: Phase; roles: string[] }[] {
  return PHASES.map((phase) => ({ phase, roles: matrix.categories[id]?.[phase] ?? [] }));
}

/**
 * A category's sheet (JAVA-518, to JAVA-516's design): what kind of work it is, how to tell it
 * from its look-alikes, the contract a card of it follows, and who works it in each phase. The
 * guide ships with the app, so everything but "Who works it" renders at once; the roles are the
 * last-opened project's matrix, which can fail like the role sheet's.
 */
export function CategorySheetView({ categoryId }: { categoryId: string }) {
  if (!isCategory(categoryId)) {
    return (
      <Page label={categoryId}>
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
          <Text className={KICKER}>Not found</Text>
          <Text className="font-semibold">{`There's no category called "${categoryId}".`}</Text>
          <Text className="text-sm text-[color:var(--jd-muted)]">A card is one of fifteen categories, in four groups.</Text>
          <Button asChild register="ui" variant="outline" className="min-h-11">
            <Link href="/app/configuration/categories">
              <Text>All categories</Text>
            </Link>
          </Button>
        </div>
      </Page>
    );
  }
  return <CategorySheet id={categoryId} />;
}

function CategorySheet({ id }: { id: Category }) {
  const { label, hint } = CATEGORY_CONFIG[id];
  const guide = parsedGuide(id);
  const { matrix, project, retry, heading } = useCategoryMatrix();

  return (
    <Page label={label}>
      <header className="flex flex-col gap-10 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <span aria-hidden="true" data-testid="category-rule" className="h-1.5 w-full rounded-full" style={{ background: categoryColor(id) }} />
          <Text className={KICKER}>{`Category · ${categoryGroup(id)}`}</Text>
          <h1 className={`break-words ${typeClass("display-m")}`}>
            {label}
            <span aria-hidden="true" style={{ color: categoryColor(id) }}>
              .
            </span>
          </h1>
          <Text as="p" className="max-w-[34ch] font-[family-name:var(--font-jd-serif)] text-2xl italic leading-tight sm:text-3xl">
            {hint}
          </Text>
          <Text as="p" className="max-w-[62ch] text-base text-[color:var(--jd-muted)]">
            {guide.definition}
          </Text>
        </div>
        <div className="flex w-full min-w-0 flex-col justify-end lg:max-w-md">
          {matrix.state === "ready" ? (
            <RoleCounts id={id} matrix={matrix.value} />
          ) : matrix.state === "loading" ? (
            <SheetLoading label="Loading who works it" />
          ) : null}
        </div>
      </header>

      <section aria-labelledby="category-is" className="flex flex-col gap-5">
        <SectionHead id="category-is">Is it this category?</SectionHead>
        <div className="flex flex-col rounded-[var(--radius-jd-xl)] border border-[color:var(--jd-line)] md:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-6">
            <Text id="category-signals" className={KICKER}>
              It is, when you read
            </Text>
            <ul aria-labelledby="category-signals" className="flex flex-row flex-wrap gap-2">
              {guide.signals.map((signal) => (
                <li key={signal} className="rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] px-2 py-1.5 text-sm">
                  <Text>{signal}</Text>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 border-t border-[color:var(--jd-line)] p-6 md:border-t-0 md:border-l">
            <Text id="category-excludes" className={KICKER}>
              It isn&apos;t, when
            </Text>
            <ExcludeList category={id} labelledBy="category-excludes" />
          </div>
        </div>
      </section>

      <section aria-labelledby="category-contract" className="flex flex-col gap-5">
        <SectionHead id="category-contract">The contract</SectionHead>
        <div className="flex flex-col rounded-[var(--radius-jd-xl)] border border-[color:var(--jd-line)] md:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-6">
            <Text id="category-entry" className={KICKER}>
              Before work starts
            </Text>
            <TickList items={guide.entry} labelledBy="category-entry" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 border-t border-[color:var(--jd-line)] p-6 md:border-t-0 md:border-l">
            <Text id="category-exit" className={KICKER}>
              Done means
            </Text>
            <TickList items={guide.exit} labelledBy="category-exit" />
          </div>
        </div>
        <div className="flex flex-col gap-2 px-1">
          <Text id="category-behavior" className={KICKER}>
            How it&apos;s worked
          </Text>
          <TickList items={guide.behavior} labelledBy="category-behavior" glyph="dot" />
        </div>
      </section>

      <section aria-labelledby="category-roles" className="flex flex-col gap-5">
        <SectionHead id="category-roles" headingRef={heading}>
          Who works it
        </SectionHead>
        {matrix.state === "error" ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
            <Text className="font-semibold">Couldn&apos;t load who works this category.</Text>
            <Text className="text-sm text-[color:var(--jd-muted)]">{matrix.message}</Text>
            <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={retry}>
              <Text>Try again</Text>
            </Button>
          </div>
        ) : matrix.state === "loading" ? (
          <SheetLoading label="Loading who works it" />
        ) : (
          <>
            <Text as="p" className="max-w-[62ch] text-sm text-[color:var(--jd-muted)]">
              {project
                ? `As ${project.name}'s role matrix sets it. Left to right is a card's path across the board.`
                : "As the default role matrix sets it. Left to right is a card's path across the board."}
            </Text>
            <PhaseTrack id={id} matrix={matrix.value} />
            <SignalsAdd matrix={matrix.value} />
          </>
        )}
      </section>

      <footer className="flex flex-col items-start gap-4 border-t border-[color:var(--jd-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Text as="p" className="max-w-[56ch] text-sm text-[color:var(--jd-muted)]">
          This contract is the one agents read in <code className="font-[family-name:var(--font-jd-kicker)]">meta.states</code>. It is
          fixed in the server and not edited here.
        </Text>
        <Button asChild register="ui" variant="outline" className="min-h-11">
          <Link href="/app/configuration/categories">
            <Text>
              {"All categories "}
              <Text aria-hidden="true">→</Text>
            </Text>
          </Link>
        </Button>
      </footer>
    </Page>
  );
}

function Page({ label, children }: { label: string; children: React.ReactNode }) {
  const configuration = useCopy().configuration;
  return (
    <main className="officium-rise mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-6 sm:gap-14 sm:px-6">
      <Crumbs trail={[{ label: configuration.title }, { label: "Categories", href: "/app/configuration/categories" }]} here={label} />
      {children}
    </main>
  );
}

/** Roles per phase as quantized cells, one per role, filled in the category's colour. */
function RoleCounts({ id, matrix }: { id: Category; matrix: RoleMatrix }) {
  const perPhase = rolesPerPhase(matrix, id);
  const slots = Math.max(6, ...perPhase.map((p) => p.roles.length));
  const total = perPhase.reduce((sum, p) => sum + p.roles.length, 0);
  const described = perPhase.map(({ phase, roles }) => `${PHASE_LABEL[phase]} ${roles.length}`).join(", ");
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div role="img" aria-label={`Roles per phase: ${described}.`} data-testid="category-role-counts" className="flex flex-col gap-2">
        {perPhase.map(({ phase, roles }) => (
          <div key={phase} className="flex flex-row items-center gap-2.5">
            <div className="flex w-20 shrink-0 flex-row items-center gap-1.5">
              <StatusShape status={PHASE_STATUS[phase]} className="size-3.5 shrink-0" />
              <Text className="truncate font-[family-name:var(--font-jd-kicker)] text-[10px] font-bold uppercase tracking-wider text-[color:var(--jd-muted)]">
                {phase === "action" ? "Action" : PHASE_LABEL[phase]}
              </Text>
            </div>
            <div className="flex min-w-0 flex-1 flex-row gap-0.5">
              {Array.from({ length: slots }, (_, i) => (
                <div
                  key={i}
                  className={`aspect-square min-w-0 max-w-8 flex-1 rounded-sm border ${i < roles.length ? "border-transparent" : "border-[color:var(--jd-line)]"}`}
                  style={i < roles.length ? { background: categoryColor(id) } : undefined}
                />
              ))}
            </div>
            <Text className="w-5 shrink-0 text-right font-[family-name:var(--font-jd-kicker)] text-xs">{roles.length}</Text>
          </div>
        ))}
      </div>
      <Text className="font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--jd-muted)]">
        {`${total} ${total === 1 ? "role" : "roles"} across its path`}
      </Text>
    </div>
  );
}

/** The workflow left to right, one polygon per phase, the roles that work the category in each. */
function PhaseTrack({ id, matrix }: { id: Category; matrix: RoleMatrix }) {
  return (
    <ol aria-label="Phases" className="flex flex-col overflow-hidden rounded-[var(--radius-jd-xl)] border border-[color:var(--jd-line)] lg:flex-row">
      {rolesPerPhase(matrix, id).map(({ phase, roles }, i) => (
        <li
          key={phase}
          data-testid="category-phase"
          data-phase={phase}
          className={`flex min-w-0 flex-1 flex-col gap-3 p-4 ${i > 0 ? "border-t border-[color:var(--jd-line)] lg:border-t-0 lg:border-l" : ""} ${roles.length === 0 ? "bg-muted" : ""}`}
        >
          <div className="flex flex-row items-center gap-2">
            <StatusShape status={PHASE_STATUS[phase]} className="size-5 shrink-0" />
            <Text className="min-w-0 flex-1 font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.2em]">
              {PHASE_LABEL[phase]}
            </Text>
          </div>
          <PhaseRunConfig run={matrix.runs?.[id]?.[phase] ?? null} />
          {roles.length > 0 ? (
            <ul className="flex flex-row flex-wrap gap-1.5">
              {roles.map((role) => (
                <li key={role} className="flex max-w-full flex-row">
                  <Link
                    href={roleSheetHref(role)}
                    data-testid="category-role"
                    data-role={role}
                    className="flex min-h-11 max-w-full flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] py-1 pr-3 pl-2.5 text-sm font-medium hover:border-[color:var(--jd-control-border)]"
                  >
                    <span aria-hidden="true" className="size-2 shrink-0 rotate-45 border-[1.5px] border-[color:var(--jd-accent-ink)]" />
                    <Text className="min-w-0 break-words">{roleLabel(role)}</Text>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Text className="text-sm text-[color:var(--jd-muted)]">{EMPTY_BY_DESIGN[id]?.[phase] ?? "No role in this phase."}</Text>
          )}
        </li>
      ))}
    </ol>
  );
}

/** A signal brings its roles to a card of ANY category: what it adds on top of the row above. */
function SignalsAdd({ matrix }: { matrix: RoleMatrix }) {
  const added = SIGNAL_ORDER.flatMap((signal) =>
    PHASES.filter((phase) => (matrix.signals[signal]?.[phase]?.length ?? 0) > 0).map((phase) => ({
      signal,
      phase,
      roles: matrix.signals[signal]![phase]!,
    })),
  );
  if (added.length === 0) return null;
  return (
    <div className="flex flex-row flex-wrap items-center gap-2.5">
      <Text id="category-signals-add" className={KICKER}>
        Signals add
      </Text>
      <ul aria-labelledby="category-signals-add" className="flex flex-row flex-wrap gap-2">
        {added.map(({ signal, phase, roles }) => (
          <li
            key={`${signal}/${phase}`}
            className="rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] px-2 py-1.5 font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.12em]"
          >
            <Inline text={`${SIGNAL_LABEL[signal]} → ${PHASE_LABEL[phase]}: ${roles.map(roleLabel).join(", ")}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
