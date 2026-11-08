/*
 * What a report says about WHERE it came from (doc://contracts/feedback-api, "Metadata object").
 *
 * Pure: the element and an `env` object in, plain JSON out, so a test feeds it a fixture tree.
 * Nothing the person typed is read: an input, a textarea or an editable region contributes its
 * identity (selector, label), never its value or its text.
 */

export interface FeedbackMetadata {
  component?: { name?: string; source?: string; chain?: string[]; selector?: string; text?: string };
  access: { surface?: string; app?: string; route?: string; url?: string; desktopWindow?: string };
  context: {
    appVersion?: string;
    commit?: string;
    locale?: string;
    theme?: string;
    viewport?: string;
    userAgent?: string;
    sessionKind: "signed-in" | "anonymous";
    at: string;
  };
}

/** What the layer knows that the DOM under the pointer cannot say. */
export interface FeedbackEnv {
  app?: string;
  surface?: string;
  route?: string;
  url?: string;
  desktopWindow?: string;
  appVersion?: string;
  commit?: string;
  locale?: string;
  theme?: string;
  viewport?: string;
  userAgent?: string;
  signedIn: boolean;
  now: Date;
}

const CLIP = 120;
const CHAIN_MAX = 32;

const clip = (value: string, max = CLIP) => {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

const isTyped = (el: Element) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  (el instanceof HTMLElement && el.isContentEditable);

/** `button#save.primary` -- a tag, an id and one class, enough for a person to find the spot. */
function shortSelector(el: Element): string {
  const id = el.id ? `#${el.id}` : "";
  const first = el.classList.item(0);
  return `${el.tagName.toLowerCase()}${id}${first && !id ? `.${first}` : ""}`;
}

function selectorPath(el: Element): string {
  const parts: string[] = [];
  for (let node: Element | null = el; node && parts.length < 3 && node.tagName !== "BODY"; node = node.parentElement) {
    parts.unshift(shortSelector(node));
  }
  return parts.join(" > ");
}

/** The nearest heading before or around the element: the "which section" a landmark gives. */
function nearestHeading(el: Element): string | undefined {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const heading = node.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > header h1, :scope > header h2");
    if (heading?.textContent) return clip(heading.textContent, 60);
  }
  return undefined;
}

function landmarkName(el: Element): string {
  const owner = el.closest("[role], [aria-label]");
  const role = owner?.getAttribute("role") ?? (owner ?? el).tagName.toLowerCase();
  const label = owner?.getAttribute("aria-label") ?? undefined;
  const heading = label ? undefined : nearestHeading(el);
  return [role, label ?? heading].filter(Boolean).join(": ");
}

/** The component identity: stamps nearest first with the chain, else a DOM landmark. */
function componentOf(target: Element): FeedbackMetadata["component"] {
  const stamped = target.closest("[data-jd-component]");
  const selector = selectorPath(target);
  const text =
    isTyped(target) || target.closest("[contenteditable='true']") || target.querySelector("input, textarea, select, [contenteditable]:not([contenteditable='false'])")
      ? undefined : clip(target.textContent ?? "", 80);
  if (!stamped) return { name: landmarkName(target), selector, ...(text ? { text } : {}) };

  const chain: string[] = [];
  for (let node: Element | null = stamped; node && chain.length < CHAIN_MAX; node = node.parentElement?.closest("[data-jd-component]") ?? null) {
    chain.push(node.getAttribute("data-jd-component") ?? "");
  }
  return {
    name: chain[0],
    source: stamped.closest("[data-jd-source]")?.getAttribute("data-jd-source") ?? undefined,
    chain,
    selector,
    ...(text ? { text } : {}),
  };
}

export function collectMetadata(target: Element, env: FeedbackEnv): FeedbackMetadata {
  return {
    component: componentOf(target),
    access: {
      surface: env.surface,
      app: env.app,
      route: env.route,
      // A reset or OAuth link carries a token in its query: only where the person was, never what it carried.
      url: env.url?.split(/[?#]/)[0],
      desktopWindow: env.desktopWindow,
    },
    context: {
      appVersion: env.appVersion,
      commit: env.commit,
      locale: env.locale,
      theme: env.theme,
      viewport: env.viewport,
      userAgent: env.userAgent,
      sessionKind: env.signedIn ? "signed-in" : "anonymous",
      at: env.now.toISOString(),
    },
  };
}

/** The element a report is about: the nearest stamped component, else the landmark the name comes from. */
export function reportedElement(target: Element): Element {
  const root = target instanceof SVGElement && target.ownerSVGElement ? target.ownerSVGElement : target;
  return root.closest("[data-jd-component]") ?? root.closest("[role], [aria-label]") ?? root;
}
