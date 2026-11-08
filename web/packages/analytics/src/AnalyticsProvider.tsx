import type { ReactNode } from "react";

/** Officium Local sends no telemetry of any kind: no events, no cookies, no consent banner to answer. */
export function AnalyticsProvider(_props: { app: string }): ReactNode {
  return null;
}
