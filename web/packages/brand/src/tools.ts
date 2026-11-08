/*
 * tools.ts: the tool marks' data (Library 19, "Tool marks"). Products have illustrated seals; an
 * API and a Tiny Tool share one small, plain mark instead: a disc in their category's tint with
 * the category's icon, and the kind said in words ("API", "Tiny tool"), never told by the shape.
 *
 * The design's `TOOLCAT` and `TOOLS` (web.py), here: eleven categories with one icon and one color
 * each, and the registry slugs that wear a tool mark. Taking a slug out of `TOOLS` returns it to
 * its old seal, which is the one-line rollback the design promises.
 */

export type ToolCategory =
  | "email"
  | "identity"
  | "text"
  | "image"
  | "web"
  | "docs"
  | "jobs"
  | "alerts"
  | "data"
  | "seo"
  | "color";

export type ToolKind = "api" | "tiny";

export interface ToolCategoryMeta {
  readonly name: string;
  /** The key of the Lucide icon in `ICONS`. */
  readonly icon: string;
  readonly color: string;
  /** What goes in it. */
  readonly about: string;
}

export const TOOL_CATEGORIES: Readonly<Record<ToolCategory, ToolCategoryMeta>> = {
  email: { name: "Email", icon: "mail", color: "#5B9BFF", about: "Write, check and send email." },
  identity: {
    name: "Identity and security",
    icon: "shield-check",
    color: "#A78BFA",
    about: "Check who someone is: one-time codes, phones, sign-in.",
  },
  text: { name: "Text", icon: "type", color: "#2DD4BF", about: "Clean, check and transform text." },
  image: {
    name: "Image",
    icon: "image",
    color: "#FACC15",
    about: "Make and change images: QR codes, sizes, crops.",
  },
  web: { name: "Web", icon: "globe", color: "#FBA94C", about: "Read what the web says: user agents, pages, links." },
  docs: {
    name: "Documents",
    icon: "file-text",
    color: "#8B95F9",
    about: "Read, split and join documents and PDFs.",
  },
  jobs: {
    name: "Jobs and talent",
    icon: "briefcase",
    color: "#4ADE80",
    about: "Score CVs, jobs and how well they match.",
  },
  alerts: {
    name: "Alerts and automation",
    icon: "bell",
    color: "#FF7F6E",
    about: "Send notifications and start automations.",
  },
  data: { name: "Connected data", icon: "database", color: "#38BDF8", about: "Query and read the data you connect." },
  seo: { name: "SEO", icon: "search", color: "#F472B6", about: "Write and measure for search engines." },
  color: { name: "Color", icon: "pipette", color: "#A3E635", about: "Pick, convert and check colors." },
};

export interface ToolEntry {
  readonly category: ToolCategory;
  readonly kind: ToolKind;
}

const api = (category: ToolCategory): ToolEntry => ({ category, kind: "api" });

/** Registry slug -> its tool mark. The 21 public APIs, SEO Brain, and the Email editor. */
export const TOOLS: Readonly<Record<string, ToolEntry>> = {
  "email-validate": api("email"),
  "email-editor": { category: "email", kind: "tiny" },
  "phone-validate": api("identity"),
  "verify-issue-code": api("identity"),
  "verify-security-code": api("identity"),
  "text-normalize": api("text"),
  "bad-word-filter": api("text"),
  "html-clean": api("text"),
  "qr-code": api("image"),
  "image-resize": api("image"),
  "ua-lookup": api("web"),
  "ocr-extract": api("docs"),
  "ocr-extract-pdf": api("docs"),
  "job-match": api("jobs"),
  "cv-ats-score": api("jobs"),
  "ghost-job-score": api("jobs"),
  "notify-dispatch": api("alerts"),
  "mail-send": api("alerts"),
  "fluxor-task-intake": api("alerts"),
  "db-query": api("data"),
  "social-metrics": api("data"),
  "seo-package": api("seo"),
  "seo-brain": api("seo"),
};

/** The tool mark of a registry slug, or undefined when it is a product (it keeps its seal). */
export function toolFor(slug: string): ToolEntry | undefined {
  return TOOLS[slug];
}

/** The words that say what a tool is, next to its name. */
export const TOOL_KIND_LABEL: Readonly<Record<ToolKind, string>> = { api: "API", tiny: "Tiny tool" };
