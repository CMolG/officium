"use client";

import type { Ref } from "react";
import { Button, Glyph, Text } from "@javadaba/ui";

import { PHASE_LABEL } from "../../lib/backlog/role-config";
import type { RoleAtom } from "../../lib/backlog/role-sheet";
import type { Phase } from "../../lib/backlog/types";
import { Inline } from "./CategoryGuideParts";
import { HandNote, KICKER, SectionHead, SheetLoading } from "./SheetParts";

const listFormat = (items: string[]) => new Intl.ListFormat("en", { type: "conjunction" }).format(items);

/**
 * "What it does" on a role's sheet (JAVA-517, card://JAVA-534): what the role must achieve and must not, from the sheet
 * `roles.get` serves. Its own states: loading, the sheet's text, a failed read with its retry (the rest of the sheet
 * stays), and nothing when the sheet has no Phase Contract to show.
 */
export function RoleDoesSection({
  state,
  atom,
  drift,
  message,
  onRetry,
  headingRef,
}: {
  state: "loading" | "error" | "ready";
  atom: RoleAtom | null;
  /** The phases this project's matrix gives the role beyond the ones its sheet names. */
  drift: Phase[];
  message?: string;
  onRetry: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  if (state === "ready" && !atom) return null;
  return (
    <section aria-labelledby="role-does" className="flex flex-col gap-5">
      <div className="flex flex-row flex-wrap items-end justify-between gap-4">
        {/* The heading stays through a retry, so focus has somewhere to go while the section reads again. */}
        <SectionHead id="role-does" headingRef={headingRef}>What it does</SectionHead>
        {state === "ready" && atom && drift.length > 0 && (
          <HandNote
            spoken={`Its atom's Phase Contract names ${listFormat(atom.phases.map((p) => PHASE_LABEL[p]))} only; this project's matrix also gives it ${listFormat(drift.map((p) => PHASE_LABEL[p]))}.`}
          >
            {`atom says ${listFormat(atom.phases.map((p) => (p === "action" ? "Action" : PHASE_LABEL[p])))} only`}
          </HandNote>
        )}
      </div>
      {state === "loading" ? (
        <SheetLoading label="Loading what this role does" />
      ) : state === "error" || !atom ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
          <Text className="font-semibold">Couldn&apos;t load what this role does.</Text>
          <Text className="text-sm text-[color:var(--jd-muted)]">{message}</Text>
          <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={onRetry}>
            <Text>Try again</Text>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[var(--radius-jd-xl)] bg-[color:var(--jd-ok-bg)] p-6">
            <Text id="role-achieve" className={KICKER}>
              Must achieve
            </Text>
            <ul aria-labelledby="role-achieve" className="flex flex-col gap-1">
              {atom.achieve.map((item) => (
                <li key={item} className="flex flex-row items-start gap-3 py-1">
                  <Glyph name="check" size={16} className="mt-1 shrink-0 text-[color:var(--jd-ok)]" />
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[var(--radius-jd-xl)] bg-[color:var(--jd-bad-bg)] p-6">
            <Text id="role-must-not" className={KICKER}>
              Must not
            </Text>
            <ul aria-labelledby="role-must-not" className="flex flex-col gap-1">
              {atom.mustNot.map((item) => (
                <li key={item} className="flex flex-row items-start gap-3 py-1">
                  <Glyph name="x" size={16} className="mt-1 shrink-0 text-[color:var(--jd-bad)]" />
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
