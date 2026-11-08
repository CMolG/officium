import type { ReactNode } from "react";

import type { ToastVariant } from "./toast.shared";

/*
 * The variant as a shape, so colour is never the only channel (interface-psychology point 4). The
 * default notice has none: a plain sentence needs no mark.
 */
const GLYPHS: Partial<Record<ToastVariant, ReactNode>> = {
  success: (
    <>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M5.2 8.3l2 2 3.6-4" />
    </>
  ),
  error: (
    <>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 7.2v4" />
      <circle cx="8" cy="4.9" r="0.6" fill="currentColor" />
    </>
  ),
  warning: (
    <>
      <path d="M8 2.4l6.1 10.8H1.9z" />
      <path d="M8 6.6v3" />
      <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
    </>
  ),
};

export function ToastGlyph({ variant }: { variant: ToastVariant }) {
  const shape = GLYPHS[variant];
  if (!shape) return null;
  return (
    <svg
      aria-hidden
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="shrink-0 text-[color:var(--jd-page)]"
    >
      {shape}
    </svg>
  );
}
