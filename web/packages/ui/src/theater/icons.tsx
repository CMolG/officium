import type { ReactNode } from "react";

/* Lucide strokes at the Theater's sizes (Lib-Theater): drawn, never imported, so the player stays one folder. */
function stroke(size: number, width: number, children: ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ICON_PLAY = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l12-7.5z" />
  </svg>
);

export const ICON_PAUSE = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" />
  </svg>
);

export const ICON_LOOP = stroke(
  13,
  2.2,
  <>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </>,
);

export const ICON_LIVE = stroke(
  14,
  2,
  <>
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8a6 6 0 0 1 0 8.5m-8.4-.1a6 6 0 0 1 0-8.4m11.3-2.9a10 10 0 0 1 0 14.2m-14.2 0a10 10 0 0 1 0-14.2" />
  </>,
);

export const ICON_OPEN = stroke(
  13,
  2.2,
  <>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </>,
);

export const ICON_INFO = stroke(
  14,
  2,
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </>,
);

/** The window's controls, drawn but inert. */
export const WINDOW_CONTROLS = [
  stroke(13, 2, <path d="M5 12h14" />),
  stroke(13, 2, <rect width="14" height="14" x="5" y="5" rx="2" />),
  stroke(13, 2, <path d="M18 6 6 18M6 6l12 12" />),
];

export const CURSOR = (
  <svg viewBox="0 0 20 24" aria-hidden="true">
    <path
      d="M4 2v18l4.6-4.5L11.8 22l3-1.3-3.2-6.4H18z"
      fill="#fff"
      stroke="#111"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);
