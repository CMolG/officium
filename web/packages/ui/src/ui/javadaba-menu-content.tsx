import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { linkKey, linkTag } from "./javadaba-links";
import { isMenuEmpty, menuParts, type JavadabaMenuContentProps } from "./javadaba-menu-parts";
import { MenuApps } from "./menu-apps";
import { MenuRule } from "./menu-rule";
import { Text } from "./text";

/**
 * The menu's sections -- you, your apps, the rest of the house and your account's actions -- in flow,
 * for a surface that has no room for the diamond. An installed Sonus hides the diamond and shows this
 * inside its Settings (card://JAVA-227), so the account stays one tap away. It is the same content the
 * panel renders, never a second menu: a fragment, so the caller's container decides the box.
 */
export function JavadabaMenuContent(props: JavadabaMenuContentProps) {
  if (isMenuEmpty(props)) return null;
  const { accountSlot, accountActionsSlot, appsLabel = "Apps", current, linkAs: LinkAs = "a" } = props;
  const { launcher, links } = menuParts(props);

  // The sections in order; a rule goes between two of them, never after the last.
  const sections: ReactNode[] = [];

  if (accountSlot) sections.push(<div key="account">{accountSlot}</div>);

  if (launcher.length > 0) {
    sections.push(<MenuApps key="apps" apps={launcher} label={appsLabel} current={current} />);
  }

  if (links.length > 0) {
    sections.push(
      <ul key="links" className="flex flex-row flex-wrap gap-x-4 gap-y-0.5 px-2">
        {links.map((link) => {
          const Tag = linkTag(link, LinkAs);
          return (
            <li key={linkKey(link)}>
              <Tag
                href={link.href}
                className={cn(
                  "flex min-h-8 flex-row items-center rounded-md text-sm text-[color:var(--jd-muted)] underline-offset-4",
                  "transition-colors duration-[var(--jd-dur-fast)] hover:text-[color:var(--jd-ink)] hover:underline",
                  FOCUS_RING,
                )}
              >
                <Text>{link.label}</Text>
              </Tag>
            </li>
          );
        })}
      </ul>,
    );
  }

  return (
    <>
      {sections.flatMap((section, i) =>
        i < sections.length - 1 ? [section, <MenuRule key={`rule-${i}`} />] : [section],
      )}
      {accountActionsSlot && (
        <>
          {sections.length > 0 && <MenuRule />}
          {accountActionsSlot}
        </>
      )}
    </>
  );
}
