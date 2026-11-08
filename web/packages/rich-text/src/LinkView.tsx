"use client";

import { createContext, useContext, type ReactNode } from "react";
import { isAllowedUri } from "@tiptap/extension-link";

/** What a caller of MarkdownView draws a link with, when it can resolve the target itself. */
export type RenderLink = (href: string, children: ReactNode) => ReactNode | null;

/** Schemes a link must never carry, whatever draws it. Leading spaces and controls are ignored. */
const SCRIPT_SCHEME = /^[\s\u0000-\u001f]*(javascript|data|vbscript):/i;

export const RenderLinkContext = createContext<RenderLink | null>(null);

/** A link the caller may draw itself (`renderLink`); otherwise the plain link TipTap would draw. */
export function LinkView({ mark, children }: { mark: { attrs: Record<string, unknown> }; children?: ReactNode }) {
  const renderLink = useContext(RenderLinkContext);
  const href = typeof mark.attrs.href === "string" ? mark.attrs.href : "";
  // The caller sees any target that cannot run code, a scheme the browser doesn't know included
  // (`doc://`): it decides what that target means. The plain link keeps TipTap's own allowlist.
  const resolved = renderLink && href && !SCRIPT_SCHEME.test(href) ? renderLink(href, children) : null;
  const safe = isAllowedUri(href) ? href : "";
  return (
    resolved ?? (
      <a href={safe} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    )
  );
}
