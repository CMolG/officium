/**
 * The icon a new page gets from its title (Doc-Sections, "A new page gets an icon", JAVA-1765): the first word of the
 * title that names a thing the wiki is about. Shown before the page is created and changeable; a title that says nothing
 * of the sort keeps the plain page icon.
 */
export const DEFAULT_PAGE_ICON = "file-text";

const WORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["database", ["database", "databases", "backup", "backups", "postgres", "sql", "schema", "migration", "migrations"]],
  ["server", ["server", "servers", "deploy", "deploys", "deployment", "infrastructure", "hosting", "kubernetes", "docker"]],
  ["shield", ["security", "auth", "authentication", "permissions", "access", "privacy", "compliance", "gdpr"]],
  ["bug", ["bug", "bugs", "incident", "incidents", "postmortem", "debugging", "outage"]],
  ["layers", ["architecture", "design", "system", "overview", "stack"]],
  ["map", ["roadmap", "plan", "plans", "strategy", "vision"]],
  ["list-checks", ["checklist", "checklists", "runbook", "runbooks", "process", "onboarding", "release", "releases"]],
  ["users", ["team", "teams", "people", "hiring", "meeting", "meetings", "customers", "support"]],
  ["calendar", ["schedule", "calendar", "sprint", "sprints", "planning", "retro", "retrospective"]],
  ["code", ["api", "apis", "sdk", "code", "coding", "frontend", "backend", "testing", "tests"]],
  ["book-text", ["guide", "guides", "handbook", "glossary", "documentation", "docs", "faq", "how-to", "tutorial"]],
  ["zap", ["performance", "speed", "cache", "caching", "scaling"]],
  ["gauge", ["metrics", "monitoring", "observability", "analytics", "kpi", "kpis"]],
  ["flag", ["goals", "goal", "okr", "okrs", "milestone", "milestones"]],
];

const BY_WORD = new Map<string, string>(WORDS.flatMap(([icon, words]) => words.map((word) => [word, icon] as const)));

export function iconFromTitle(title: string): string {
  for (const word of title.toLowerCase().split(/[^a-z0-9-]+/)) {
    const found = BY_WORD.get(word);
    if (found) return found;
  }
  return DEFAULT_PAGE_ICON;
}
