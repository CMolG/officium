"use client";

import type { LucideIcon } from "lucide-react";
import { useCallback } from "react";

import { useLazy } from "./use-lazy";

/** One drawn icon per id, loaded alone so a page that shows three icons ships three small chunks. */
const drawn = new Map<string, Promise<LucideIcon | null>>();

type ImportTable = Record<string, () => Promise<{ default: LucideIcon }>>;

/** The component for an id of the installed Lucide, or `null` when that Lucide does not have it. */
export function loadLucideIcon(id: string): Promise<LucideIcon | null> {
  let promise = drawn.get(id);
  if (!promise) {
    promise = import("lucide-react/dynamic").then(
      async ({ dynamicIconImports }) => {
        const table: ImportTable = dynamicIconImports;
        const load = Object.hasOwn(table, id) ? table[id] : undefined;
        return load ? (await load()).default : null;
      },
      (error: unknown) => {
        drawn.delete(id);
        throw error;
      },
    );
    drawn.set(id, promise);
  }
  return promise;
}

/** The Lucide component for an id: `value` is `null` when the installed Lucide lacks it, `undefined` while loading. */
export function useLucideIcon(id: string) {
  const load = useCallback(() => loadLucideIcon(id), [id]);
  return useLazy(load);
}
