/*
 * The ecosystem links and the launcher apps: the one copy the bar, the footer and the Javadaba menu
 * paint. Split out of the old product-chrome.tsx (JAVA-1621) so the menu can live in its own file
 * (`.claude/rules/architecture.md`, no monolith files).
 */

import type { ElementType } from "react";

/** A link in the chrome. `plain` forces `<a>` even when the app passed its own `<Link>`. */
export interface ProductNavLink {
  label: string;
  href: string;
  /** Crosses a zone (another `basePath`, another origin): never routed by the app's Link. */
  plain?: boolean;
}

/**
 * The ecosystem's five links, in the order the company's own bar uses them.
 *
 * Declared here —in the package every product already depends on— instead of once per
 * app, which is how Curriculum ended up still pointing at `/desarrolladores` and
 * `/acerca-de` four days after the English migration renamed both routes. They still work
 * (`next.config.mjs` 301s them) but every click pays a redirect nobody meant to buy.
 *
 * There is a second declaration of the same five, and it is deliberate rather than an
 * oversight: `javadaba-landing/src/components/site/nav-links.ts` → `GLOBAL_LINKS`, which
 * is the COMPANY's own bar. Collapsing them was tried and dropped: `nav-links.ts` is
 * imported by a Playwright spec as pure logic, and pulling a `node_modules` TypeScript
 * module into it breaks that transform. So the landing owns the routes, this owns what
 * products paint, and each file points at the other — a duplication you can see beats one
 * you can't. Changing a route means changing both.
 */
export const JAVADABA_LINKS: readonly ProductNavLink[] = [
  { label: "Home", href: "/", plain: true },
  { label: "Apps", href: "/catalogue", plain: true },
  { label: "Blog", href: "/blog", plain: true },
  { label: "API", href: "/developers", plain: true },
  { label: "About", href: "/about", plain: true },
] as const;

/**
 * The rest of the house, as the Javadaba menu lists it under the launcher (Lib-Chrome): all apps,
 * the desktop, pricing and the calendar. Product pages and the footer use `JAVADABA_LINKS`; the menu
 * is the one place that names the desktop. Plain links: each route lives in another zone.
 */
export const JAVADABA_MENU_LINKS: readonly ProductNavLink[] = [
  { label: "All apps", href: "/catalogue", plain: true },
  { label: "Desktop", href: "/desktop", plain: true },
  { label: "Pricing", href: "/pricing", plain: true },
  { label: "Calendar", href: "/calendar", plain: true },
] as const;

/** An app in the launcher grid. `slug` is what supplies the seal. */
export interface ProductAppLink {
  /** Brand registry slug (`sonus`, `aura`, …). */
  slug: string;
  name: string;
  href: string;
}

/**
 * The apps the launcher offers: the ones **in production for everyone** — the entries of
 * `javadaba-landing/src/lib/catalog.ts` with `releaseStage: "released"`, in its
 * `ORDEN_PRODUCCION` order. The catalog remains the source: this is the copy the PRODUCTS
 * paint, the same arrangement as `JAVADABA_LINKS` and for the same reason, and
 * `scripts/test/javadaba-apps.test.mjs` fails the moment the two disagree (JAVA-202).
 *
 * Until 2026-09-27 this was a hand-picked list that offered Aura, Quaestio and Creatio —
 * admin-only doors that refuse everyone else — and left out Officium, which ships.
 *
 * What stays out on purpose: anything geo-restricted. Tributa is `servedOnlyIn: "ES"`, and its
 * rule says that outside Spain it is **not shown at all**. This module cannot resolve geo, so
 * the default fails CLOSED. A caller that HAS resolved geo passes its own `apps` list.
 */
export const JAVADABA_APPS: readonly ProductAppLink[] = [
  { slug: "fabula", name: "Fabula", href: "/fabula" },
  { slug: "curriculum", name: "Curriculum", href: "/curriculum" },
  { slug: "officium", name: "Officium", href: "/officium" },
  { slug: "sonus", name: "Sonus", href: "/sonus" },
  { slug: "fluxor", name: "Fluxor", href: "/fluxor/app" },
  // `/quaestio` itself 308s to its catalogue page, so the launcher opens the tool.
  { slug: "quaestio", name: "Quaestio", href: "/quaestio/app" },
] as const;

/** Resolves a link to the app's router or to a bare `<a>`, per `plain`. */
export function linkTag(link: ProductNavLink, linkAs: ElementType): ElementType {
  return link.plain ? "a" : linkAs;
}

/**
 * React key for a link. Label AND href, not href alone: `/dev` mounts the gallery sample
 * with every `href="#"`, and keying on the href turned five links into one duplicate-key
 * error. A nav with two identical label+href pairs is a bug in the caller's data.
 */
export function linkKey(link: ProductNavLink): string {
  return `${link.label}·${link.href}`;
}

