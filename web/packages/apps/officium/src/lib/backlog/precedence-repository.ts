/** One entry of a card's activity feed (`GET .../activity?cardId=`); `operation` is e.g. `card.precedence`. */
export interface CardActivity {
  id: string;
  operation: string;
  summary: string;
  at: string;
}

export interface PrecedenceRepository {
  /** The activity entries a precedence rule wrote on a card (JAVA-1686), newest first; the history view renders them. */
  listCardPrecedenceActivity(projectId: string, cardId: string): Promise<CardActivity[]>;
}
