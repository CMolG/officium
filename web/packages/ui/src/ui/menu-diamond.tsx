"use client";

import { JavadabaLogo } from "@javadaba/brand";

import { DiamondMark } from "./diamond-mark";
import { useMenuUnread } from "./menu-unread";
import { Text } from "./text";

/*
 * The Javadaba menu's diamond: the seal (the black diamond of `JavadabaLogo format="spinner"`) that turns a
 * quarter when the menu opens and back when it closes, with the overshoot-and-settle of the spinner's `bouncy`
 * curve, over 500 ms (user decision, 2026-09-15). The redesign had swapped it for a plain diamond that only eased a
 * quarter; the user asked for the seal and its motion back on 2026-11-02. `tokens.css` flattens the turn under
 * reduced motion. It carries the count of what is waiting on it (up to 9+). The NUMBER is the signal, so it is also in the
 * control's name -- "Javadaba menu, 3 unread", "Javadaba menu, more than 9 unread" -- and the name
 * changes to "Close Javadaba menu" while the panel is open. A `<details>` cannot swap an attribute
 * with its state, so both names are in the tree and CSS shows the one that applies.
 *
 * Must sit inside the `<summary>` of an element with the `group` class.
 */
export function MenuDiamond({ onInk }: { onInk?: boolean }) {
  const unread = useMenuUnread();
  const waiting = unread > 9 ? "more than 9 unread" : `${unread} unread`;

  return (
    <>
      <DiamondMark
        onInk={onInk}
        count={unread}
        mark={
          <span aria-hidden="true" className="flex flex-row transition-[rotate] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-open:rotate-90">
            <JavadabaLogo brand="javadaba" format="spinner" tone={onInk ? "light" : "dark"} size={26} />
          </span>
        }
      />
      <span className="sr-only group-open:hidden">
        <Text>{unread > 0 ? `Javadaba menu, ${waiting}` : "Javadaba menu"}</Text>
      </span>
      <span className="sr-only hidden group-open:inline">
        <Text>Close Javadaba menu</Text>
      </span>
    </>
  );
}
