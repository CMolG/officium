import { shareMetadata } from "@javadaba/brand/share";
import type { Metadata } from "next";

/** The words of a documentation page's link preview (Doc-Previews): a private page in a project, openable with the link. */
export const DOCS_SHARE = {
  headline: "A private page in a project",
  subline: "Open it with the link. Only the project's members can see it.",
} as const;

/** The tags a documentation page carries for the places a link is pasted: the same words as the card, no page title. */
export const docsShareMetadata: Metadata = shareMetadata({
  title: "Officium docs",
  description: `${DOCS_SHARE.headline}. ${DOCS_SHARE.subline}`,
  url: "https://javadaba.com/officium",
});
