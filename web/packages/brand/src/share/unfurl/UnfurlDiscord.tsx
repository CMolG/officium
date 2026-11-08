import { UnfurlAvatar } from "./UnfurlAvatar";
import { UnfurlImage } from "./UnfurlImage";
import { COLUMN, FRAME, ROW } from "./look";
import type { UnfurlProps } from "./types";

const EMBED_LINK = "#8AB4FF";

/** A community chat, on its dark ground: the message with its link, then an embed (site, title, line, the card). */
export function UnfurlDiscord({ image, alt, title, description, author, message, link, time, site }: UnfurlProps) {
  return (
    <div style={{ ...FRAME, background: "#2B2D31", boxShadow: "none" }}>
      <UnfurlAvatar name={author} round />
      <div style={{ ...COLUMN, gap: 6 }}>
        <span style={{ ...ROW, gap: 8 }}>
          <b style={{ color: "#FFFFFF" }}>{author}</b>
          {time && <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{time}</span>}
        </span>
        <span style={{ color: "rgba(255,255,255,.88)" }}>
          {message}
          {link && (
            <>
              {" "}
              <span style={{ color: EMBED_LINK }}>{link}</span>
            </>
          )}
        </span>
        <div style={{ ...COLUMN, gap: 6, padding: "12px 14px", borderRadius: 6, background: "#232428" }}>
          {site && <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{site}</span>}
          <b style={{ color: EMBED_LINK, fontSize: 15 }}>{title}</b>
          {description && <span style={{ fontSize: 13, color: "rgba(255,255,255,.8)", lineHeight: 1.45 }}>{description}</span>}
          <UnfurlImage src={image} alt={alt} width={400} height={210} style={{ borderRadius: 8, marginTop: 6 }} />
        </div>
      </div>
    </div>
  );
}
