package com.javadaba.contexts.officium.domain;

import java.util.List;

/** {@code GET /officium/v1/projects/{id}/meta}: epics/tags/assignees actually in use, for filter
 *  dropdowns (contract §3). */
public record ProjectFacets(List<String> epics, List<String> tags, List<Assignee> assignees) {
}
