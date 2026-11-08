import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/cn";
import { inkOn } from "../lib/luminance";

/*
 * Avatar — a person as an ink disc with initials (Lib-Controls `.av`): 28 / 40 / 56. With a photo
 * (`src`) the photo fills it. The name is the accessible label, so the initials are `aria-hidden`.
 * No color per person: the house does not hand out a palette to tell people apart; the name does.
 *
 * People and agents are told apart by SHAPE (Lib-Pieces § Card · Avatar): people are round; an agent
 * (`agent`) is a rounded square that carries the app's accent and draws its own glyph (`icon`) instead of
 * initials. `presence` draws the small dot of someone who is here now; it always needs a line of text
 * beside it ("Editing now") or in the name's label, because a dot alone is color alone.
 */

export type AvatarSize = "s" | "m" | "l";

const SIZES: Record<AvatarSize, string> = {
  s: "size-7 text-[10px]",
  m: "size-10 text-[13px]",
  l: "size-14 text-[17px]",
};

/** "Sam Rivera" -> "SR", "sam" -> "S", "" -> "". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

export interface AvatarProps extends Omit<ComponentProps<"span">, "children"> {
  /** Who it is. Read out as the avatar's name. */
  name: string;
  size?: AvatarSize;
  /** A photo. Without one, the initials are drawn. */
  src?: string;
  /** An agent, not a person: a rounded square, in the app's accent when one is given. */
  agent?: boolean;
  /** The agent's glyph, drawn instead of initials. */
  icon?: ReactNode;
  /** The app's accent for an agent (a hex color); its ink is chosen to read on it. */
  accent?: string;
  /** Here now: the dot. Put a line of text beside it. */
  presence?: boolean;
}

export function Avatar({ name, size = "m", src, agent = false, icon, accent, presence = false, className, style, ...rest }: AvatarProps) {
  const face = (
    <span
      role="img"
      aria-label={name}
      data-jd-component="Avatar"
      data-shape={agent ? "agent" : "person"}
      style={accent && agent ? { ...style, backgroundColor: accent, color: inkOn(accent) } : style}
      className={cn(
        "flex shrink-0 flex-row items-center justify-center overflow-hidden font-bold",
        agent ? "rounded-[10px]" : "rounded-full",
        accent && agent ? "" : "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]",
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a person's photo of unknown size and origin
        <img src={src} alt="" className="size-full object-cover" />
      ) : icon ? (
        <span aria-hidden="true" className="flex flex-row items-center justify-center [&>svg]:size-1/2">
          {icon}
        </span>
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
  if (!presence) return face;
  return (
    <span className="relative inline-flex shrink-0 flex-row">
      {face}
      <span aria-hidden="true" className="absolute bottom-0 right-0 size-3 rounded-full bg-[color:var(--jd-ok)] shadow-[0_0_0_2px_var(--jd-page)]" />
    </span>
  );
}
