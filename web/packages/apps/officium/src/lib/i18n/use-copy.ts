import { en, type Copy } from "./en";

/** Officium renders American English for every visitor (JAVA-1779): no locale is read, stored or requested. */
export function useCopy(): Copy {
  return en;
}
