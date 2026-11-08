import type { Subscription, ValueView } from "./value-types";

/** The value report and the caller's subscription price (card://JAVA-1047). */
export interface ValueRepository {
  /** The value report of a month, with the month before it beside it. Reader access. */
  getValue(projectId: string, month: string): Promise<ValueView>;
  /** The caller's own subscription price; `monthlyUsd` is null until set. */
  getSubscription(): Promise<Subscription>;
  /** Sets the caller's monthly price in USD; `invalid_subscription` (400) throws. */
  setSubscription(monthlyUsd: number): Promise<Subscription>;
}
