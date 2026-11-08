package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.PrecedenceInput;
import com.javadaba.contexts.officium.application.PrecedenceService;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * {@code /officium/v1/projects/{id}/precedence}: the REST twin of {@code projects.precedence},
 * {@code projects.setPrecedence} and {@code projects.previewPrecedence} (ADR 0032, JAVA-1686). Both surfaces read the
 * same wire values through {@link PrecedenceInput}, so they answer the same.
 */
@Path("/officium/v1/projects/{id}/precedence")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumPrecedenceResource {

    private final PrecedenceService precedence;
    private final AccountSessionCodec codec;

    public OfficiumPrecedenceResource(PrecedenceService precedence, AccountSessionCodec codec) {
        this.precedence = precedence;
        this.codec = codec;
    }

    @GET
    public PrecedenceService.PrecedenceView get(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id) {
        return precedence.get(OfficiumSession.require(codec, session).accountId(), id);
    }

    /** Replaces the whole list under {@code expectedVersion}; owner only. */
    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    public PrecedenceService.PrecedenceView set(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id, PrecedenceRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        List<RuleRequest> sent = request.rules() == null ? List.of() : request.rules();
        List<PrecedenceRule> rules = new ArrayList<>();
        for (int i = 0; i < sent.size(); i++) {
            rules.add(sent.get(i).toRule(i));
        }
        return precedence.set(account.accountId(), id, rules, request.expectedVersion(),
                OfficiumSession.actorOf(account));
    }

    /** What an unsaved rule would catch; nothing is saved. */
    @POST
    @Path("/preview")
    @Consumes(MediaType.APPLICATION_JSON)
    public PrecedenceService.PreviewView preview(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id, PreviewRequest request) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        if (request.rule() == null) {
            throw OfficiumException.badRequest("rule_required", "A rule to preview is required");
        }
        return precedence.preview(accountId, id, request.rule().toRule(0));
    }

    /** The cards a saved rule would bring into the active sprint; nothing is saved (JAVA-1691). */
    @GET
    @Path("/{ruleId}/backfill")
    public PrecedenceService.BackfillPreview backfillPreview(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id, @PathParam("ruleId") UUID ruleId) {
        return precedence.backfillPreview(OfficiumSession.require(codec, session).accountId(), id, ruleId);
    }

    /** Moves the rule's open cards into the active sprint under {@code expectedVersion}; owner only. */
    @POST
    @Path("/{ruleId}/backfill")
    @Consumes(MediaType.APPLICATION_JSON)
    public PrecedenceService.BackfillApplied backfillApply(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id, @PathParam("ruleId") UUID ruleId, BackfillRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return precedence.backfillApply(account.accountId(), id, ruleId, request.expectedVersion(),
                OfficiumSession.actorOf(account));
    }

    /** The market's precedence templates; any member reads them (JAVA-1692). */
    @GET
    @Path("/templates")
    public Map<String, Object> templates(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id) {
        return Map.of("templates", precedence.templates(OfficiumSession.require(codec, session).accountId(), id));
    }

    /** Appends a template's rules after the saved ones, under {@code expectedVersion}; owner only. */
    @POST
    @Path("/templates/import")
    @Consumes(MediaType.APPLICATION_JSON)
    public PrecedenceService.PrecedenceView importTemplate(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id, ImportRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return precedence.importTemplate(account.accountId(), id, request.presetKey(), request.templateId(),
                request.values() == null ? Map.of() : request.values(), request.expectedVersion(),
                OfficiumSession.actorOf(account));
    }

    public record ImportRequest(int expectedVersion, String presetKey, String templateId,
            Map<String, String> values) {
    }

    public record BackfillRequest(int expectedVersion) {
    }

    public record PrecedenceRequest(int expectedVersion, List<RuleRequest> rules) {
    }

    public record PreviewRequest(RuleRequest rule) {
    }

    /** One rule as sent: its facets and defaults, each optional. */
    public record RuleRequest(UUID id, String name, String reason, MatchRequest match, DefaultsRequest defaults) {

        PrecedenceRule toRule(int index) {
            MatchRequest facets = match == null ? new MatchRequest(null, null, null, null) : match;
            DefaultsRequest floor = defaults == null ? new DefaultsRequest(null, null) : defaults;
            return PrecedenceInput.rule(index, id, name, reason, facets.epics(), facets.tags(), facets.categories(),
                    facets.signals(), floor.priority(), floor.sprint());
        }
    }

    public record MatchRequest(List<String> epics, List<String> tags, List<String> categories, List<String> signals) {
    }

    public record DefaultsRequest(String priority, String sprint) {
    }
}
