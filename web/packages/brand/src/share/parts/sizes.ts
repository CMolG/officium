/** The item's headline size by length: 56, 48 or 40 px. */
export function itemHeadlineSize(text: string): number {
  return text.length <= 24 ? 56 : text.length <= 44 ? 48 : 40;
}
