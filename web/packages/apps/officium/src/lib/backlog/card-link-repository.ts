import type { Card, VersionConflict, WriteResult } from "./types";

/**
 * The links of a card and its deletion (JDB-239, JAVA-1114, Off-Card 2). Split from `BacklogRepository` so that file keeps
 * its architecture ceiling.
 */
export interface CardLinkRepository {
  /** `blocks_cycle` (as a thrown Error) if the edge would close a cycle. */
  linkCard(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; type: "related" | "blocks"; target: string },
  ): Promise<WriteResult<Card>>;
  unlinkCard(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; type: "related" | "blocks"; target: string },
  ): Promise<WriteResult<Card>>;

  /** Deletes the card for good, with its comments, time entries and links (`DELETE …/cards/{id}?expectedVersion`).
   *  Rejecting keeps a record; this does not, so the card asks first. */
  deleteCard(projectId: string, cardId: string, expectedVersion: number): Promise<void | VersionConflict<Card>>;
}
