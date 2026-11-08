import { apiUrl } from "@javadaba/sdk/platform";

import { getBacklogRepository } from "../backlog/get-repository";
import type { Summons, SummonsClient } from "./summons";

const BASE = "/api/officium/v1/summons";

async function call(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`summons_${res.status}`);
  return res;
}

/** The real thing: the server's rounds, told apart by the `summons` frame on the account's stream. */
export const apiSummonsClient: SummonsClient = {
  async list() {
    return (await (await call(BASE)).json()) as Summons[];
  },
  async shown(summonsId, seen) {
    await call(`${BASE}/${summonsId}/seen`, { method: "POST", body: JSON.stringify({ seen }) });
  },
  async snooze(summonsId) {
    await call(`${BASE}/${summonsId}/snooze`, { method: "POST" });
  },
  subscribe(onChange) {
    // The working stream is the account's: its `ready` means "reconnect = refetch" too.
    return getBacklogRepository().subscribeWorking((event) => {
      if (event.type === "summons" || event.type === "stream.ready") onChange();
    });
  },
};
