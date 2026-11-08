import type { ComponentProps } from "react";

import { cn } from "../lib/cn";
import { Avatar, type AvatarProps, type AvatarSize } from "./avatar";

export interface AvatarGroupProps extends Omit<ComponentProps<"span">, "children"> {
  /** Everyone in the group, in the order they are shown. */
  people: Pick<AvatarProps, "name" | "src" | "agent" | "icon" | "accent">[];
  /** How many faces before the "+N". Default 3. */
  max?: number;
  size?: AvatarSize;
}

/**
 * A row of overlapping avatars with the rest counted ("+3"). The names are read out as one list, so the count
 * is a number of people and never a mystery disc. Each face keeps the page color around it so the overlap reads.
 */
export function AvatarGroup({ people, max = 3, size = "s", className, ...rest }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <span
      role="group"
      aria-label={people.map((person) => person.name).join(", ")}
      data-jd-component="AvatarGroup"
      className={cn("inline-flex flex-row items-center", className)}
      {...rest}
    >
      {shown.map((person, index) => (
        <Avatar key={`${person.name}-${index}`} size={size} {...person} className={cn("shadow-[0_0_0_2px_var(--jd-page)]", index > 0 && "-ml-2")} />
      ))}
      {more > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "-ml-2 flex shrink-0 flex-row items-center justify-center rounded-full bg-[color:var(--jd-ink)] font-bold text-[color:var(--jd-page)] shadow-[0_0_0_2px_var(--jd-page)]",
            size === "s" ? "size-7 text-[10px]" : size === "m" ? "size-10 text-[13px]" : "size-14 text-[17px]",
          )}
        >
          +{more}
        </span>
      )}
    </span>
  );
}
