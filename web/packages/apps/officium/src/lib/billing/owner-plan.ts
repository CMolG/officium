// The owner's plan, as the memory build knows it (card://JAVA-1007). The server answers it from billing; the demo
// and the e2e suite flip it with the mock hook `simulateOwnerPlan`. Personal sells the editing of roles, models and
// efforts per category: a free owner keeps the defaults, and what they had saved stays, inactive, until they subscribe.
export type OwnerPlan = "free" | "personal";

let plan: OwnerPlan = "personal";

export function setOwnerPlan(next: OwnerPlan): void {
  plan = next;
}

/** Whether the owner's plan lets them change the roles, models and efforts per category (both paid ids). */
export function ownerCanEdit(): boolean {
  return plan === "personal";
}

/** The overrides a project keeps under its owner's plan: all of them while it covers editing, none once it lapses. */
export function keptOverrides<T>(overrides: T | undefined): T | undefined {
  return ownerCanEdit() ? overrides : undefined;
}
