import { SHARE_PADDING } from "../spec";
import { Headline } from "./headline";

/** The item's column: kicker, headline, one line. Left 56, top 196, 560 wide. */
export function ItemText({
  kicker,
  headline,
  subline,
  size,
  ink,
  color = "#111111",
  muted = "rgba(17,17,17,.7)",
}: {
  kicker: string;
  headline: string;
  subline?: string;
  size: number;
  ink: string;
  color?: string;
  muted?: string;
}) {
  return (
    <div style={{ display: "flex", position: "absolute", left: SHARE_PADDING, top: 196, width: 560, flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          marginBottom: 16,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 22 * 0.14,
          textTransform: "uppercase",
          color: ink,
        }}
      >
        {kicker}
      </div>
      <Headline text={headline} size={size} color={color} ink={ink} align="left" maxWidth={560} />
      {subline && (
        <div style={{ display: "flex", marginTop: 18, fontSize: 28, lineHeight: 1.4, fontWeight: 500, color: muted }}>
          {subline}
        </div>
      )}
    </div>
  );
}
