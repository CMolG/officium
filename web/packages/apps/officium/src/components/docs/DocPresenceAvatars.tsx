import { Eye, Pencil } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@javadaba/ui";

import type { DocPresencePerson } from "../../lib/backlog/types";
import { presenceTint } from "../../lib/docs/presence/presence-tint";
import { follow, stopFollowing, useFollowable, useFollowing } from "../../lib/docs/room/follow-store";

const MAX_SHOWN = 4;

const initialOf = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? "?";

/** "Ana (editing), Ben (viewing)": what the avatars say, for a screen reader and for the list. */
const summary = (people: DocPresencePerson[]) => people.map((p) => `${p.name} (${p.state})`).join(", ");

/**
 * Who else is on this page (JAVA-802): up to four initials, then "+N", and a tap lists everyone.
 * People only, and never you. Editing is a pencil and the word, never colour alone: the tint is
 * decoration. Alone on the page, nothing is drawn.
 */
export function DocPresenceAvatars({ people }: { people: DocPresencePerson[] }) {
  const followable = useFollowable();
  const following = useFollowing();
  if (people.length === 0) return null;
  const shown = people.slice(0, MAX_SHOWN);
  const more = people.length - shown.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          register="ui"
          variant="ghost"
          size="sm"
          data-testid="doc-presence"
          aria-label={`On this page: ${summary(people)}`}
          className="min-h-11 min-w-11 px-1"
        >
          <span className="flex flex-row items-center gap-0.5" aria-hidden="true">
            {shown.map((person) => (
              <span
                key={person.accountId}
                data-testid="doc-presence-avatar"
                data-state={person.state}
                className="relative flex flex-row size-7 items-center justify-center rounded-full border-2 border-[color:var(--jd-page)] text-xs font-bold text-[color:var(--jd-page)]"
                style={{ backgroundColor: presenceTint(person.accountId) }}
              >
                {initialOf(person.name)}
                {person.state === "editing" && (
                  <span className="absolute -bottom-1 -right-1 flex flex-row size-3.5 items-center justify-center rounded-full bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]">
                    <Pencil size={8} />
                  </span>
                )}
              </span>
            ))}
            {more > 0 && (
              <span className="relative flex flex-row size-7 items-center justify-center rounded-full border-2 border-[color:var(--jd-page)] bg-[color:var(--jd-ink)]/[0.12] text-xs font-bold">
                +{more}
              </span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 max-w-64 p-2">
        <ul aria-label="People on this page" className="flex flex-col gap-1">
          {people.map((person) => (
            <li key={person.accountId} className="flex min-h-11 flex-row items-center gap-2 px-2 text-sm">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: presenceTint(person.accountId) }} aria-hidden="true" />
              <span className="min-w-0 break-words">
                <span className="font-medium">{person.name}</span> <span className="text-[color:var(--jd-muted)]">· {person.state}</span>
              </span>
              {followable.has(person.accountId) && (
                <Button
                  type="button"
                  register="ui"
                  variant="ghost"
                  size="sm"
                  className="ml-auto min-h-11 shrink-0"
                  aria-pressed={following?.accountId === person.accountId}
                  onClick={() => (following?.accountId === person.accountId ? stopFollowing() : follow({ accountId: person.accountId, name: person.name }))}
                >
                  <Eye size={14} aria-hidden="true" />
                  {following?.accountId === person.accountId ? "Stop following" : "Follow"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
