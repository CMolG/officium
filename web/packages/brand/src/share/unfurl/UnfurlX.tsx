import { UnfurlAvatar } from "./UnfurlAvatar";
import { UnfurlImage } from "./UnfurlImage";
import { COLUMN, FRAME, HELP, ROW } from "./look";
import type { UnfurlProps } from "./types";

/** A microblog: the post, then the card at the full width with its domain over the corner and "From <domain>" under it. */
export function UnfurlX({ image, alt, domain, author, handle, message, time }: UnfurlProps) {
  const tag = [handle, time].filter(Boolean).join(" · ");
  return (
    <div style={FRAME}>
      <UnfurlAvatar name={author} />
      <div style={{ ...COLUMN, gap: 8 }}>
        <span style={{ ...ROW, gap: 6 }}>
          <b>{author}</b>
          {tag && <span style={{ ...HELP, fontSize: 13 }}>{tag}</span>}
        </span>
        <span>{message}</span>
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: "0 0 0 1px rgba(17,17,17,.12)" }}>
          <UnfurlImage src={image} alt={alt} width={420} height={220} />
          <span
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(0,0,0,.66)",
              color: "#FFFFFF",
              fontSize: 12,
            }}
          >
            {domain}
          </span>
        </div>
        <span style={{ ...HELP, fontSize: 12.5 }}>From {domain}</span>
      </div>
    </div>
  );
}
