"use client";

import { currentOrigin } from "@javadaba/sdk/platform";

import { ApiError } from "./api-error";
import type { Attachment } from "./types";

/**
 * The browser end of an attachment transfer
 * (JDB-244, `doc://history/plans/2026-09-15-officium-cuota-y-ficheros-p2p`). The file goes to --
 * or comes from -- the machine where the project's agent works, never to Javadaba's disk:
 *
 * 1. `WS /api/officium/v1/projects/{id}/files` asks the API to accept the transfer; the API checks
 *    access, size, type, quota and that a machine is online, and tells the machine.
 * 2. This side OFFERS a WebRTC data channel and trickles ICE through the same socket.
 * 3. If the channel is not open within `ICE_TIMEOUT_MS` (symmetric NAT, corporate network), it asks
 *    for the relay and the same bytes stream through the API socket, id-prefixed, unstored.
 */

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const ICE_TIMEOUT_MS = 5000;
const CHUNK = 16 * 1024;
const HIGH_WATER = 1024 * 1024;

type Frame = { type: string; transferId?: string; [key: string]: unknown };

export async function uploadToMachine(
  apiBase: string,
  projectId: string,
  cardId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Attachment> {
  const session = await TransferSession.open(apiBase, projectId);
  try {
    session.send({ type: "upload", transferId: session.id, cardId, name: file.name, size: file.size, contentType: file.type || "application/octet-stream" });
    await session.next("accepted");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const report = (sent: number) => onProgress?.(Math.round((sent / Math.max(1, bytes.length)) * 100));
    const channel = await session.peer(false);
    if (channel) {
      for (let offset = 0; offset < bytes.length; offset += CHUNK) {
        if (channel.bufferedAmount > HIGH_WATER) await drained(channel);
        channel.send(bytes.subarray(offset, offset + CHUNK));
        report(Math.min(bytes.length, offset + CHUNK));
      }
      channel.send("eof");
    } else {
      session.send({ type: "relay", transferId: session.id });
      for (let offset = 0; offset < bytes.length; offset += CHUNK) {
        await session.sendChunk(bytes.subarray(offset, offset + CHUNK));
        report(Math.min(bytes.length, offset + CHUNK));
      }
      session.send({ type: "eof", transferId: session.id });
    }
    const done = await session.next("done");
    return done.attachment as Attachment;
  } finally {
    session.close();
  }
}

export async function downloadFromMachine(
  apiBase: string,
  projectId: string,
  cardId: string,
  attachment: Attachment,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const session = await TransferSession.open(apiBase, projectId);
  try {
    session.send({ type: "download", transferId: session.id, cardId, attachmentId: attachment.id });
    const accepted = await session.next("accepted");
    const size = Number(accepted.size) || attachment.size;
    const parts: Uint8Array[] = [];
    let received = 0;
    const take = (chunk: Uint8Array) => {
      parts.push(chunk);
      received += chunk.length;
      onProgress?.(Math.round((received / Math.max(1, size)) * 100));
    };

    const channel = await session.peer(true, take);
    if (!channel) {
      session.onChunk(take);
      session.send({ type: "relay", transferId: session.id });
    }
    await (channel ? session.channelEnded : session.next("eof"));
    return new Blob(parts as BlobPart[], { type: attachment.contentType });
  } finally {
    session.close();
  }
}

/** One socket, one transfer, one optional peer connection. */
class TransferSession {
  readonly id = crypto.randomUUID();
  private readonly frames: Frame[] = [];
  private readonly waiters: Array<() => void> = [];
  private chunkListener: ((chunk: Uint8Array) => void) | null = null;
  private pc: RTCPeerConnection | null = null;
  private failure: ApiError | null = null;
  channelEnded: Promise<void> = Promise.resolve();

  private constructor(private readonly ws: WebSocket) {
    ws.binaryType = "arraybuffer";
    ws.onmessage = (event) => {
      if (typeof event.data !== "string") {
        this.chunkListener?.(new Uint8Array(event.data as ArrayBuffer).subarray(36));
        return;
      }
      const frame = JSON.parse(event.data) as Frame;
      if (frame.type === "signal") {
        void this.onSignal(frame.data as { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit });
        return;
      }
      if (frame.type === "error") {
        this.failure = new ApiError(String(frame.error), String(frame.message), 409, frame);
      }
      this.frames.push(frame);
      this.wake();
    };
    ws.onclose = () => {
      this.failure ??= new ApiError("transfer_interrupted", "The connection to Officium closed during the transfer.", 0, null);
      this.wake();
    };
  }

  static open(apiBase: string, projectId: string): Promise<TransferSession> {
    const url = new URL(`${apiBase}/projects/${projectId}/files`, currentOrigin());
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(new TransferSession(ws));
      ws.onerror = () => reject(ApiError.network());
    });
  }

  send(frame: Frame) {
    this.ws.send(JSON.stringify(frame));
  }

  async sendChunk(chunk: Uint8Array) {
    while (this.ws.bufferedAmount > HIGH_WATER) await new Promise((resolve) => setTimeout(resolve, 20));
    const frame = new Uint8Array(36 + chunk.length);
    frame.set(new TextEncoder().encode(this.id), 0);
    frame.set(chunk, 36);
    this.ws.send(frame);
  }

  onChunk(listener: (chunk: Uint8Array) => void) {
    this.chunkListener = listener;
  }

  /** The next control frame, which must be `type` -- an `error` frame rejects with the API's code. */
  async next(type: string): Promise<Frame> {
    for (;;) {
      if (this.failure) throw this.failure;
      const frame = this.frames.shift();
      if (frame) {
        if (frame.type === type) return frame;
        continue;
      }
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
  }

  /**
   * Offers a data channel and waits for it to open. `null` when it does not within the timeout:
   * the caller falls back to the relay. For a download, `onData` receives the machine's chunks and
   * `channelEnded` settles on its "eof".
   */
  async peer(receiving: boolean, onData?: (chunk: Uint8Array) => void): Promise<RTCDataChannel | null> {
    if (typeof RTCPeerConnection === "undefined") return null;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;
    const channel = pc.createDataChannel(this.id, { ordered: true });
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = HIGH_WATER / 4;
    if (receiving) {
      this.channelEnded = new Promise((resolve) => {
        channel.onmessage = (event) => {
          if (event.data === "eof") resolve();
          else onData?.(new Uint8Array(event.data as ArrayBuffer));
        };
      });
    }
    pc.onicecandidate = (event) => {
      if (event.candidate) this.send({ type: "signal", transferId: this.id, data: { candidate: event.candidate.toJSON() } });
    };
    await pc.setLocalDescription(await pc.createOffer());
    this.send({ type: "signal", transferId: this.id, data: { sdp: pc.localDescription?.toJSON() } });

    const opened = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), ICE_TIMEOUT_MS);
      channel.onopen = () => {
        clearTimeout(timer);
        resolve(true);
      };
    });
    if (opened) return channel;
    pc.close();
    this.pc = null;
    return null;
  }

  private async onSignal(data: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) {
    const pc = this.pc;
    if (!pc) return;
    try {
      if (data.sdp) await pc.setRemoteDescription(data.sdp);
      else if (data.candidate) await pc.addIceCandidate(data.candidate);
    } catch {
      // A signal arriving after the fallback, or a candidate the browser cannot use: the relay
      // path does not depend on it.
    }
  }

  private wake() {
    this.waiters.splice(0).forEach((resolve) => resolve());
  }

  close() {
    this.pc?.close();
    if (this.ws.readyState === WebSocket.OPEN) this.ws.close();
  }
}

function drained(channel: RTCDataChannel): Promise<void> {
  return new Promise((resolve) => {
    channel.onbufferedamountlow = () => {
      channel.onbufferedamountlow = null;
      resolve();
    };
  });
}
