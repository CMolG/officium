import type { ReactNode } from "react";

import { Text } from "./text";

export interface CommandMenuEmptyProps {
  /** What was not found, in words: "Nothing called “zebra”." */
  title: ReactNode;
  /** What to try instead: "Try a page name, or an action like New card." */
  hint?: ReactNode;
  /** The wider door, as a link or a button: "Search all of Javadaba". */
  action?: ReactNode;
}

/** The command menu's empty list (Lib-Overlays § CommandMenu): never a bare "No results", always a way on. Pass it as `empty`. */
export function CommandMenuEmpty({ title, hint, action }: CommandMenuEmptyProps) {
  return (
    <div className="flex flex-col items-start gap-1.5 px-2.5 py-4">
      <Text as="p" size="sm" weight="semibold">
        {title}
      </Text>
      {hint && (
        <Text as="p" size="sm" tone="muted">
          {hint}
        </Text>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
