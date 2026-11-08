package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.domain.Actor;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

/** {@code jdb_session} handling shared by every Officium REST resource -- same shape as
 *  {@code FluxorTaskResource#requireAccount}, one level up since several resources need it. */
final class OfficiumSession {

    static final String COOKIE = "jdb_session";

    private OfficiumSession() {
    }

    static AccountSession require(AccountSessionCodec codec, String session) {
        return codec.verify(session)
                .orElseThrow(() -> new WebApplicationException("unauthenticated", Response.Status.UNAUTHORIZED));
    }

    /** Every write is recorded as {@code person} (contract §5: "REST writes record person"). */
    static Actor actorOf(AccountSession session) {
        String name = session.email() != null && !session.email().isBlank()
                ? session.email()
                : session.accountId().toString();
        return Actor.person(session.accountId(), name);
    }
}
