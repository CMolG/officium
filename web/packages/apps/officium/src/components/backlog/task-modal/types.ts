import type { Card, CardDetail } from "../../../lib/backlog/types";

export type OnChanged = (next: CardDetail) => void | Promise<void>;

export type ReportConflict = (
  result: { error: "version_conflict"; message: string; current: Card },
  retry: () => Promise<void>,
) => void;
