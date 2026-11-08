import type { ReactNode } from "react";

import { Button } from "./button";
import { Text } from "./text";

/*
 * MenuGuest -- the Javadaba menu's top section for a visitor (Lib-Chrome, "Panel . signed out"): a
 * drawing, one line that says what an account is for, a free account to create and a way to sign in.
 * Pass it as the menu's `accountSlot`. It holds no session; each action is a link or a handler the
 * caller owns, so the one login stays where it lives (`@javadaba/account`).
 */

export interface MenuGuestAction {
  /** A link. Without it the action is a button that calls `onClick`. */
  href?: string;
  onClick?: () => void;
}

export interface MenuGuestProps {
  /** The kid's drawing (`<Doodle name="salute" size={64} decorative />` from `@javadaba/brand/doodles`). */
  art?: ReactNode;
  title?: string;
  note?: string;
  create: MenuGuestAction;
  signIn: MenuGuestAction;
  createLabel?: string;
  signInLabel?: string;
}

function action({ href, onClick }: MenuGuestAction, label: string, cta: boolean) {
  const content = <Text>{label}</Text>;
  const props = cta
    ? ({ register: "cta", variant: "solid", size: "sm" } as const)
    : ({ register: "ui", variant: "ghost", size: "md" } as const);
  return href ? (
    <Button asChild {...props} className="w-full">
      <a href={href} onClick={onClick}>
        {content}
      </a>
    </Button>
  ) : (
    <Button {...props} className="w-full" onClick={onClick}>
      {content}
    </Button>
  );
}

export function MenuGuest({
  art,
  title = "One key for every room.",
  note = "Free, no card.",
  create,
  signIn,
  createLabel = "Create free account",
  signInLabel = "Sign in",
}: MenuGuestProps) {
  return (
    <div className="flex flex-col gap-3 px-1 pb-1 pt-1">
      <div className="flex flex-row items-center gap-3">
        {art}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="m-0 font-[family-name:var(--font-jd-display)] text-2xl font-bold leading-none text-[color:var(--jd-ink)]">
            {title}
          </p>
          <p className="m-0 text-xs text-[color:var(--jd-faint)]">{note}</p>
        </div>
      </div>
      {action(create, createLabel, true)}
      {action(signIn, signInLabel, false)}
    </div>
  );
}
