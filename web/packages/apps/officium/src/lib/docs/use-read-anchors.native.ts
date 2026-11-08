import type { RefObject } from "react";
import type { AnchorThread } from "@javadaba/rich-text";

/** Android draws no highlight over a rendered page: the threads show their quote in the panel (JAVA-797). */
export function useReadAnchors(
  _root: RefObject<HTMLElement | null>, _threads: readonly AnchorThread[], _enabled: boolean, _contentKey: string,
  _onOpen: (id: string) => void,
): string[] | null {
  return null;
}
