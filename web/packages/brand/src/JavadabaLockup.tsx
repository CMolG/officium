import { JavadabaMark } from "./JavadabaMark";

/**
 * The mark next to the word: the lockup (Library 11). In a navbar the mark is the black diamond
 * alone and the colors slide out on hover and focus of the link around it (`href` makes the lockup
 * that link); in a footer they stay out (`variant="spread"`, which leaves room for them on the left). The wordmark is Doto 800, 0.04em
 * apart.
 */
export function JavadabaLockup({
  href,
  size = 22,
  variant = "reveal",
  dark = false,
  className,
}: {
  href?: string;
  /** The wordmark's size in px; the mark follows it. */
  size?: number;
  variant?: "reveal" | "spread";
  /** On ink: the word turns white. */
  dark?: boolean;
  className?: string;
}) {
  const open = variant === "spread";
  const mark = <JavadabaMark variant="reveal" size={size} decorative open={open} />;
  const word = (
    <span
      style={{
        fontFamily: "var(--font-jd-display, Doto, ui-monospace, monospace)",
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "0.04em",
        color: dark ? "#FFFFFF" : "#111111",
      }}
    >
      JAVADABA
    </span>
  );
  // The colors live to the left of the black diamond: a footer, which keeps them out, leaves room.
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    paddingLeft: open ? size * 1.75 : 0,
    textDecoration: "none",
    color: "inherit",
  } as const;
  return href ? (
    <a href={href} aria-label="Javadaba home" className={className} style={style}>
      {mark}
      {word}
    </a>
  ) : (
    <span className={className} style={style} data-jd-mark-host="">
      {mark}
      {word}
    </span>
  );
}
