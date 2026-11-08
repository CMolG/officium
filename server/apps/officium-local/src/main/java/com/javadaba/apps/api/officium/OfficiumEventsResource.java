package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.apps.api.sse.SseKeepAlive;
import com.javadaba.contexts.officium.application.ChangeEvent;
import com.javadaba.contexts.officium.application.ProjectEventBroadcaster;
import com.javadaba.contexts.officium.application.ProjectService;
import com.javadaba.contexts.officium.domain.Actor;
import io.smallrye.common.annotation.Blocking;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * {@code GET /officium/v1/projects/{id}/events} (JDB-217, contract §4): SSE, authorised as a read
 * of the project -- {@code 404 BEFORE opening the stream} if the caller has no access, same
 * discipline as {@code ProductJobStreamResource}. First frame {@code ready}, then one named frame
 * per committed {@link ChangeEvent}, a {@code comment} heartbeat every 15s.
 *
 * <p>Classic JAX-RS {@link SseEventSink} style (not {@code Multi<OutboundSseEvent>}): the sink
 * stays open and {@link ProjectEventBroadcaster#subscribe} pushes into it from whichever thread
 * committed the write, which is a simpler fit than adapting a single-subscriber {@code Multi} to
 * a multi-writer broadcaster.
 *
 * <p><strong>Reconnect = refetch, decided (contract §4).</strong> No replay buffer: a client
 * (re)subscribes, waits for {@code ready}, then refetches what it shows. That's why events carry
 * ids/versions, never bodies -- nothing to replay means nothing can go stale on the wire.
 */
@Path("/officium/v1/projects/{projectId}/events")
public class OfficiumEventsResource {

    private static final Logger LOG = Logger.getLogger(OfficiumEventsResource.class);

    private final ProjectService projects;
    private final ProjectEventBroadcaster broadcaster;
    private final AccountSessionCodec codec;
    private final long heartbeatMillis;

    public OfficiumEventsResource(ProjectService projects, ProjectEventBroadcaster broadcaster,
            AccountSessionCodec codec,
            @ConfigProperty(name = "javadaba.officium.events.heartbeat-seconds", defaultValue = "15") int heartbeatSeconds) {
        this.projects = projects;
        this.broadcaster = broadcaster;
        this.codec = codec;
        this.heartbeatMillis = Math.max(1, heartbeatSeconds) * 1000L;
    }

    @GET
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @Blocking
    public void stream(@Context SseEventSink sink, @Context Sse sse,
            @CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        // 404 before any byte if this account can't read the project (contract §1.2/§4) -- the
        // sink is never touched, so no event-stream response is ever opened for a bad caller.
        projects.get(accountId, projectId);

        AutoCloseable subscription = broadcaster.subscribe(projectId, event -> send(sink, sse, event));

        sink.send(sse.newEventBuilder().name("ready").mediaType(MediaType.APPLICATION_JSON_TYPE)
                .data(Map.of("projectId", projectId.toString())).build());

        SseKeepAlive.keepAlive(sink, sse, heartbeatMillis, "officium-events-" + projectId, List.of(subscription));
    }

    /** One committed change as a named frame; a failed send is the client leaving, not an error. */
    static void send(SseEventSink sink, Sse sse, ChangeEvent event) {
        if (sink.isClosed()) {
            return;
        }
        try {
            sink.send(sse.newEventBuilder().name(event.type()).mediaType(MediaType.APPLICATION_JSON_TYPE)
                    .data(payload(event)).build());
        } catch (RuntimeException ex) {
            LOG.debugf(ex, "officium events: failed to send %s to project %s", event.type(), event.projectId());
        }
    }

    private static Map<String, Object> payload(ChangeEvent event) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("projectId", event.projectId().toString());
        if (event.cardId() != null) {
            map.put("cardId", event.cardId().toString());
        }
        if (event.cardKey() != null) {
            map.put("cardKey", event.cardKey());
        }
        if (event.version() != null) {
            map.put("version", event.version());
        }
        if (event.path() != null) {
            map.put("path", event.path());
        }
        map.put("actor", actorPayload(event.actor()));
        map.put("at", event.at().toString());
        return map;
    }

    private static Map<String, Object> actorPayload(Actor actor) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("kind", actor.kind().name().toLowerCase(java.util.Locale.ROOT));
        map.put("accountId", actor.accountId().toString());
        map.put("name", actor.name());
        map.put("agentName", actor.agentName());
        return map;
    }
}
