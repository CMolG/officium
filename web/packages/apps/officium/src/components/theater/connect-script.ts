import type { InMemoryBacklogRepository } from "../../lib/backlog/memory-repository";
import { configurationPath } from "../../lib/configuration/places";
import type { SceneStep } from "./use-scene-steps";

/** Where the connect page lives: the Integrations section of Officium's Configuration (JAVA-1626, JAVA-1629). */
export const CONNECT_ROUTE = `/officium${configurationPath("integrations")}`;

/** The Linear half's proof. The page and its date are the source the sentence is checked against. */
export const LINEAR_CONNECT = {
  page: "linear.app/docs/mcp",
  checkedOn: "2026-10-20",
  sentence: "Linear's connection reaches one workspace; for another, you authenticate again.",
} as const;

/** The clients the reader works for: the seeded project, then two added by the script. */
export const CLIENTS = ["Storefront", "Atlas", "Lumen"] as const;

/** The two projects the script adds to the in-memory repository, one at a time. */
const NEW_PROJECTS = [
  { name: "Atlas", keyPrefix: "ATLAS" },
  { name: "Lumen", keyPrefix: "LUMEN" },
] as const;

/** The scene's length: the last step plus a beat to read the end state. */
export const CONNECT_SCRIPT_MS = 9_800;

export interface ConnectContext {
  repository: InMemoryBacklogRepository;
  /** How many of the clients are on screen, on the Linear half. */
  setClients: (clients: number) => void;
  /** Moves the handle to Officium, unless the reader has already moved it. */
  handOff: () => void;
  /** The Javadaba sign-in is drawn on the Officium half. Nothing signs in. */
  setSignedIn: () => void;
  /** The project names the agent sees, read from the repository. */
  setProjects: (names: readonly string[]) => void;
}

async function readProjects(ctx: ConnectContext): Promise<void> {
  const projects = await ctx.repository.listProjects();
  ctx.setProjects(projects.map((project) => project.name));
}

function addProjectStep(index: number): SceneStep<ConnectContext> {
  const project = NEW_PROJECTS[index];
  return {
    at: 5200 + index * 600,
    run: async (ctx) => {
      await ctx.repository.createProject(project);
      await readProjects(ctx);
    },
  };
}

/**
 * The connect scene's steps, read as one timeline: the clients appear one by one on the left, the
 * handle slides from them to Officium, then one sign-in and the projects it sees appear on the right.
 */
export const CONNECT_STEPS: readonly SceneStep<ConnectContext>[] = [
  ...CLIENTS.map((_, index): SceneStep<ConnectContext> => ({
    at: 700 + index * 600,
    run: async (ctx) => ctx.setClients(index + 1),
  })),
  { at: 4200, run: async (ctx) => ctx.handOff() },
  {
    at: 4700,
    run: async (ctx) => {
      ctx.setSignedIn();
      await readProjects(ctx);
    },
  },
  addProjectStep(0),
  addProjectStep(1),
];
