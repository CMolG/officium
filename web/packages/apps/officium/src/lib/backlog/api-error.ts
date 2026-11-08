/**
 * `doc://contracts/officium-api` §1.4: `{error:<snake_code>, message:<human sentence>}` on
 * every non-2xx response. `code` is the snake_case wire error (`project_not_found`,
 * `version_conflict`, `key_prefix_taken`...); `status` is the HTTP status; `body` is the raw
 * parsed JSON (only `version_conflict` responses carry a `current` the caller needs, so it stays
 * generic here rather than a named field).
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly body: unknown;

  constructor(code: string, message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.body = body;
  }

  /** No response at all (offline, DNS, connection refused) -- distinct from a real 4xx/5xx. */
  static network(message = "Couldn't reach the Officium API. Check your connection."): ApiError {
    return new ApiError("network_error", message, 0);
  }
}
