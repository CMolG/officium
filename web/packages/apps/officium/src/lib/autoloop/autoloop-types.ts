// The autoloop's remote switch on the wire (card://JAVA-1528): `autoloop.status` and its REST twin.

/** The most active of your loops on the project: none beating, waiting in standby, or working cards. */
export type AutoloopState = "offline" | "idle" | "running";

export type AutoloopCommand = "start" | "stop";

export interface AutoloopLoop {
  machine: string;
  state: AutoloopState;
  lastBeatAt: string;
  slots: number | null;
  target: string | null;
  pending: AutoloopCommand | null;
}

/** Why the gate is shut: one rule of the server's integration gate, with the cards that trip it. */
export interface GateReason {
  rule: "heldByDeploy" | "deployQueue" | "nothingElse";
  message: string;
  cards: string[];
}

/** card://JAVA-1820: while `open`, the work the loop needs sits on the control branch, not in main, and a person merges it. */
export interface GateView {
  open: boolean;
  reasons: GateReason[];
  branch: string | null;
  compareUrl: string | null;
  wallCard: string | null;
}

export interface AutoloopStatus {
  projectId: string;
  state: AutoloopState;
  /** The order the next beat takes, null when none is queued. */
  pending: AutoloopCommand | null;
  loops: AutoloopLoop[];
  /** Absent from an older server, null when the project has none: both read as no gate. */
  gate?: GateView | null;
}

export interface AutoloopClient {
  status(projectId: string): Promise<AutoloopStatus>;
  start(projectId: string): Promise<AutoloopStatus>;
  stop(projectId: string): Promise<AutoloopStatus>;
  /** Calls `onChange` when the server says the project's loops changed (or the stream reopened). */
  subscribe(projectId: string, onChange: () => void): () => void;
}
