import type { DocPage } from "../../backlog/types";

/** A version a room's saver wrote carries its co-authors; an agent's or a lone client's write does not (JAVA-1477). */
export const isRoomSave = (page: Pick<DocPage, "coAuthors">) => (page.coAuthors?.length ?? 0) > 0;
