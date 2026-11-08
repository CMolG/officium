/*
 * The four social glyphs the footer draws, and Javadaba's handles. Split out of the old
 * product-chrome.tsx when the chrome was redesigned (Lib-Chrome): the bar, the footer and the glyphs each have a file.
 */

/** The networks the footer knows how to draw. */
export type SocialNetwork = "linkedin" | "github" | "x" | "email";

export interface ProductSocialLink {
  network: SocialNetwork;
  href: string;
  /** Accessible name. Defaults to the network's own. */
  label?: string;
}

/**
 * The glyphs, drawn here instead of imported.
 *
 * `@javadaba/ui` does not depend on `lucide-react` —only `@javadaba/brand` does— and
 * adding a dependency for four paths is exactly what step 3 of the laziness algorithm
 * calls the last resort. Two of them wouldn't be right anyway: lucide still draws X as
 * the old bird, and a mail glyph mixing stroke with three filled marks reads as a
 * different weight in the same row.
 *
 * Filled and on a 24 viewBox, all four, so the row has one optical weight.
 */
const SOCIAL_GLYPHS: Record<SocialNetwork, { label: string; path: string }> = {
  linkedin: {
    label: "LinkedIn",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  github: {
    label: "GitHub",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  x: {
    label: "X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  email: {
    label: "Email",
    path: "M1.5 5.25A2.25 2.25 0 013.75 3h16.5a2.25 2.25 0 012.25 2.25v.383l-10.5 6.3-10.5-6.3zm0 2.883V18.75A2.25 2.25 0 003.75 21h16.5a2.25 2.25 0 002.25-2.25V8.133l-9.99 5.994a1.5 1.5 0 01-1.52 0z",
  },
};

/** The network's own name: the footer's default accessible name for its link. */
export function socialLabel(network: SocialNetwork): string {
  return SOCIAL_GLYPHS[network].label;
}

/**
 * One of those glyphs, decorative (the link around it carries the name). Exported because
 * lucide 1.0 dropped its brand icons, and every surface that links to GitHub or LinkedIn
 * would otherwise draw its own copy of the same path.
 */
export function SocialGlyph({
  network,
  size = 18,
  className,
}: {
  network: SocialNetwork;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d={SOCIAL_GLYPHS[network].path} />
    </svg>
  );
}

/**
 * Javadaba's four social handles. Given by the user on 2026-08-20.
 *
 * Declared here for the same reason as `JAVADABA_LINKS`: a handle copied into eight apps
 * is a handle that will be wrong in six of them the day it changes. A product that wants
 * its own —an app with its own account— passes `social` and overrides the lot.
 */
export const JAVADABA_SOCIAL: readonly ProductSocialLink[] = [
  { network: "linkedin", href: "https://www.linkedin.com/in/cmolg/" },
  { network: "github", href: "https://github.com/cmolg" },
  { network: "x", href: "https://x.com/cmolgal" },
  { network: "email", href: "mailto:cmg@javadaba.com" },
] as const;
