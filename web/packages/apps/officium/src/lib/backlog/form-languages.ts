/**
 * The project's form languages (JAVA-1082, JAVA-1143): the codes a form on a human card is written in. Pure, so the
 * screen, the in-memory twin and the unit specs read the same rules as the server.
 */

/** The server's cap on how many languages a project lists. */
export const MAX_FORM_LANGUAGES = 10;

/** The codes the screen offers as one click each: the ones Quaestio's builder suggests too. */
export const SUGGESTED_FORM_LANGUAGES = ["en", "es", "pt", "fr", "de", "it", "ca"] as const;

const FORM_LANGUAGE_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/;

/** A code as the server stores it (trimmed, lower-case, `_` read as `-`), or null when it is not one. */
export function normalizeFormLanguage(code: string): string | null {
  const normalized = code.trim().toLowerCase().replace(/_/g, "-");
  return FORM_LANGUAGE_PATTERN.test(normalized) ? normalized : null;
}

/** The language's name in the reader's language, or the code when the runtime cannot name it. */
export function formLanguageName(code: string): string {
  try {
    return new Intl.DisplayNames("en", { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
