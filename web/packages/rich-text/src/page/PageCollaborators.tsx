"use client";

import { useRef, useSyncExternalStore } from "react";

import { AvatarGroup } from "@javadaba/ui";

import { roomPeople, watchRoom, type CollaboratorIdentity, type PageCollaboration } from "./collaboration";

/** The room's people as a value that only changes when someone really does (what `useSyncExternalStore` compares). */
function usePeople(collaboration: PageCollaboration): readonly CollaboratorIdentity[] {
  const last = useRef<{ key: string; people: readonly CollaboratorIdentity[] }>({ key: "", people: [] });
  return useSyncExternalStore(
    (notify) => watchRoom(collaboration, notify),
    () => {
      const people = roomPeople(collaboration);
      const key = JSON.stringify(people);
      if (key !== last.current.key) last.current = { key, people };
      return last.current.people;
    },
    () => last.current.people,
  );
}

/**
 * Who is editing, in the slim bar (Lib-RichText 12): their avatars, each in the color of their caret, and
 * the count in words ("2 editing") so it never rests on color or on faces alone. Nothing when the person is
 * alone in the room.
 */
export function PageCollaborators({ collaboration }: { collaboration: PageCollaboration }) {
  const people = usePeople(collaboration);
  if (people.length < 2) return null;
  return (
    <span className="flex flex-row items-center gap-2" data-testid="page-collaborators">
      <AvatarGroup people={people.map((person) => ({ name: person.name, accent: person.color }))} />
      <span className="text-xs text-[color:var(--jd-muted)]">{`${people.length} editing`}</span>
    </span>
  );
}
