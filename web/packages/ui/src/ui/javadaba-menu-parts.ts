import type { ElementType, ReactNode } from "react";

import { JAVADABA_APPS, JAVADABA_MENU_LINKS, type ProductAppLink, type ProductNavLink } from "./javadaba-links";

export interface JavadabaMenuProps {
  /** The product this menu sits on: its tile in the launcher is marked as the current one. */
  current?: string;
  /** The session's header -- who you are, your balance, your notifications (`AccountMenuRow`), or the guest card. */
  accountSlot?: ReactNode;
  /** The session's actions at the bottom -- Account and settings, Sign out (`AccountMenuActions`). */
  accountActionsSlot?: ReactNode;
  /** The launcher. Defaults to `JAVADABA_APPS`; `false` hides it. */
  apps?: readonly ProductAppLink[] | false;
  /** The launcher's heading: "Your apps" when signed in, "Apps in the house" for a visitor. */
  appsLabel?: string;
  /** The rest of the house. Defaults to `JAVADABA_MENU_LINKS`; `false` hides them. */
  ecosystem?: readonly ProductNavLink[] | false;
  linkAs?: ElementType;
  /** `light` paints the diamond white, for a bar that is black whatever the surface says. */
  sealTone?: "dark" | "light";
  className?: string;
}

/** What the menu holds, without the diamond that opens it. */
export type JavadabaMenuContentProps = Omit<JavadabaMenuProps, "sealTone" | "className">;

export function menuParts({ apps = JAVADABA_APPS, ecosystem = JAVADABA_MENU_LINKS }: JavadabaMenuContentProps) {
  return {
    launcher: apps || [],
    links: ecosystem && ecosystem.length > 0 ? ecosystem : [],
  };
}

export function isMenuEmpty(props: JavadabaMenuContentProps): boolean {
  const { launcher, links } = menuParts(props);
  return !props.accountSlot && launcher.length === 0 && links.length === 0 && !props.accountActionsSlot;
}
