"use client";

import type { TheaterWindowProps } from "../types";
import { cx } from "../constants";
import { WindowTitleBar } from "./WindowTitleBar";

/** The one window on the desk: frosted glass around the stage where the real app plays. */
export function TheaterWindow({
  titleBar = true,
  className,
  style,
  children,
}: TheaterWindowProps) {
  return (
    <div
      className={cx("theater__window", className)}
      style={style}
      data-titlebar={titleBar}
    >
      {titleBar ? <WindowTitleBar /> : null}
      {children}
    </div>
  );
}
