import type { Extensions } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import type { Awareness } from "y-protocols/awareness";
import type { Doc } from "yjs";

/** The person a caret belongs to: the name it carries, in the colour of their avatar. */
export interface CollaboratorIdentity {
  name: string;
  color: string;
  /** Who the caret belongs to, so a host can find it (observer mode, JAVA-803). */
  accountId?: string;
}

/** A documentation room as the editor sees it (JAVA-803, ADR 0024): a Yjs document and its awareness. */
export interface PageCollaboration {
  doc: Doc;
  awareness: Awareness;
  user: CollaboratorIdentity;
}

/** Everyone in the room, the person included, in a stable order: what the bar's avatars and "2 editing" count. */
export function roomPeople({ awareness }: PageCollaboration): CollaboratorIdentity[] {
  const people: Array<{ id: number; user: CollaboratorIdentity }> = [];
  for (const [id, state] of awareness.getStates()) {
    const user = (state as { user?: CollaboratorIdentity }).user;
    if (user?.name) people.push({ id, user });
  }
  return people.sort((a, b) => a.id - b.id).map((person) => person.user);
}

/** Calls `notify` whenever someone joins, leaves or changes; returns the way to stop. */
export function watchRoom({ awareness }: PageCollaboration, notify: () => void): () => void {
  awareness.on("change", notify);
  return () => awareness.off("change", notify);
}

/** The editor's content is the room's `default` fragment; carets come from the room's awareness. */
export function collaborationExtensions({ doc, awareness, user }: PageCollaboration): Extensions {
  return [
    Collaboration.configure({ document: doc }),
    CollaborationCaret.configure({
      provider: { awareness },
      user,
      render: (who) => {
        const caret = document.createElement("span");
        caret.className = "jd-collab-caret";
        caret.style.setProperty("--jd-collab-color", String(who.color));
        if (who.accountId) caret.dataset.account = String(who.accountId);
        const label = document.createElement("span");
        label.className = "jd-collab-caret-label";
        label.textContent = String(who.name);
        caret.append(label);
        return caret;
      },
      selectionRender: (who) => ({
        nodeName: "span",
        class: "jd-collab-selection",
        style: `--jd-collab-color: ${String(who.color)}`,
      }),
    }),
  ];
}
