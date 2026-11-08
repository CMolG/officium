package com.javadaba.contexts.officium.domain;

import java.util.List;

/**
 * One search result: the page without its body and the excerpt that shows why it matched (empty
 * past the first {@link DocSearchQuery#SNIPPETS}).
 */
public record DocSearchHit(DocPageSummary page, List<DocSnippet.Part> snippet) {
}
