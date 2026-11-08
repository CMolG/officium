package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocCommentService;
import com.javadaba.contexts.officium.application.DocCommentService.State;
import com.javadaba.contexts.officium.domain.DocCommentThreads.Thread;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.List;
import java.util.UUID;

/**
 * {@code /officium/v1/projects/{projectId}/docs:comments} (JAVA-797, contract §8.25): the threads of every page the
 * caller sees, newest activity first. A separate resource, like {@code docs:trash}, because the page routes would
 * read it as a path.
 */
@Path("/officium/v1/projects/{projectId}/docs:comments")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumProjectDocCommentsResource {

    private static final int DEFAULT_LIMIT = 50;

    private final DocCommentService comments;
    private final AccountSessionCodec codec;

    public OfficiumProjectDocCommentsResource(DocCommentService comments, AccountSessionCodec codec) {
        this.comments = comments;
        this.codec = codec;
    }

    @GET
    public List<Thread> list(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @QueryParam("state") String state,
            @QueryParam("limit") Integer limit) {
        AccountSession account = OfficiumSession.require(codec, session);
        return comments.listProject(account.accountId(), projectId, State.parse(state),
                limit == null ? DEFAULT_LIMIT : limit);
    }
}
