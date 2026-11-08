import type { ReactNode } from "react";

/**
 * A table inside a frame that scrolls sideways (JAVA-1556): the table keeps the width its columns
 * need instead of squeezing them to their words. The frame is focusable and named so a keyboard
 * can scroll it.
 */
export function TableView({ children }: { children?: ReactNode }) {
  return (
    <div className="jd-table-scroll" role="region" aria-label="Table, scrolls sideways" tabIndex={0}>
      <table>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
