import { Surface } from "../surface";
import { Text } from "../ui/text";
import { cn } from "../lib/cn";
import { encodeQr } from "./encode";

export interface QrCodeLabels {
  /** What the empty state says, as a sentence of its own. */
  empty: string;
  /** What to do about it, under the sentence. */
  emptyHelp: string;
  tooLong: string;
  tooLongHelp: string;
}

const DEFAULT_LABELS: QrCodeLabels = {
  empty: "Nothing to show yet.",
  emptyHelp: "Add a link and its code appears here.",
  tooLong: "Too long for a code.",
  tooLongHelp: "Phones can't read a code this dense. Shorten the link, or share it as text.",
};

export interface QrCodeProps {
  /** What the code opens. */
  value: string;
  /** Names the image for assistive technology: say what the code opens. */
  label: string;
  /** The sentences for the states with no code, in the caller's language: each state says what it is, then what to do. */
  labels?: Partial<QrCodeLabels>;
  className?: string;
}

/**
 * A QR code, drawn from the module matrix as one SVG path.
 *
 * It is always dark on light: a `product` island on every surface, with a 4-module quiet zone.
 * Many scanners fail on an inverted code, so it never follows the page's surface. Encoding is
 * synchronous, so there is no loading state; with no code, a sentence says why and what to do. Lives on
 * `@javadaba/ui/qr` so `qrcode` only reaches the bundles that draw one.
 */
export function QrCode({ value, label, labels, className }: QrCodeProps) {
  const encoded = encodeQr(value);
  const words = { ...DEFAULT_LABELS, ...labels };
  return (
    <Surface
      kind="product"
      className={cn(
        "rounded-sm bg-[color:var(--jd-raised)] text-[color:var(--jd-ink)]",
        // The sentence gets a floor, not a height, so it can grow with enlarged text (WCAG 1.4.4).
        encoded.ok ? "size-48" : "flex w-48 min-h-48 flex-col items-center justify-center gap-1 p-4 text-center",
        className,
      )}
    >
      {encoded.ok ? (
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${encoded.modules} ${encoded.modules}`}
          shapeRendering="crispEdges"
          className="block size-full"
        >
          {/* The quiet zone is painted INSIDE the image: Chrome's forced dark darkens the
              island's CSS background but not an SVG's own fills, which left dark modules on a
              darkened box, unreadable (JAVA-1297 review probe). */}
          <rect width={encoded.modules} height={encoded.modules} className="fill-[color:var(--jd-raised)]" />
          <path d={encoded.path} fill="currentColor" />
        </svg>
      ) : (
        <>
          <Text as="p" type="ui" weight="semibold">
            {encoded.problem === "empty" ? words.empty : words.tooLong}
          </Text>
          <Text as="p" type="caption" tone="muted">
            {encoded.problem === "empty" ? words.emptyHelp : words.tooLongHelp}
          </Text>
        </>
      )}
    </Surface>
  );
}
