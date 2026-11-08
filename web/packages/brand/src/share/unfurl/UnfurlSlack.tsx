import { UnfurlAvatar } from "./UnfurlAvatar";
import { UnfurlImage } from "./UnfurlImage";
import { COLUMN, FRAME, HELP, LINK, ROW } from "./look";
import type { UnfurlProps } from "./types";

/** A team chat: the sender, the message with its link, and the unfurl under it (site, title, line, the card). */
export function UnfurlSlack({ image, alt, title, description, author, message, link, time, site }: UnfurlProps) {
  return (
    <div style={FRAME}>
      <UnfurlAvatar name={author} />
      <div style={{ ...COLUMN, gap: 6 }}>
        <span style={{ ...ROW, gap: 8 }}>
          <b>{author}</b>
          {time && <span style={{ ...HELP, fontSize: 12 }}>{time}</span>}
        </span>
        <span>
          {message}
          {link && (
            <>
              {" "}
              <span style={{ color: LINK, textDecoration: "underline", textUnderlineOffset: 2, wordBreak: "break-all" }}>{link}</span>
            </>
          )}
        </span>
        <div style={{ ...COLUMN, gap: 4, padding: "2px 0 0 12px" }}>
          {site && <b style={{ fontSize: 13 }}>{site}</b>}
          <b style={{ color: LINK, fontSize: 15 }}>{title}</b>
          {description && <span style={{ fontSize: 13, lineHeight: 1.45 }}>{description}</span>}
          <UnfurlImage src={image} alt={alt} width={420} height={220} style={{ borderRadius: 8, marginTop: 6 }} />
        </div>
      </div>
    </div>
  );
}
