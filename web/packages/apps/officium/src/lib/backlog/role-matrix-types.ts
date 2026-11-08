/** The phase a status asks for (officium-api.md §8.9): what a role-matrix cell is keyed by. */
export type Phase = "refine" | "action" | "ready" | "review" | "deploy";

/** A row's roles per phase. A phase left out has none. */
export type RoleMatrixRow = Partial<Record<Phase, string[]>>;

/** How hard the model reasons on a card (JAVA-915): the levels `claude --effort` takes. */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** The model and effort an agent works a card with (JAVA-915). */
export interface RunConfig {
  model: string;
  effort: Effort;
}

/** One cell's model and effort, and the roles that work it with another (JAVA-915). */
export interface RunCell extends RunConfig {
  roles?: Record<string, RunConfig>;
}

/** A category row's run cells per phase. */
export type RunRow = Partial<Record<Phase, RunCell>>;

/** officium-api.md §8.9 (JAVA-294): the roles each category (plus `spike/ux-ui`) and each signal
 *  bring, by phase, and (JAVA-915) the model and effort each category cell is worked with. As an
 *  override it names only the cells that replace the default; one with no `runs` keeps the
 *  project's run cells. */
export interface RoleMatrix {
  categories: Record<string, RoleMatrixRow>;
  signals: Record<string, RoleMatrixRow>;
  runs?: Record<string, RunRow>;
  /** card://JAVA-1569: the mods each row (a category, or a signal) mounts per phase, whatever the role. Like
   *  `runs`, an override with no `mods` keeps the project's. */
  mods?: Record<string, RoleMatrixRow>;
}

/** `GET|PUT /projects/{id}/role-matrix`: what the project's cards are read against, and what of
 *  it the project changed. `version` 0 means it never changed. `base` is the matrix under the
 *  project's own cells (its active profile's, else the defaults): a cell the project owns is one
 *  that differs from it (JAVA-1627). `editable`: the owner's plan lets them change it (JAVA-1007).
 *  `overridesInactive`: the project keeps its own cells, but the plan lapsed, so they do not apply. */
export interface RoleMatrixView {
  projectId: string;
  effective: RoleMatrix;
  overrides: RoleMatrix;
  version: number;
  updatedAt: string | null;
  activeProfileId: string | null;
  base: RoleMatrix;
  editable: boolean;
  overridesInactive: boolean;
}
