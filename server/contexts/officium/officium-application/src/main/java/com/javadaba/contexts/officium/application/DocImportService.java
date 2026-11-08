package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocImport;
import com.javadaba.contexts.officium.domain.DocImportCode;
import com.javadaba.contexts.officium.domain.DocLint;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.HeartbeatToken;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocImportCodeRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Bulk documentation import (JAVA-778, contract §8.13): how hundreds of pages reach a project
 * without their bytes passing through an agent. The MCP mints a code ({@link #issue}); a script
 * writes the pages with it in batches ({@link #importPages}), reads them back to compare hashes
 * (the docs reads accept the same code, {@link #authorize}), and closes it ({@link #close}).
 *
 * <p>The code is narrow on purpose: one project, its documentation only, fifteen minutes, until
 * closed. Every write still goes through {@link DocService}, so the page rules, the allowance, the
 * activity and the live channel are exactly those of a page written by hand.
 */
@ApplicationScoped
public class DocImportService {

    static final Duration CODE_TTL = Duration.ofMinutes(15);
    static final int MAX_LIVE_CODES = 5;
    /** Who an imported page is attributed to: the account that asked for the code, as the import. */
    public static final String IMPORTER = "Docs import";
    private static final Set<String> ACCESS_ERRORS = Set.of("invalid_code", "read_only",
            "project_not_found");

    private final DocImportCodeRepository codes;
    private final DocPageRepository pages;
    private final DocService docs;
    private final ProjectAccessGuard guard;
    private final String publicApiUrl;
    private final Clock clock;

    @Inject
    public DocImportService(DocImportCodeRepository codes, DocPageRepository pages, DocService docs,
            ProjectAccessGuard guard,
            @ConfigProperty(name = "javadaba.officium.public-api-url", defaultValue = "https://javadaba.com/api") String publicApiUrl) {
        this(codes, pages, docs, guard, publicApiUrl, Clock.systemUTC());
    }

    DocImportService(DocImportCodeRepository codes, DocPageRepository pages, DocService docs, ProjectAccessGuard guard,
            String publicApiUrl, Clock clock) {
        this.codes = codes;
        this.pages = pages;
        this.docs = docs;
        this.guard = guard;
        this.publicApiUrl = publicApiUrl.replaceAll("/+$", "");
        this.clock = clock;
    }

    /** MCP {@code docs.importCode}: editor+ on the project. The plain code is in this answer only. */
    public IssuedCode issue(UUID accountId, UUID projectId) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Instant now = Instant.now(clock);
        codes.deleteSpent(now);
        if (codes.countLive(projectId, now) >= MAX_LIVE_CODES) {
            throw new OfficiumException("too_many_codes", "This project already has " + MAX_LIVE_CODES
                    + " import codes open: close one (DELETE …/docs:import) or wait fifteen minutes for them to lapse",
                    429);
        }
        String code = DocImportCode.PREFIX + randomHex() + randomHex();
        Instant expiresAt = now.plus(CODE_TTL);
        codes.save(new DocImportCode(UUID.randomUUID(), projectId, accountId, HeartbeatToken.hash(code), expiresAt,
                null, now));
        return new IssuedCode(code, expiresAt, publicApiUrl + "/officium/v1/projects/" + projectId + "/docs:import");
    }

    /**
     * The account a code acts as, for this project only. An unknown, expired, closed or other
     * project's code is the same 401, never saying which. The issuer must still be editor+: a code
     * outlives nobody's access.
     */
    public UUID authorize(String code, UUID projectId) {
        return require(code, projectId).accountId();
    }

    /** {@code POST …/docs:import}: an idempotent upsert per path, answered page by page. */
    public ImportResult importPages(String code, UUID projectId, List<PageInput> batch) {
        DocImportCode found = require(code, projectId);
        if (batch == null || batch.isEmpty()) {
            throw OfficiumException.badRequest("pages_required", "Send at least one page: {path, title, body}");
        }
        if (batch.size() > DocImport.MAX_PAGES_PER_BATCH) {
            throw OfficiumException.badRequest("too_many_pages",
                    "A batch carries at most " + DocImport.MAX_PAGES_PER_BATCH + " pages: split it");
        }
        Actor actor = Actor.agent(found.accountId(), IMPORTER);
        List<PageResult> results = new ArrayList<>(batch.size());
        for (PageInput input : batch) {
            results.add(
                    one(found.accountId(), projectId, input == null ? new PageInput(null, null, null) : input, actor));
        }
        return ImportResult.of(results);
    }

    /** {@code DELETE …/docs:import}: the code stops working at once. */
    public void close(String code, UUID projectId) {
        DocImportCode found = require(code, projectId);
        codes.close(found.id(), Instant.now(clock));
    }

    private PageResult one(UUID accountId, UUID projectId, PageInput input, Actor actor) {
        String path = input.path() == null ? "" : input.path();
        try {
            path = DocPage.normalizePath(path);
            if (DocImport.containsImage(input.body())) {
                return PageResult.rejected(path, "images_not_allowed",
                        "An image must be a file uploaded to its page: write the page, upload the image (docs.attachments.upload) and refer to it as doc://<page>/_files/<name>, or leave the image out");
            }
            if (input.title() == null || input.title().isBlank()) {
                return PageResult.rejected(path, "title_required", "Every imported page needs a title");
            }
            Optional<DocPage> existing = pages.find(projectId, path);
            DocService.Upserted upserted = docs.upsert(accountId, projectId, path, input.title(),
                    input.body() == null ? "" : input.body(), existing.map(DocPage::version).orElse(null), actor);
            String outcome = upserted.created()
                    ? "created"
                    : existing.isPresent() && upserted.page().version() == existing.get().version()
                            ? "unchanged"
                            : "updated";
            return new PageResult(path, outcome, upserted.page().version(), null, null,
                    upserted.linted().findings());
        } catch (DocVersionConflictException ex) {
            return PageResult.rejected(path, "version_conflict",
                    "The page changed while it was being imported: send the batch again");
        } catch (OfficiumException ex) {
            // Losing access mid-import ends the batch; anything about the page itself (its path, a
            // full allowance) is that page's answer, and the rest of the batch goes on.
            if (ACCESS_ERRORS.contains(ex.code())) {
                throw ex;
            }
            return PageResult.rejected(path, ex.code(), ex.getMessage());
        }
    }

    private DocImportCode require(String code, UUID projectId) {
        Instant now = Instant.now(clock);
        DocImportCode found = (code == null || !code.strip().startsWith(DocImportCode.PREFIX)
                ? Optional.<DocImportCode>empty()
                : codes.findByCodeHash(HeartbeatToken.hash(code.strip())))
                .filter(candidate -> candidate.usableAt(now) && candidate.projectId().equals(projectId))
                .orElseThrow(() -> new OfficiumException("invalid_code",
                        "This import code is not valid here: codes work for one project's documentation, for 15 "
                                + "minutes, until the import is closed. Ask Officium's MCP for a new one "
                                + "(docs.importCode).",
                        401));
        guard.requireAtLeast(projectId, found.accountId(), Role.EDITOR);
        return found;
    }

    /** 32 hex characters per call, from a UUID drawn now: nothing random frozen into a native image
     *  (invariant 8), as HeartbeatService does. */
    private static String randomHex() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    public record IssuedCode(String code, Instant expiresAt, String importUrl) {
    }

    public record PageInput(String path, String title, String body) {
    }

    /**
     * {@code outcome}: created, updated, unchanged or rejected (then with {@code error} and
     * {@code message}). {@code findings}: what the page schema's lint found in a saved page (JAVA-781),
     * which never stops it from saving; null for a rejected one.
     */
    public record PageResult(String path, String outcome, Integer version, String error, String message,
            List<DocLint.Finding> findings) {

        static PageResult rejected(String path, String error, String message) {
            return new PageResult(path, "rejected", null, error, message, null);
        }
    }

    public record ImportResult(List<PageResult> pages, int created, int updated, int unchanged, int rejected) {

        static ImportResult of(List<PageResult> pages) {
            return new ImportResult(pages, count(pages, "created"), count(pages, "updated"), count(pages, "unchanged"),
                    count(pages, "rejected"));
        }

        private static int count(List<PageResult> pages, String outcome) {
            return (int) pages.stream().filter(p -> p.outcome().equals(outcome)).count();
        }
    }
}
