package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocMove;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocPageSummary;
import com.javadaba.contexts.officium.domain.DocTemplate;
import com.javadaba.contexts.officium.domain.DocTree;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.DocNodeRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

/**
 * The template rules of a page write (JAVA-801, design §6), apart so {@link DocService} stays the
 * write itself. A template is born one ({@code template: true} on a create, never a draft) and a page
 * is born from one ({@code fromTemplate} on a create, with no body): the server fills it, so the web,
 * REST and MCP write the same page.
 */
@ApplicationScoped
public class DocTemplates {

    private final DocPageRepository pages;
    private final DocNodeRepository nodes;
    private final ProjectAccessGuard guard;

    public DocTemplates(DocPageRepository pages, DocNodeRepository nodes, ProjectAccessGuard guard) {
        this.pages = pages;
        this.nodes = nodes;
        this.guard = guard;
    }

    /** What a write asks of templates; {@link #NONE} on a plain write. {@code timeZone} dates a fill. */
    public record Request(Boolean template, String fromTemplate, String timeZone) {

        public static final Request NONE = new Request(null, null, null);

        boolean makesTemplate() {
            return Boolean.TRUE.equals(template);
        }

        boolean asksAnything() {
            return makesTemplate() || fromTemplate != null;
        }
    }

    /** What a create writes: its title and body, filled when it came from a template, and whether it is one. */
    record Content(String title, String body, boolean template) {
    }

    public List<DocTemplateView> list(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return pages.listTemplates(projectId).stream().map(DocTemplateView::of).toList();
    }

    /** The combinations no write may ask for, refused before anything is read. */
    static void requireCoherent(Request request, String body, Boolean draft) {
        if (request.makesTemplate() && request.fromTemplate() != null) {
            throw OfficiumException.badRequest("template_and_from_template", "Send `template` to make a template "
                    + "or `fromTemplate` to make a page from one, not both: a template is copied by reading it");
        }
        if (request.makesTemplate() && Boolean.TRUE.equals(draft)) {
            throw OfficiumException.badRequest("template_not_draft",
                    "A template is never a draft: everyone in the project picks from it as soon as it exists");
        }
        if (request.fromTemplate() != null && body != null) {
            throw OfficiumException.badRequest("body_with_template",
                    "`fromTemplate` writes the body from the template: leave `body` out");
        }
        if (request.timeZone() != null) {
            DocTemplate.zone(request.timeZone());
        }
    }

    /** A write that changes a page that exists: a page never turns into a template or back. */
    static void requireCreate(Request request) {
        if (request.asksAnything()) {
            throw OfficiumException.badRequest("template_only_on_create", "`template` and `fromTemplate` only mean "
                    + "something when the page is created: that path already has one");
        }
    }

    /** Archive is for pages the tree shows; a template that is no longer wanted goes to the trash. */
    static void requireNotTemplate(DocPage page) {
        if (page.template()) {
            throw OfficiumException.conflict("doc_is_template",
                    "\"" + page.path() + "\" is a template, which can't be archived: delete it instead");
        }
    }

    /**
     * The content of a page about to be created at {@code path}. A new template can't take a path the
     * tree shows, a node with pages under it included; a page from a template takes the template's
     * title (unless the write sends its own) and body, filled at {@code now} in the caller's zone.
     */
    Content prepare(UUID projectId, UUID accountId, String path, String title, String body, Request request,
            Actor actor, Instant now) {
        refuseUnderTemplate(projectId, path);
        if (request.makesTemplate()) {
            if (DocTree.find(DocTree.build(pages.list(projectId, accountId), nodes.list(projectId)), path) != null) {
                throw OfficiumException.conflict("doc_path_taken", "\"" + path
                        + "\" is in the documentation tree: give the template a path of its own");
            }
            return new Content(title, body == null ? "" : body, true);
        }
        if (request.fromTemplate() == null) {
            return new Content(title, body, false);
        }
        String source = DocPage.normalizePath(request.fromTemplate());
        DocPage template = pages.find(projectId, source).filter(page -> page.template() && page.visibleTo(accountId))
                .orElseThrow(() -> OfficiumException.notFound("doc_template_not_found",
                        "No template at \"" + source + "\": docs.templates.list has the project's templates"));
        ZonedDateTime at = now.atZone(DocTemplate.zone(request.timeZone()));
        return new Content(title != null ? title : DocTemplate.fill(template.title(), at, actor.name()),
                DocTemplate.fill(template.body(), at, actor.name()), false);
    }

    /**
     * A page can't be created at or under a template's path: the tree would show a node whose path a
     * template holds. The rule runs one way only; a template can't take a path the tree shows either.
     */
    private void refuseUnderTemplate(UUID projectId, String path) {
        pages.listTemplates(projectId).stream().map(DocPageSummary::path)
                .filter(template -> DocMove.isAtOrUnder(path, template)).findFirst()
                .ifPresent(template -> {
                    throw OfficiumException.conflict("doc_path_taken", "\"" + template
                            + "\" is a template: a page can't be created under it");
                });
    }
}
