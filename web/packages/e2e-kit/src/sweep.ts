/*
 * The element contract, swept over a whole page.
 *
 * `rules/interface-psychology.md` §1 and §2 say every actionable element is visible, has an
 * accessible name, takes keyboard focus, and acts — or is disabled with its reason visible. The
 * scars are on file: the landing's dead `SETTINGS` button, focusable and clickable since it was
 * written with nothing behind it, and the half-dead dropdown of [[JDB-140]].
 *
 * Two halves, deliberately separate:
 *
 *   - `sweepActionable()` REPORTS. It never asserts, so a suite can sweep a surface it does not
 *     own yet, print the report, and decide what is a bug versus what is known debt.
 *   - `expectSweepClean()` ASSERTS. A suite opts into severity; the kit does not choose for it.
 *
 * What it does NOT check is whether the element ACTS — that needs a per-surface expectation
 * (which URL, which `aria-expanded`, which request) and belongs in the app's own spec.
 */
import { expect, type Locator, type Page } from "@playwright/test";

/** The roles that promise an interaction. Anything painted like these must behave like these. */
export const ACTIONABLE_ROLES = [
  "button",
  "link",
  "textbox",
  "combobox",
  "checkbox",
  "tab",
  "menuitem",
] as const;

export type ActionableRole = (typeof ACTIONABLE_ROLES)[number];

export interface ElementReport {
  role: ActionableRole;
  /** The accessible name Playwright computes — the same one `getByRole({ name })` matches on. */
  name: string;
  /** Empty when the element honours the contract. */
  problems: string[];
  disabled: boolean;
  /** Enough of the outer HTML to find the thing in the source. */
  html: string;
}

export interface SweepReport {
  url: string;
  /** Every visible actionable element found, in role order. */
  elements: ElementReport[];
  /** The subset with at least one problem. */
  problems: ElementReport[];
}

export interface SweepOptions {
  /** Restrict the sweep to part of the page (a nav, a dialog, one panel). Defaults to the page. */
  root?: Locator;
  roles?: readonly ActionableRole[];
  /** Focus each element to prove it is keyboard reachable. Costs a round trip per element. */
  checkFocus?: boolean;
  /** Accessible names that are known-and-accepted misses, by role. */
  ignore?: RegExp[];
  /**
   * Ceiling per role. A sweep is a check, not a crawl: a page with 800 links in a footer would
   * turn one assertion into a two-minute test and nobody would run it.
   */
  limit?: number;
}

/** `- button "Save"` → `Save`. Playwright's own aria snapshot, so its own name computation. */
function accessibleNameFrom(snapshot: string): string {
  const firstLine = snapshot.split("\n", 1)[0] ?? "";
  const quoted = firstLine.match(/"((?:[^"\\]|\\.)*)"/);
  return quoted ? quoted[1].replace(/\\"/g, '"') : "";
}

