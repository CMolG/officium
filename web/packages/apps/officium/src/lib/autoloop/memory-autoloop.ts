// The tab's twin of `AutoloopService` (card://JAVA-1528), for the memory build (the demo and the e2e suite):
// a spec beats as the supervisor would (`__OFFICIUM_MOCK__.beatAutoloop`), and the board's button queues the
// order the next beat takes. Offline after 90 s without a beat, as on the server.
import { ApiError } from "../backlog/api-error";
import type { AutoloopClient, AutoloopCommand, AutoloopLoop, AutoloopState, AutoloopStatus, GateView } from "./autoloop-types";

const OFFLINE_AFTER_MS = 90_000;
const RANK: Record<AutoloopState, number> = { offline: 0, idle: 1, running: 2 };

interface Loop {
  state: Exclude<AutoloopState, "offline">;
  at: number;
  slots: number | null;
  target: string | null;
  pending: AutoloopCommand | null;
}

const loops = new Map<string, Map<string, Loop>>();
const gates = new Map<string, GateView>();
const listeners = new Map<string, Set<() => void>>();

const of = (projectId: string) => loops.get(projectId) ?? new Map<string, Loop>();
const live = (loop: Loop, now: number): AutoloopState => (now - loop.at > OFFLINE_AFTER_MS ? "offline" : loop.state);
const changed = (projectId: string) => listeners.get(projectId)?.forEach((listener) => listener());

function view(projectId: string): AutoloopStatus {
  const now = Date.now();
  const rows: AutoloopLoop[] = [...of(projectId).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([machine, loop]) => ({
      machine,
      state: live(loop, now),
      lastBeatAt: new Date(loop.at).toISOString(),
      slots: loop.slots,
      target: loop.target,
      pending: loop.pending,
    }));
  const state = rows.reduce<AutoloopState>((best, row) => (RANK[row.state] > RANK[best] ? row.state : best), "offline");
  return { projectId, state, pending: rows.find((row) => row.pending)?.pending ?? null, loops: rows, gate: gates.get(projectId) ?? null };
}

function order(projectId: string, command: AutoloopCommand): AutoloopStatus {
  if (command === "start" && gates.get(projectId)?.open) {
    throw new ApiError("integration_gate_open", "The autoloop waits for the control branch to be merged into main.", 409);
  }
  const from = command === "start" ? "idle" : "running";
  const targets = [...of(projectId).values()].filter((loop) => live(loop, Date.now()) === from);
  if (targets.length === 0) {
    throw command === "start"
      ? new ApiError("no_idle_autoloop", "No autoloop of yours is waiting on this project: start one in standby (/autoloop standby)", 409)
      : new ApiError("no_running_autoloop", "No autoloop of yours is running on this project", 409);
  }
  for (const loop of targets) loop.pending = command;
  changed(projectId);
  return view(projectId);
}

/** Opens the project's integration gate as the server would (card://JAVA-1820); null closes it. */
export function setAutoloopGate(projectId: string, gate: Partial<GateView> | null): void {
  if (gate === null) gates.delete(projectId);
  else gates.set(projectId, { open: true, reasons: [], branch: null, compareUrl: null, wallCard: null, ...gate });
  changed(projectId);
}

/** A supervisor's beat, as `autoloop.heartbeat` takes it: answers the order its state can take, once. */
export function beatAutoloop(
  projectId: string,
  beat: { machine: string; state: "running" | "idle"; slots?: number; target?: string; at?: number },
): { command: AutoloopCommand | null } {
  const mine = of(projectId);
  loops.set(projectId, mine);
  const before = mine.get(beat.machine);
  const pending = before?.pending ?? null;
  const takes = (pending === "start" && beat.state === "idle") || (pending === "stop" && beat.state === "running");
  mine.set(beat.machine, { state: beat.state, at: beat.at ?? Date.now(), slots: beat.slots ?? null, target: beat.target ?? null, pending: null });
  changed(projectId);
  return { command: takes ? pending : null };
}

export const memoryAutoloopClient: AutoloopClient = {
  status: async (projectId) => view(projectId),
  start: async (projectId) => order(projectId, "start"),
  stop: async (projectId) => order(projectId, "stop"),
  subscribe(projectId, onChange) {
    const set = listeners.get(projectId) ?? new Set();
    listeners.set(projectId, set);
    set.add(onChange);
    return () => set.delete(onChange);
  },
};
