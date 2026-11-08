import { UnfurlImage } from "./UnfurlImage";
import { COLUMN, FRAME, HELP, LINK } from "./look";
import type { UnfurlProps } from "./types";

/** A messenger: one bubble holding the card with its title, line and domain, then the sender's words and the time. */
export function UnfurlMessenger({ image, alt, title, description, domain, message, link, time }: UnfurlProps) {
  return (
    <div style={{ ...FRAME, background: "#EFEAE2", alignItems: "flex-end" }}>
      <div style={{ ...COLUMN, gap: 6, padding: "6px 6px 8px", borderRadius: 12, background: "#E7EFE3", maxWidth: "100%" }}>
        <div style={{ borderRadius: 8, overflow: "hidden", background: "rgba(17,17,17,.05)" }}>
          <UnfurlImage src={image} alt={alt} width={400} height={210} />
          <div style={{ ...COLUMN, padding: "8px 10px", gap: 2 }}>
            <b style={{ fontSize: 13.5 }}>{title}</b>
            {description && <span style={{ fontSize: 12.5, color: "rgba(17,17,17,.7)" }}>{description}</span>}
            <span style={{ fontSize: 12, color: "rgba(17,17,17,.55)" }}>{domain}</span>
          </div>
        </div>
        <span style={{ fontSize: 14 }}>
          {message}
          {link && (
            <>
              {" "}
              <span style={{ color: LINK, textDecoration: "underline", textUnderlineOffset: 2, wordBreak: "break-all" }}>{link}</span>
            </>
          )}
        </span>
        {time && <span style={{ ...HELP, alignSelf: "flex-end", fontSize: 11 }}>{time}</span>}
      </div>
    </div>
  );
}
