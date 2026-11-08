/**
 * The allowance of card data (`GET /usage`, JDB-241/245). `limitBytes` is what Officium has
 * available right now: its own free start (`freeBytes`, 15 MB, the same in every app) plus what is
 * left of the account's shared pool of bought or earned space (`sharedAvailableBytes`), which the
 * other apps draw on too.
 */
export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  freeBytes: number;
  sharedBytes: number;
  sharedAvailableBytes: number;
  otherApps: { app: string; usedBytes: number }[];
  /** An operator account: no limit applies, and `limitBytes` is the largest long. */
  unlimited?: boolean;
  /** The plan whose space `limitBytes` is, so the meter can name it (Off-Home, "The meter names the plan").
   *  TODO(backend): `GET /usage` serves no plan yet (JAVA-962, JAVA-1008); until it does the meter says "Free plan"
   *  only when no space was added to the account, and names nothing otherwise. */
  plan?: "free" | "personal" | "business";
  /** When a paid plan lapsed (an ISO instant), or null/absent while it runs. TODO(backend): same endpoint. */
  planEndedAt?: string | null;
}
