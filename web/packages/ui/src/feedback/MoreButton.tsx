"use client";

import { Glyph } from "../ui/glyph";
import { IconButton } from "../ui/icon-button";
import { useFeedbackMenu } from "./menu-registry";

export interface MoreButtonProps {
  /** Names the thing it is about, so a screen reader hears which row: "More actions for Phone layout for share". */
  "aria-label": string;
  className?: string;
}

/**
 * The visible way into the menu (Lib-Feedback § A visible More; ADR 0029): right-click and long-press are
 * gestures nothing on screen announces, so touch and keyboard reach the SAME menu from a button. It opens the
 * menu a right-click on the same row opens and draws none of its own. Outside a `FeedbackContextMenu` there is
 * no menu to open, so it renders nothing rather than a dead button.
 */
export function MoreButton({ "aria-label": label, className }: MoreButtonProps) {
  const openMenu = useFeedbackMenu();
  if (!openMenu) return null;
  return (
    <IconButton
      large
      aria-label={label}
      aria-haspopup="menu"
      className={className}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        openMenu(event.currentTarget, { x: rect.left, y: rect.bottom });
      }}
    >
      <Glyph name="more" size={18} />
    </IconButton>
  );
}
