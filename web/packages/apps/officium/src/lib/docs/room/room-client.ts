import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import * as Y from "yjs";

import { AWARENESS, CLOSE, SNAPSHOT, UPDATE, decodeData, encodeData, parseControl, type ControlFrame, type SentFrame } from "./frames";

/** The part of a browser WebSocket the client uses, so a test can stand in for it. */
export interface RoomSocket {
  binaryType: string;
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send(data: string | Uint8Array): void;
  close(): void;
}

export type RoomStatus = "connecting" | "seeding" | "synced" | "stale" | "unavailable";
export type RoomRole = "saver" | "editor" | "observer";

export interface RoomState {
  status: RoomStatus;
  role: RoomRole;
  /** The server granted this client the seed: it writes the page's Markdown into the room, once. */
  seed: boolean;
}

export interface RoomOptions {
  url: string;
  open: (url: string) => RoomSocket;
  /** Where the reconnect waits come from; a test replaces it. */
  schedule?: (run: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
}

const OPEN = 1;
const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 15_000;
/** Closes before the first welcome that make the page give up on live editing. */
const GIVE_UP_AFTER = 2;

/**
 * One page's room as a browser sees it (JAVA-803, ADR 0024): a Yjs document and its awareness
 * over the relay socket, with no `y-websocket`. It holds the room's epoch, so a reconnect to the
 * same room pushes its state again and a room lost in a restart is re-founded by it; a client of a
 * dead epoch is told it is stale and never pushes. The editor binds to {@link doc} and
 * {@link awareness}; the host reads {@link state} to decide what to draw.
 */
export class DocRoomClient {
  readonly doc = new Y.Doc();
  readonly awareness = new Awareness(this.doc);
  private current: RoomState = { status: "connecting", role: "observer", seed: false };
  private readonly listeners = new Set<() => void>();
  private readonly frameListeners = new Set<(frame: SentFrame) => void>();
  private socket: RoomSocket | null = null;
  private epoch_: string | null = null;
  private lastSeq = 0;
  private attempts = 0;
  private everWelcomed = false;
  private wanted = false;
  private retry: unknown = null;

