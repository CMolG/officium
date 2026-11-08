import { UnfurlAvatar } from "./UnfurlAvatar";
import { UnfurlImage } from "./UnfurlImage";
import { COLUMN, FRAME, HELP, ROW } from "./look";
import type { UnfurlProps } from "./types";

/** A professional network: the post, then the card with its title and domain in a grey band under it. */
export function UnfurlLinkedIn({ image, alt, title, domain, author, subline, message }: UnfurlProps) {
  return (
    <div style={{ ...FRAME, flexDirection: "column" }}>
      <span style={{ ...ROW, gap: 10 }}>
        <UnfurlAvatar name={author} />
        <span style={{ ...COLUMN, gap: 1 }}>
          <b>{author}</b>
          {subline && <span style={{ ...HELP, fontSize: 12 }}>{subline}</span>}
        </span>
      </span>
      <span>{message}</span>
      <div style={{ boxShadow: "0 0 0 1px rgba(17,17,17,.1)", borderRadius: 8, overflow: "hidden" }}>
        <UnfurlImage src={image} alt={alt} width={420} height={220} />
        <div style={{ padding: "10px 12px", background: "#F3F2EF" }}>
          <b style={{ fontSize: 14 }}>{title}</b>
          <span style={{ ...HELP, display: "block", fontSize: 12 }}>{domain}</span>
        </div>
      </div>
    </div>
  );
}
