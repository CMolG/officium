/**
 * One headline is about 60 characters at most (Library 18, "Six rules"), and one line under it is
 * short too. Cuts `text` at a word boundary under `max` characters and ends it with an ellipsis
 * (never an em dash); text that already fits is returned as it is.
 */
export function shareTrim(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-]+$/, "")}…`;
}