  constructor(private readonly options: RoomOptions) {
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin !== this && this.sends()) this.write(encodeData(UPDATE, 0, update));
    });
    this.awareness.on("update", (_change: unknown, origin: unknown) => {
      if (origin === "local" && this.socket?.readyState === OPEN && this.current.role !== "observer") {
        this.write(encodeData(AWARENESS, 0, encodeAwarenessUpdate(this.awareness, [this.doc.clientID])));
      }
    });
  }

  get state(): RoomState {
    return this.current;
  }

  /** The page's title lives in the room beside its text, so anyone editing may change it (last write wins). */
  get title(): string | undefined {
    return this.doc.getMap<string>("meta").get("title");
  }

  setTitle(title: string): void {
    this.doc.getMap<string>("meta").set("title", title);
  }

  /** Runs {@code run} when the title changes in the room, whoever changed it. */
  onTitle(run: (title: string) => void): () => void {
    const meta = this.doc.getMap<string>("meta");
    const observer = () => {
      const title = meta.get("title");
      if (title !== undefined) run(title);
    };
    meta.observe(observer);
    return () => meta.unobserve(observer);
  }

  /** The room's epoch once welcomed: the `editSession` of the saver's writes. */
  get epoch(): string | null {
    return this.epoch_;
  }

  /** Runs `run` for a `merged` notice or an `outside` write the relay forwards here (JAVA-1477). */
  onFrame(run: (frame: SentFrame) => void): () => void {
    this.frameListeners.add(run);
    return () => this.frameListeners.delete(run);
  }

  /** Tells the room a merge happened (the saver) or hands the saver an outside write (anyone editing). */
  sendFrame(frame: SentFrame): void {
    if (this.socket?.readyState === OPEN && this.current.role !== "observer") this.socket.send(JSON.stringify(frame));
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  connect(): void {
    this.wanted = true;
    if (this.socket || this.current.status === "unavailable" || this.current.status === "stale") return;
    const socket = this.options.open(this.options.url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "hello", epoch: this.epoch_, hasState: this.epoch_ !== null, clientId: this.doc.clientID }));
    };
    socket.onmessage = (event) => this.receive(event.data);
    socket.onclose = (event) => this.closed(socket, event.code);
  }

  /** Leaves the room; the document stays, so a later {@link connect} rejoins on the same epoch. */
  disconnect(): void {
    this.wanted = false;
    if (this.retry !== null) (this.options.cancel ?? clearTimeout)(this.retry as never);
    this.retry = null;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
  }

  /** The host has written the page into the room (or found it empty): the server may call the room founded. */
  seeded(): void {
    if (!this.current.seed) return;
    this.set({ seed: false });
    this.socket?.send(JSON.stringify({ type: "seeded" }));
  }

  /** The saver tells the server everything up to the last sequence it has seen is now one entry. */
  snapshot(): void {
    if (this.current.role === "saver" && this.lastSeq >= 1) {
      this.write(encodeData(SNAPSHOT, this.lastSeq, Y.encodeStateAsUpdate(this.doc)));
    }
  }

  private sends(): boolean {
    const { role, status, seed } = this.current;
    return this.socket?.readyState === OPEN && role !== "observer" && (status === "synced" || seed);
  }

  private write(frame: Uint8Array): void {
    this.socket?.send(frame);
  }

  private receive(data: unknown): void {
    if (typeof data === "string") {
      const frame = parseControl(data);
      if (frame) this.control(frame);
      return;
    }
    const frame = decodeData(new Uint8Array(data as ArrayBuffer));
    if (!frame) return;
    if (frame.kind === AWARENESS) {
      applyAwarenessUpdate(this.awareness, frame.payload, this);
      return;
    }
    this.lastSeq = Math.max(this.lastSeq, frame.seq);
    Y.applyUpdate(this.doc, frame.payload, this);
  }

  private control(frame: ControlFrame): void {
    switch (frame.type) {
      case "welcome":
        this.welcomed(frame);
        break;
      case "founded":
        this.set({ status: "synced", seed: false });
        break;
      case "seed":
        this.set({ status: "seeding", seed: true });
        break;
      case "saver":
        this.set({ role: frame.on ? "saver" : "editor" });
        break;
      case "merged":
      case "outside":
        this.frameListeners.forEach((run) => run(frame));
        break;
      case "compact":
        this.snapshot();
        break;
      case "ack":
        this.lastSeq = Math.max(this.lastSeq, frame.seq);
        break;
      case "left":
        removeAwarenessStates(this.awareness, [frame.clientId], this);
        break;
      default:
        break;
    }
  }

  private welcomed(frame: Extract<ControlFrame, { type: "welcome" }>): void {
    this.epoch_ = frame.epoch;
    this.everWelcomed = true;
    this.attempts = 0;
    this.lastSeq = Math.max(this.lastSeq, frame.seq);
    const role: RoomRole = !frame.editor ? "observer" : frame.saver ? "saver" : "editor";
    this.set({ role, seed: frame.seed, status: frame.founded ? "synced" : "seeding" });
    if (frame.push) this.write(encodeData(UPDATE, 0, Y.encodeStateAsUpdate(this.doc)));
    if (this.current.role !== "observer" && this.awareness.getLocalState() !== null) {
      this.write(encodeData(AWARENESS, 0, encodeAwarenessUpdate(this.awareness, [this.doc.clientID])));
    }
  }

  private closed(socket: RoomSocket, code: number): void {
    if (this.socket !== socket) return;
    this.socket = null;
    if (code === CLOSE.stale) return this.set({ status: "stale" });
    if (code === CLOSE.signedOut || code === CLOSE.notFound) return this.set({ status: "unavailable" });
    this.attempts += 1;
    if (!this.everWelcomed && this.attempts >= GIVE_UP_AFTER) return this.set({ status: "unavailable" });
    this.set({ status: this.current.status === "synced" || this.current.status === "seeding" ? "connecting" : this.current.status });
    if (!this.wanted) return;
    const wait = code === CLOSE.moving ? 0 : Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (this.attempts - 1));
    this.retry = (this.options.schedule ?? setTimeout)(() => {
      this.retry = null;
      this.connect();
    }, wait);
  }

  private set(change: Partial<RoomState>): void {
    const next = { ...this.current, ...change };
    if (next.status === this.current.status && next.role === this.current.role && next.seed === this.current.seed) return;
    this.current = next;
    this.listeners.forEach((listener) => listener());
  }
}
