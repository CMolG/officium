import { UnfurlImage } from "./UnfurlImage";
import { COLUMN, FRAME, HELP } from "./look";
import type { UnfurlProps } from "./types";

/** A phone's messages: the card edge to edge in a round bubble, its title and domain under it, the delivery line below. */
export function UnfurlPhone({ image, alt, title, domain, time }: UnfurlProps) {
  return (
    <div style={{ ...FRAME, flexDirection: "column", alignItems: "flex-end" }}>
      <div style={{ ...COLUMN, gap: 6, maxWidth: "100%" }}>
        <div style={{ borderRadius: 16, overflow: "hidden", background: "#E9E9EB" }}>
          <UnfurlImage src={image} alt={alt} width={400} height={210} />
          <div style={{ padding: "9px 12px 10px" }}>
            <b style={{ display: "block", fontSize: 13.5 }}>{title}</b>
            <span style={{ fontSize: 12, color: "rgba(17,17,17,.6)" }}>{domain}</span>
          </div>
        </div>
      </div>
      {time && <span style={{ ...HELP, alignSelf: "flex-end", fontSize: 11 }}>{time}</span>}
    </div>
  );
}
