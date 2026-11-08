// A documentation room's wire (JAVA-803, contract §8.24): control frames are JSON text, data frames
// are binary `[kind u8][seq u32][payload]`. The server relays the payload and never reads it.

export const UPDATE = 0;
export const SNAPSHOT = 1;
export const AWARENESS = 2;
const HEADER = 5;

export interface DataFrame {
  kind: number;
  seq: number;
  payload: Uint8Array;
}

export function encodeData(kind: number, seq: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(HEADER + payload.length);
  frame[0] = kind;
  new DataView(frame.buffer).setUint32(1, seq);
  frame.set(payload, HEADER);
  return frame;
}

/** The frame, or null when it is too short or of a kind this client does not know. */
export function decodeData(bytes: Uint8Array): DataFrame | null {
  if (bytes.length < HEADER || bytes[0]! > AWARENESS) return null;
  const seq = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(1);
  return { kind: bytes[0]!, seq, payload: bytes.subarray(HEADER) };
}

/** What the server says as text. `type` is the discriminator; the rest is its own fields. */
export type ControlFrame =
  | { type: "welcome"; epoch: string; seq: number; founded: boolean; seed: boolean; push: boolean; saver: boolean; editor: boolean }
  | { type: "founded" }
  | { type: "seed" }
  | { type: "saver"; on: boolean }
  | { type: "compact" }
  | { type: "ack"; seq: number }
  | { type: "left"; clientId: number }
  | { type: "error"; code: string }
  | { type: "merged"; by: string; version: number; overlaps: number }
  | { type: "outside"; base: number | null; markdown: string }
  | { type: "moving" | "stale" | "refused" };

/** What a client says beyond `hello` and `seeded` (JAVA-1477): the relay forwards both untouched. */
export type SentFrame = Extract<ControlFrame, { type: "merged" | "outside" }>;

export function parseControl(text: string): ControlFrame | null {
  try {
    const frame = JSON.parse(text) as { type?: unknown };
    return typeof frame.type === "string" ? (frame as ControlFrame) : null;
  } catch {
    return null;
  }
}

/** The close codes the room uses (contract §8.24). */
export const CLOSE = { moving: 1012, signedOut: 4401, notFound: 4404, stale: 4409, refused: 4429 } as const;
