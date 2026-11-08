"use client";

import { useCatalogProject } from "../backlog/use-mods";

/**
 * The project Configuration works on (JAVA-1626): the one in the address, else the one picked in the selector, else the
 * catalog's (the last project opened, else the first live one). `undefined` while the list loads, `null` with none.
 */
export function useConfigProject(urlProjectId: string | null, picked: string | null): string | null | undefined {
  const catalog = useCatalogProject();
  return urlProjectId ?? picked ?? catalog;
}
