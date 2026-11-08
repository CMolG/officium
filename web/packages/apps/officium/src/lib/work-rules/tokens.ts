/**
 * The token estimate of a project's work rules (JAVA-1778): ceil(UTF-8 bytes of the trimmed rule / 4). The API counts
 * with the same formula (`WorkRuleTokens`), and both are pinned by one shared vectors file, so the number on the page
 * is the number the server refuses on.
 */

/** The project's default quota, the twin's; the API serves the real one as `definitionOfDoneTokenQuota`. */
export const WORK_RULES_TOKEN_QUOTA = 1500;

const encoder = new TextEncoder();

export function estimateTokens(text: string): number {
  return Math.ceil(encoder.encode(text.trim()).length / 4);
}

export function totalTokens(items: string[]): number {
  return items.reduce((sum, item) => sum + estimateTokens(item), 0);
}
