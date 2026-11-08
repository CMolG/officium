import type { Nicknames, OrganizationProfile } from "./types";

/** The organization's own settings (JAVA-199, JAVA-1780): its name, its owner, and the nicknames in it. */
export interface OrganizationProfileRepository {
  /** The caller's organization: its name and its owner. The caller is always the owner. */
  getOrganization(): Promise<OrganizationProfile>;
  /** Renames the caller's organization. `400 organization_name_invalid` for 2-60 characters without controls. */
  renameOrganization(name: string): Promise<OrganizationProfile>;
  /** The caller's organization's nicknames, and their own (JAVA-199). */
  getNicknames(): Promise<Nicknames>;
  /** Sets the caller's nickname there; "" clears it. `409 nickname_taken`, `400 nickname_invalid`. */
  setNickname(nickname: string): Promise<Nicknames>;
}
