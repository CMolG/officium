"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "@javadaba/ui";

import type { DocCommentEntry, DocReaction } from "../../../lib/backlog/types";

/** Six to pick from at a glance; any other single emoji is typed into the field beside them. */
export const QUICK_EMOJI = ["👍", "👎", "🎉", "❤️", "👀", "🚀"] as const;

const names = (reaction: DocReaction) => reaction.by.map((who) => who.name).join(", ");

/**
 * A comment's reactions (JAVA-797): one chip per emoji with how many, which toggles your own, and names who
 * reacted in its accessible name and title. Adding one opens a popover with six quick emoji and a field for one
 * of your own. A reader who cannot comment sees the chips and nothing to press.
 */
export function DocReactions({ entry, me, canWrite, onReact, onUnreact }: {
  entry: DocCommentEntry;
  me: string | undefined;
  canWrite: boolean;
  /** Resolve to a problem to show, or `null`. */
  onReact: (emoji: string) => Promise<string | null>;
  onUnreact: (emoji: string) => Promise<string | null>;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [own, setOwn] = useState("");

  async function toggle(reaction: DocReaction) {
    const mine = reaction.by.some((who) => who.accountId === me);
    setProblem(await (mine ? onUnreact(reaction.emoji) : onReact(reaction.emoji)));
  }

  async function add(emoji: string) {
    setOpen(false);
    setOwn("");
    setProblem(await onReact(emoji));
  }

  if (entry.reactions.length === 0 && !canWrite) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row flex-wrap items-center gap-1" role="group" aria-label="Reactions">
        {entry.reactions.map((reaction) => {
          const mine = reaction.by.some((who) => who.accountId === me);
          const label = `${reaction.emoji} from ${names(reaction)}${mine ? " (including you)" : ""}`;
          return (
            <button
              key={reaction.emoji}
              type="button"
              aria-pressed={mine}
              aria-label={label}
              title={names(reaction)}
              disabled={!canWrite}
              onClick={() => void toggle(reaction)}
              className={`flex min-h-11 flex-row items-center gap-1 rounded-full border px-3 text-sm ${
                mine ? "border-[color:var(--jd-ink)]/50 bg-[color:var(--jd-ink)]/[0.1]" : "border-[color:var(--jd-control-border)]"
              }`}
            >
              <span aria-hidden="true">{reaction.emoji}</span>
              <span className="tabular-nums">{reaction.by.length}</span>
            </button>
          );
        })}
        {canWrite && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" register="ui" size="icon" variant="ghost" className="size-11" aria-label="Add a reaction">
                <SmilePlus size={16} aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-64 flex-col gap-2 p-2">
              <div className="flex flex-row flex-wrap gap-1">
                {QUICK_EMOJI.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`React with ${emoji}`}
                    onClick={() => void add(emoji)}
                    className="flex size-11 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] text-lg hover:bg-[color:var(--jd-ink)]/[0.06]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <form
                className="flex flex-row gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (own.trim()) void add(own.trim());
                }}
              >
                <Input value={own} onChange={(event) => setOwn(event.target.value)} aria-label="Or one emoji of your own" placeholder="Or one emoji" className="min-h-11" />
                <Button type="submit" register="ui" size="sm" className="min-h-11" disabled={!own.trim()} title={own.trim() ? "React" : "Type one emoji first"}>
                  React
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {problem && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
