"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { markdownHeadings, markdownWordCount } from "@javadaba/rich-text";
import { viewportSize } from "@javadaba/sdk/platform";

import { useReadingPref } from "../../lib/docs/reading-prefs";
import { jumpToHeading } from "./heading-jump";
import { useContentsShortcut } from "./use-contents-shortcut";

/** Tailwind's `lg`: from here the contents is a panel beside the page, below it a popover. */
const LG = 1024;

/** What reading a page needs (JAVA-795): its contents, the word count, and jumping to a heading. */
export function useDocReading(body: string) {
  const [panelShown, setPanelShown] = useReadingPref("contents");
  const [showWordCount, setShowWordCount] = useReadingPref("wordCount");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const headings = useMemo(() => markdownHeadings(body).filter((h) => !h.inDetails && h.level <= 4), [body]);
  const words = useMemo(() => (showWordCount ? markdownWordCount(body) : 0), [showWordCount, body]);

  const toggleContents = useCallback(() => {
    if ((viewportSize()?.w ?? LG) >= LG) setPanelShown(!panelShown);
    else setPopoverOpen((open) => !open);
  }, [panelShown, setPanelShown]);
  useContentsShortcut(toggleContents);

  const jump = useCallback((id: string) => jumpToHeading(bodyRef.current, id), []);

  return { panelShown, setPanelShown, showWordCount, setShowWordCount, popoverOpen, setPopoverOpen, bodyRef, headings, words, jump };
}
