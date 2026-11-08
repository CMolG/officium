import type { ComponentProps, ElementType, ReactNode } from "react";
import { Doodle, type KidDoodle } from "@javadaba/brand/doodles";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { Button } from "./button";
import { Glyph } from "./glyph";
import { limitPlaces, type MachineLink, type NotFoundPlace } from "./not-found.shared";

/*
 * NotFound: the standard 404 (Lib-Pieces § Not found · the standard). Every 404 says where to go: the
 * heading, one sentence that ends by counting the places, five or six places chosen for the address (the
 * product's own first), "tell us" always last, and the files machines read. Never only a "Back home" button.
 *
 * It is the VIEW. The route answers a real 404 (or 410), never indexed, never 200 with an error drawn on it;
 * an `Accept: application/json` request gets `notFoundPayload` from `not-found.shared.ts`, the same list as data.
 * Search goes above the places when the product has one. An empty search or a filter with no results is NOT a
 * 404: it is an `EmptyState`.
 */

export interface NotFoundSearch {
  /** Where the form goes (GET). */
  action: string;
  /** The field's name in the query string. Default `q`. */
  name?: string;
  /** Its accessible name: "Search your projects". */
  label: string;
  placeholder: string;
  /** The button: "Search". */
  submit: string;
}

export interface NotFoundProps extends Omit<ComponentProps<"section">, "title"> {
  /** "Error 404" */
  code?: string;
  /** "That page is not here." (or what is missing: a post, a station). */
  heading: ReactNode;
  /** The sentence that says why, and ends by counting the places. */
  children: ReactNode;
  /** The product's places first, closest to the address that failed; then Javadaba's core places. */
  places: NotFoundPlace[];
  /** "If a link of ours sent you here, tell us." Always the last row. */
  tellUs?: NotFoundPlace;
  /** The files machines read; the line is hidden only if a product has none. */
  machine?: MachineLink[];
  /** "Crawling us?" */
  machineLabel?: string;
  /** The name of the places list for assistive tech. */
  placesLabel?: string;
  search?: NotFoundSearch;
  /** The kid beside the heading. A product with art of its own passes `art` instead. */
  doodle?: KidDoodle;
  art?: ReactNode;
  /** The link element: `a` by default; an app passes its router's link (it receives `href`). */
  linkComponent?: ElementType;
}

const ROW =
  "flex min-h-14 flex-col gap-1 border-b border-[color:var(--jd-ink)]/16 px-2 py-[15px] text-[color:var(--jd-ink)] no-underline " +
  "transition-colors duration-[var(--jd-dur-fast)] hover:bg-[color:var(--jd-ink)]/4 min-[600px]:flex-row min-[600px]:items-baseline min-[600px]:gap-6 " +
  "[&:hover_.nf-title]:underline [&:hover_.nf-title]:decoration-2 [&:hover_.nf-title]:underline-offset-[5px] " +
  FOCUS_RING;

export function NotFound({
  code = "Error 404",
  heading,
  children,
  places,
  tellUs,
  machine = [],
  machineLabel = "Crawling us?",
  placesLabel = "Places worth trying",
  search,
  doodle,
  art,
  linkComponent: Link = "a",
  className,
  ...rest
}: NotFoundProps) {
  const rows = limitPlaces(places, tellUs);
  return (
    <section data-jd-component="NotFound" className={cn("flex min-w-0 flex-col gap-[18px] text-[color:var(--jd-ink)]", className)} {...rest}>
      {art ?? (doodle ? <Doodle name={doodle} decorative size="page" /> : null)}
      <span className="text-[11px] font-bold uppercase tracking-[0.16em]">{code}</span>
      <h1 className="m-0 font-[family-name:var(--font-jd-display)] text-[40px] font-bold leading-none tracking-[-0.01em] min-[600px]:text-[60px]">{heading}</h1>
      <p className="m-0 max-w-[64ch] text-base leading-[1.6] text-[color:var(--jd-muted)]">{children}</p>
      {search && (
        <form role="search" action={search.action} method="get" className="m-0 flex max-w-[560px] flex-row gap-2">
          <label className="flex min-h-12 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-xl px-3.5 text-[color:var(--jd-muted)] shadow-[inset_0_0_0_1px_var(--jd-control-border)] focus-within:text-[color:var(--jd-ink)] focus-within:shadow-[inset_0_0_0_2px_var(--jd-ink)]">
            <span className="sr-only">{search.label}</span>
            <Glyph name="search" size={16} />
            <input
              type="search"
              name={search.name ?? "q"}
              placeholder={search.placeholder}
              className="min-w-0 flex-1 border-0 text-base text-[color:var(--jd-ink)] outline-none placeholder:text-[color:var(--jd-faint)]"
            />
          </label>
          <Button type="submit" register="ui" size="lg">
            {search.submit}
          </Button>
        </form>
      )}
      <nav aria-label={placesLabel} className="m-0 flex flex-col border-t border-[color:var(--jd-ink)]/16 p-0">
        {rows.map((place) => (
          <Link key={place.href} href={place.href} className={ROW}>
            <span className="nf-title font-[family-name:var(--font-jd-display)] text-[23px] font-bold leading-[1.1] tracking-[-0.01em] min-[600px]:flex-[1_1_0%]">{place.title}</span>
            <span className="text-sm leading-normal text-[color:var(--jd-muted)] min-[600px]:flex-[1.15_1_0%]">{place.description}</span>
          </Link>
        ))}
      </nav>
      {machine.length > 0 && (
        <p className="m-0 flex flex-row flex-wrap items-center gap-x-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--jd-muted)]">
          <span>{machineLabel}</span>
          {machine.map((file, index) => (
            <span key={file.href} className="contents">
              {index > 0 && (
                <i aria-hidden="true" className="not-italic opacity-50">
                  ·
                </i>
              )}
              {/* Plain <a>: a sitemap or a JSON file is not a route, and the client router has no business with it. */}
              <a
                href={file.href}
                className={cn("inline-flex min-h-11 flex-row items-center text-[color:var(--jd-ink)] underline decoration-1 underline-offset-4 hover:decoration-2", FOCUS_RING)}
              >
                {file.label}
              </a>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
