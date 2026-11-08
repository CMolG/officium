import { apiUrl } from "@javadaba/sdk/platform";

import { ApiError } from "../backlog/api-error";
import { getBacklogRepository, USES_MEMORY_BACKEND } from "../backlog/get-repository";
import type { AutoloopClient } from "./autoloop-types";
import { memoryAutoloopClient } from "./memory-autoloop";

/** The autoloop's remote switch (card://JAVA-1528), against the API or, in the memory build, the tab's own twin. */
const BASE = "/api/officium/v1/projects";

async function call<T>(projectId: string, path: string, method = "GET"): Promise<T> {
  const res = await fetch(apiUrl(`${BASE}/${encodeURIComponent(projectId)}/autoloop${path}`), { method, credentials: "include" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.error ?? `http_${res.status}`, body?.message ?? "The request failed.", res.status);
  return body as T;
}

const apiAutoloopClient: AutoloopClient = {
  status: (projectId) => call(projectId, ""),
  start: (projectId) => call(projectId, "/start", "POST"),
  stop: (projectId) => call(projectId, "/stop", "POST"),
  subscribe: (projectId, onChange) =>
    getBacklogRepository().subscribe(projectId, (event) => {
      if (event.type === "autoloop.changed" || event.type === "stream.ready") onChange();
    }),
};

export function getAutoloopClient(): AutoloopClient {
  return USES_MEMORY_BACKEND ? memoryAutoloopClient : apiAutoloopClient;
}
