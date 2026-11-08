import type { ReactNode, Ref } from "react";
import { Link } from "@javadaba/ui/navigation";
import { LoadingRegion, Skeleton, Text } from "@javadaba/ui";

/**
 * The pieces a settings sheet is built from (JAVA-516's design): the kicker, a section's
 * heading under a short accent rule, the ruled two-column pair, the breadcrumb and the
 * hand-lettered note. Shared by the role sheet and the roles index.
 */

export const KICKER = "font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--jd-muted)]";

/** With `headingRef`, the heading can take focus: a retry sends it there before its button unmounts
 *  into a skeleton, so keyboard focus is not dropped onto the page (WCAG 2.4.3). */
export function SectionHead({ id, headingRef, children }: { id?: string; headingRef?: Ref<HTMLHeadingElement>; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span aria-hidden="true" className="h-1 w-9 rounded-full bg-[color:var(--jd-accent)]" />
      <h2
        id={id}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="font-[family-name:var(--font-jd-kicker)] text-sm font-bold uppercase tracking-[0.22em]"
      >
        {children}
      </h2>
    </div>
  );
}

/** Settings / Roles / <here>. Each link padded to a 44 px target: a breadcrumb is navigation,
 *  not text inside a sentence. "Settings" has no page of its own, so it is not a link. */
export function Crumbs({ trail, here }: { trail: { label: string; href?: string }[]; here: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={`flex flex-row flex-wrap items-center gap-x-2 ${KICKER}`}>
        {trail.map((crumb) => (
          <li key={crumb.label} className="flex flex-row items-center gap-x-2">
            {crumb.href ? (
              <Link href={crumb.href} className="-mx-1 flex min-h-11 flex-row items-center px-1 hover:underline">
                <Text>{crumb.label}</Text>
              </Link>
            ) : (
              <Text className="flex min-h-11 flex-row items-center">{crumb.label}</Text>
            )}
            <Text aria-hidden="true">/</Text>
          </li>
        ))}
        <li className="flex min-h-11 flex-row items-center">
          <Text aria-current="page" className="text-[color:var(--jd-ink)]">
            {here}
          </Text>
        </li>
      </ol>
    </nav>
  );
}

/**
 * A note written by hand beside what it annotates (`app-widget.md`, the accent as ink): the
 * handwritten face at 28 px or more, never smaller. What it says for a screen reader is `spoken`,
 * the whole sentence, because "+1 here" alone means nothing out loud.
 */
export function HandNote({ children, spoken, className }: { children: ReactNode; spoken: string; className?: string }) {
  return (
    <Text className={className} title={spoken}>
      <Text aria-hidden="true" className="font-[family-name:var(--font-jd-hand)] text-3xl leading-none text-[color:var(--jd-accent-ink)]">
        {children}
      </Text>
      <Text className="sr-only">{spoken}</Text>
    </Text>
  );
}

/** The stand-in while a settings sheet loads: three static bones, the label printed under them. Static on purpose: nothing moves. */
export function SheetLoading({ label }: { label: string }) {
  return (
    <LoadingRegion
      loading
      showLabel
      label={`${label}…`}
      className="flex flex-col gap-3"
      fallback={
        <div className="flex flex-col gap-3">
          <Skeleton shape="block" className="h-11 w-2/5" />
          <Skeleton className="w-3/4" />
          <Skeleton className="w-1/2" />
        </div>
      }
    />
  );
}