async function inspect(
  locator: Locator,
  role: ActionableRole,
  options: Required<Pick<SweepOptions, "checkFocus" | "ignore">>,
): Promise<ElementReport | null> {
  if (!(await locator.isVisible())) return null;
  // Inside `inert` a control is out of the tab order and ignores the pointer ON PURPOSE (a folded
  // `FloatingTray`'s body, clipped out of view): not actionable, so not held to the contract.
  // `isVisible` can't tell -- it ignores the clip -- and flagged Officium's /app tray (JAVA-131).
  if (await locator.evaluate((el) => el.closest("[inert]") !== null).catch(() => false)) return null;

  const read = () =>
    Promise.all([
      locator.ariaSnapshot().catch(() => ""),
      locator.evaluate((el) => el.outerHTML.slice(0, 160)).catch(() => ""),
    ]);

  let [snapshot, html] = await read();
  let name = accessibleNameFrom(snapshot);
  if (!name.trim()) {
    // Poll for the name to settle, for the same race the focus check below polls for, and for
    // the same reason: a control whose label arrives with hydration or with the session settling
    // reads as unnamed if it is inspected mid-render. Measured on curriculum's family landing
    // (`/jobs/backend`), red once and green on the next three runs with no code change in
    // between — and the failure's own aria snapshot showed every link on the page named.
    // Both reads are redone on every attempt, not just the name: reporting the markup from
    // before the re-render would name the wrong element. A control with no name at all fails
    // every attempt alike, and the poll reports that once the shared ceiling elapses.
    try {
      await expect
        .poll(async () => {
          [snapshot, html] = await read();
          name = accessibleNameFrom(snapshot);
          return name.trim();
        })
        .not.toBe("");
    } catch {
      /* still unnamed once the ceiling elapses: genuinely missing a name */
    }
  }
  const disabled = !(await locator.isEnabled().catch(() => true));
  const problems: string[] = [];

  if (!name.trim()) problems.push("no accessible name");

  // A disabled control is not keyboard reachable BY DESIGN (HTML removes it from the tab
  // order), so demanding focus of it would report the platform working as specified. What a
  // disabled control owes is its reason, and that is a per-surface assertion.
  if (options.checkFocus && !disabled) {
    // BOTH conditions, and the second one is the whole point: `el.focus()` succeeds on a
    // `tabindex="-1"` element, so checking `document.activeElement` alone calls a control
    // keyboard-reachable when TAB will never land on it. That is exactly [[JDB-140]] — the nav
    // dropdown that "does not take keyboard focus" — and a check that misses its own scar is
    // worse than no check. Native controls report `tabIndex === 0` without declaring it.
    const tryFocus = () =>
      locator
        .focus()
        .then(() => locator.evaluate((el) => el === document.activeElement && el.tabIndex >= 0))
        .catch(() => false);
    let focusable = await tryFocus();
    if (!focusable) {
      // Poll, re-resolving the locator on every attempt: a hydration or session-resolve
      // re-render can replace the node between `focus()` and the `activeElement` read —
      // measured on curriculum's public sweep, where `/auth/me` settling mid-sweep failed a
      // different element on each run. A control that is truly unreachable never turns true,
      // and the poll below reports that once the shared ceiling elapses.
      focusable = await expect
        .poll(tryFocus)
        .toBe(true)
        .then(() => true)
        .catch(() => false);
    }
    if (!focusable) problems.push("not keyboard focusable");
  }

  const report: ElementReport = { role, name, problems, disabled, html };
  if (options.ignore.some((re) => re.test(name) || re.test(html))) report.problems = [];
  return report;
}

/**
 * Enumerate every visible actionable element on the page and check the contract on each.
 * Reports; never fails.
 */
export async function sweepActionable(
  page: Page,
  options: SweepOptions = {},
): Promise<SweepReport> {
  const {
    root,
    roles = ACTIONABLE_ROLES,
    checkFocus = true,
    ignore = [],
    limit = 120,
  } = options;
  const scope = root ?? page.locator("body");
  const elements: ElementReport[] = [];

  for (const role of roles) {
    const found = await scope.getByRole(role).all();
    for (const locator of found.slice(0, limit)) {
      const report = await inspect(locator, role, { checkFocus, ignore });
      if (report) elements.push(report);
    }
  }

  return { url: page.url(), elements, problems: elements.filter((e) => e.problems.length > 0) };
}

/** One line per offender, with the markup, so a failure names the element instead of a count. */
export function formatSweepReport(report: SweepReport): string {
  if (report.problems.length === 0) return `${report.url}: ${report.elements.length} elements, 0 problems`;
  const lines = report.problems.map(
    (e) => `  [${e.role}] "${e.name || "(unnamed)"}" — ${e.problems.join("; ")}\n    ${e.html}`,
  );
  return `${report.url}: ${report.problems.length}/${report.elements.length} actionable elements fail the contract\n${lines.join("\n")}`;
}

/**
 * The assertion form. Also asserts the sweep FOUND something: a page where every locator
 * silently matched nothing would otherwise pass as perfect.
 */
export function expectSweepClean(report: SweepReport, minElements = 1): void {
  expect(report.elements.length, `${report.url}: no actionable element found at all`).toBeGreaterThanOrEqual(minElements);
  expect(report.problems, formatSweepReport(report)).toEqual([]);
}
