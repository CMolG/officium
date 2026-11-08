import { projectColorVar } from "../../backlog/project-appearance";
import { DOC_COLORS } from "../doc-node-rules";

const TINTS = DOC_COLORS.filter((color) => color !== "slate");

/**
 * One colour per person from the project's closed palette, the same on every screen. Decoration only:
 * a person is always told apart by name and by the word "editing", never by this.
 */
export function presenceTint(accountId: string): string {
  let hash = 0;
  for (const char of accountId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return projectColorVar(TINTS[hash % TINTS.length]!);
}
