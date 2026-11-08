/** The mark a card carries when a project precedence rule ranks it, with its place in the list (`CardView.precedence`, JAVA-1686). */
export interface CardPrecedence {
  ruleId: string;
  name: string;
  reason: string;
  position: number;
  of: number;
}
