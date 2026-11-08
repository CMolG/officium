package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.apps.api.sse.SseKeepAlive;
import com.javadaba.contexts.officium.application.AccountSignals;
import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.ProjectEventBroadcaster;
import com.javadaba.contexts.officium.application.ProjectService;
import com.javadaba.contexts.officium.application.ProjectView;
import io.smallrye.common.annotation.Blocking;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * JAVA-120 (contract §4.1): agent work across every project the caller can see, for a surface that
 * shows no single board -- the projects home.
 *
 * <p>{@code GET /officium/v1/working/events} is ONE stream per tab, not one per project: at open it
 * subscribes the same sink to each visible project's room and forwards only {@code card.working}.
 * The project set is read once per connection; the edge closes every stream within a minute
 * (contract §4), so a project joined meanwhile is picked up on the routine reconnect, whose
 * {@code ready} makes the client refetch {@code GET /officium/v1/working} anyway.
 */
@Path("/officium/v1/working")
public class OfficiumWorkingResource {

    private final AgentWorkService agentWork;
    private final ProjectService projects;
    private final ProjectEventBroadcaster broadcaster;
    private final AccountSignals signals;
    private final AccountSessionCodec codec;
    private final long heartbeatMillis;

    public OfficiumWorkingResource(AgentWorkService agentWork, ProjectService projects,
            ProjectEventBroadcaster broadcaster, AccountSignals signals, AccountSessionCodec codec,
            @ConfigProperty(name = "javadaba.officium.events.heartbeat-seconds", defaultValue = "15") int heartbeatSeconds) {
        this.agentWork = agentWork;
        this.projects = projects;
        this.broadcaster = broadcaster;
        this.signals = signals;
        this.codec = codec;
        this.heartbeatMillis = Math.max(1, heartbeatSeconds) * 1000L;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<AgentWorkService.ProjectWorkView> list(@CookieParam(OfficiumSession.COOKIE) String session) {
        return agentWork.activeEverywhere(OfficiumSession.require(codec, session).accountId());
    }

    @GET
    @Path("/events")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @Blocking
    public void stream(@Context SseEventSink sink, @Context Sse sse,
            @CookieParam(OfficiumSession.COOKIE) String session) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        List<AutoCloseable> subscriptions = new ArrayList<>();
        for (ProjectView project : projects.list(accountId, null, false, null)) {
            subscriptions.add(broadcaster.subscribe(project.id(), event -> {
                if ("card.working".equals(event.type())) {
                    OfficiumEventsResource.send(sink, sse, event);
                }
            }));
        }
        int projectCount = subscriptions.size();
        // JAVA-1145: what is for this person, whatever the project. Ids only; the tab refetches.
        subscriptions.add(signals.subscribe(accountId, signal -> {
            if (!sink.isClosed()) {
                sink.send(sse.newEventBuilder().name("summons").mediaType(MediaType.APPLICATION_JSON_TYPE)
                        .data(signal).build());
            }
        }));
        sink.send(sse.newEventBuilder().name("ready").mediaType(MediaType.APPLICATION_JSON_TYPE)
                .data(Map.of("projects", projectCount)).build());
        SseKeepAlive.keepAlive(sink, sse, heartbeatMillis, "officium-working-" + accountId, subscriptions);
    }
}
