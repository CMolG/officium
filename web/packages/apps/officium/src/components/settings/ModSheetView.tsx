"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@javadaba/ui/navigation";
import { Button, Text } from "@javadaba/ui";

import { ApiError } from "../../lib/backlog/api-error";
import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { ModSheet } from "../../lib/backlog/mod-types";
import { modLabel } from "../../lib/backlog/role-config";
import { useCatalogProject } from "../../lib/backlog/use-mods";
import { ModSheetBody } from "./ModSheetBody";
import { Crumbs, KICKER, SheetLoading } from "./SheetParts";
import { useCopy } from "../../lib/i18n/use-copy";

type Load = { state: "loading" } | { state: "ready"; mod: ModSheet } | { state: "missing" } | { state: "error"; message: string };

/**
 * A mod's sheet (card://JAVA-1569): what the mod asks of an agent, from Fluxor's catalog and read-only here, the mods it
 * cannot be combined with, and the roles that require it, each leading to its own sheet. Read through the person's last
 * project: the catalog is Fluxor's, and the API checks access through one.
 */
export function ModSheetView({ modId }: { modId: string }) {
  const configuration = useCopy().configuration;
  const repository = useMemo(() => getBacklogRepository(), []);
  const projectId = useCatalogProject();
  const [attempt, setAttempt] = useState(0);
  const [read, setRead] = useState<{ key: string; load: Load } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const key = `${projectId}:${modId}:${attempt}`;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    repository.getMod(projectId, modId).then(
      (mod) => !cancelled && setRead({ key, load: { state: "ready", mod } }),
      (err: unknown) => {
        if (cancelled) return;
        const missing = err instanceof ApiError && err.status === 404;
        setRead({ key, load: missing ? { state: "missing" } : { state: "error", message: err instanceof Error ? err.message : "Couldn't reach the Officium API." } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repository, projectId, modId, key]);

  const load: Load = projectId === null ? { state: "error", message: "Mods are read through a project. Create one first." } : read?.key === key ? read.load : { state: "loading" };
  const label = modLabel(modId);

  return (
    <main className="officium-rise mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-6 sm:gap-14 sm:px-6">
      <Crumbs trail={[{ label: configuration.title }, { label: "Roles", href: "/app/configuration/roles" }]} here={label} />
      {load.state === "loading" ? (
        <SheetLoading label={`Loading ${modId}`} />
      ) : load.state === "missing" ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
          <Text className={KICKER}>Not found</Text>
          <Text className="font-semibold">{`There's no mod called "${modId}".`}</Text>
          <Text className="text-sm text-[color:var(--jd-muted)]">Mod names come from Fluxor&apos;s catalog. It may have been renamed.</Text>
          <Button asChild register="ui" variant="outline" className="min-h-11">
            <Link href="/app/configuration/roles">
              <Text>See all roles and mods</Text>
            </Link>
          </Button>
        </div>
      ) : load.state === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
          <Text className="font-semibold">Couldn&apos;t load this mod.</Text>
          <Text className="text-sm text-[color:var(--jd-muted)]">{load.message}</Text>
          <Button
            type="button"
            register="ui"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              heading.current?.focus();
              setAttempt((n) => n + 1);
            }}
          >
            <Text>Try again</Text>
          </Button>
        </div>
      ) : (
        <ModSheetBody mod={load.mod} label={label} />
      )}
    </main>
  );
}
