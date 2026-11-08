import type { Extensions } from "@tiptap/core";

export interface CollaboratorIdentity {
  name: string;
  color: string;
  accountId?: string;
}

export interface PageCollaboration {
  doc: unknown;
  awareness: unknown;
  user: CollaboratorIdentity;
}

/** No live room on Android (see below): nobody else is editing. */
export function roomPeople(_collaboration: PageCollaboration): CollaboratorIdentity[] {
  return [];
}

export function watchRoom(_collaboration: PageCollaboration, _notify: () => void): () => void {
  return () => {};
}

/** Android draws TipTap inside a DOM component: live editing is the web half's (JAVA-803). */
export function collaborationExtensions(): Extensions {
  return [];
}
