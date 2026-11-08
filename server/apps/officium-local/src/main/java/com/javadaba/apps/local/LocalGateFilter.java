package com.javadaba.apps.local;

import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.PreMatching;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * The two gates in front of every Officium route.
 *
 * <ol>
 *   <li>Auth. When {@code OFFICIUM_LOCAL_TOKEN} is set, a request must carry
 *       {@code Authorization: Bearer <token>} or it is answered 401. When it is unset there is no
 *       auth (the server then binds to 127.0.0.1 by default). The heartbeat endpoint is the one
 *       exception: it checks its own per-machine token inside the heartbeat service.</li>
 *   <li>Features of Officium Cloud. A route that belongs to a feature Local does not ship answers
 *       501 {@code feature_unavailable_in_local}.</li>
 * </ol>
 */
@Provider
@PreMatching
@Priority(Priorities.AUTHENTICATION)
public class LocalGateFilter implements ContainerRequestFilter {

    private static final Pattern V1 = Pattern.compile("^/officium/v1/");

    /** Routes of features that exist only in Officium Cloud. */
    private static final Pattern CLOUD_ONLY = Pattern.compile("^/officium/v1/("
            + "summons|sessions|agent-sessions|usage|presence|account/subscription|github(/.*)?|changelog/ingest|tests/ingest"
            + "|projects/[^/]+/(members|summons|tests|changelog|integration-gate|github(/.*)?|doc-rooms(/.*)?)"
            + "|projects/[^/]+/cards/[^/]+/(prior-failures|queue)"
            + "|projects/[^/]+/docs/.+/_presence"
            + "|projects/[^/]+/(organization|collaborators)"
            + "|projects/[^/]+/(value|usage)|projects/[^/]+/quality-settings"
            + "|organization(/.*)?|organizations(/.*)?|teams(/.*)?|people|collaborators(/.*)?|invitations(/.*)?"
            + ")(/.*)?$");

    private final byte[] token;

    public LocalGateFilter(@ConfigProperty(name = "officium.local.token") Optional<String> token) {
        this.token = token.map(String::strip).filter(t -> !t.isEmpty()).map(t -> t.getBytes(StandardCharsets.UTF_8))
                .orElse(null);
    }

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();
        String normal = path.startsWith("/") ? path : "/" + path;
        if (!normal.startsWith("/officium")) {
            return;
        }
        if (token != null && !normal.startsWith("/officium/v1/heartbeat") && !bearerMatches(request)) {
            request.abortWith(Response.status(401).type(MediaType.APPLICATION_JSON)
                    .header("WWW-Authenticate", "Bearer realm=\"officium-local\"")
                    .entity(Map.of("error", "unauthenticated",
                            "message", "Send Authorization: Bearer <OFFICIUM_LOCAL_TOKEN>."))
                    .build());
            return;
        }
        if (V1.matcher(normal).find() && CLOUD_ONLY.matcher(normal).matches()) {
            request.abortWith(unavailable());
        }
    }

    static Response unavailable() {
        return Response.status(501).type(MediaType.APPLICATION_JSON)
                .entity(Map.of("error", "feature_unavailable_in_local",
                        "message", "This feature is part of Officium Cloud and is not available in Officium Local."))
                .build();
    }

    private boolean bearerMatches(ContainerRequestContext request) {
        String header = request.getHeaderString("Authorization");
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return false;
        }
        byte[] given = header.substring(7).strip().getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(given, token);
    }
}
