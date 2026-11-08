/**
 * The Configuration section (JAVA-1626): which page is which section, and how a link to one is built. Pure, so the
 * sidebar, the layout, the link sweep and the unit specs read the same table.
 */

export const CONFIGURATION_ROOT = "/app/configuration";

/** The Documentation changelog section of Integrations: the anchor the changelog's button lands on (JAVA-1663). */
export const PIPELINE_SECTION_ID = "documentation-changelog";

/** The sections that belong to one project: their address carries the project id. */
export const PROJECT_SECTIONS = [
  "work-profile",
  "integrations",
  "documentation",
  "form-languages",
  "work-rules",
  "precedence",
  "integration-gate",
  "sharing",
  "capabilities",
  "wake-reasons",
  "glossary",
] as const;

/** The sections that belong to the account or to the catalog: their address has no project. */
export const REFERENCE_SECTIONS = ["organization", "roles", "categories"] as const;

/** The project sections that also have an address without a project: the account's agent connection lives there. */
export const PROJECTLESS_SECTIONS = ["integrations"] as const;

export type ProjectSection = (typeof PROJECT_SECTIONS)[number];
export type ConfigurationSection = ProjectSection | (typeof REFERENCE_SECTIONS)[number];

/** A sidebar entry's group, in the order the sidebar shows them. */
export type ConfigurationGroup = "account" | "project" | "reference";

/** The entries the sidebar lists, in order. */
export const CONFIGURATION_ENTRIES: readonly { id: ConfigurationSection; group: ConfigurationGroup }[] = [
  { id: "organization", group: "account" },
  { id: "work-profile", group: "project" },
  { id: "integrations", group: "project" },
  { id: "documentation", group: "project" },
  { id: "form-languages", group: "project" },
  { id: "work-rules", group: "project" },
  { id: "precedence", group: "project" },
  { id: "integration-gate", group: "project" },
  { id: "sharing", group: "project" },
  { id: "capabilities", group: "project" },
  { id: "wake-reasons", group: "project" },
  { id: "glossary", group: "project" },
  { id: "roles", group: "reference" },
  { id: "categories", group: "reference" },
];

/** Where the person is inside Configuration: the section (null on the bare root) and the project in the address. */
export type ConfigurationPlace = { section: ConfigurationSection | null; projectId: string | null };

export function isProjectSection(section: ConfigurationSection): section is ProjectSection {
  return (PROJECT_SECTIONS as readonly string[]).includes(section);
}

/** Whether a project section also has an address without a project. */
export function isProjectless(section: ConfigurationSection): boolean {
  return (PROJECTLESS_SECTIONS as readonly string[]).includes(section);
}

/** The page a project section opens on when no project is chosen (Cfg-Org "No project chosen"): it names what it needs. */
export const CHOOSE_PROJECT_PATH = `${CONFIGURATION_ROOT}/project`;

/**
 * The address of a section. A project section without a project opens the "choose a project" page of that section
 * (the sidebar dims these entries but keeps them reachable), or its own project-less page when it has one.
 */
export function configurationPath(section: ConfigurationSection, projectId?: string | null): string {
  if (isProjectSection(section)) {
    if (!projectId) return isProjectless(section) ? `${CONFIGURATION_ROOT}/${section}` : `${CHOOSE_PROJECT_PATH}?section=${section}`;
    return `${CONFIGURATION_ROOT}/p/${encodeURIComponent(projectId)}/${section}`;
  }
  return `${CONFIGURATION_ROOT}/${section}`;
}

/** The section and project read back from an address under Configuration (any depth below the section). */
export function configurationPlace(pathname: string): ConfigurationPlace {
  if (!pathname.startsWith(`${CONFIGURATION_ROOT}/`)) return { section: null, projectId: null };
  const [first, second, third] = pathname
    .slice(CONFIGURATION_ROOT.length + 1)
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
  if (first === "project") return { section: null, projectId: null };
  if (first === "p") {
    const section = (PROJECT_SECTIONS as readonly string[]).find((s) => s === third) as ProjectSection | undefined;
    return { section: section ?? null, projectId: second ?? null };
  }
  const projectless = (PROJECTLESS_SECTIONS as readonly string[]).find((s) => s === first) as ProjectSection | undefined;
  if (projectless) return { section: projectless, projectId: null };
  const section = (REFERENCE_SECTIONS as readonly string[]).find((s) => s === first) as ConfigurationSection | undefined;
  return { section: section ?? null, projectId: null };
}
