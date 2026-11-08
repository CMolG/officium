package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * "The project's machine" (JDB-242): the agent-side {@code officium-files} process that stores and
 * serves a project's attachments, so their bytes never touch our disk.
 *
 * <p>An MCP client cannot run code the server sends it, so the MCP operation {@code files.connect}
 * hands the AGENT a one-time token and the exact command; the agent runs it from the project
 * directory and the process redeems the token on {@code WS /officium/v1/machines/connect}.
 *
 * <p><strong>In memory, like {@link AgentWorkBoard}:</strong> tokens and presence are live state,
 * not records. One machine per project; a newer connection replaces the older one (the agent
 * restarted). An API restart forgets them and the process reconnects on its own. Same
 * single-instance caveat as the SSE bus and {@code /fluxor/v1/relay}.
 */
@ApplicationScoped
public class ProjectMachineService {

    static final Duration TOKEN_TTL = Duration.ofMinutes(10);
    static final Duration RECONNECT_TTL = Duration.ofHours(12);

    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final String publicApiUrl;
    private final Clock clock;
    private final Map<String, Grant> pending = new ConcurrentHashMap<>();
    private final Map<UUID, Machine> machines = new ConcurrentHashMap<>();

    @Inject
    public ProjectMachineService(ProjectAccessGuard guard, ActivityPublisher activity,
            @ConfigProperty(name = "javadaba.officium.public-api-url", defaultValue = "https://javadaba.com/api") String publicApiUrl) {
        this.guard = guard;
        this.activity = activity;
        this.publicApiUrl = publicApiUrl.replaceAll("/+$", "");
        this.clock = Clock.systemUTC();
    }

    /** What an agent needs to host the project's files: run {@code command} in the background from
     *  the project directory. Editor+ -- hosting files is a write capability. */
    public ConnectGrant connect(UUID accountId, UUID projectId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Instant now = Instant.now(clock);
        pending.values().removeIf(grant -> grant.expiresAt().isBefore(now));
        String label = actor.agentName() != null ? actor.agentName() : actor.name();
        Instant expiresAt = now.plus(TOKEN_TTL);
        String token = issue(new Grant(projectId, accountId, label, expiresAt));
        String command = "npx -y @javadaba/officium-files --api " + publicApiUrl + " --token " + token;
        return new ConnectGrant(token, expiresAt, command,
                "Run this command in the background from the root of the project's working directory and keep it "
                        + "running while you work. It stores files people attach to cards under "
                        + ".officium/attachments/ (add that folder to .gitignore) and serves them back. The "
                        + "token is single-use and expires in 10 minutes.");
    }

    /** A fresh single-use token for the connected machine to come back with after a network cut.
     *  Handed over on every successful connection, so the previous one is never needed again.
     *  In memory like the rest: after an API restart the agent calls {@code files.connect} again. */
    public String reconnectToken(Grant grant) {
        return issue(new Grant(grant.projectId(), grant.accountId(), grant.label(),
                Instant.now(clock).plus(RECONNECT_TTL)));
    }

    private String issue(Grant grant) {
        // Two random UUIDs: 244 random bits from the JDK's SecureRandom, drawn per call, so nothing
        // random is frozen into a native image (invariant 8).
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        pending.put(token, grant);
        return token;
    }

    /** The machine process presenting its token. Single use: a replayed token finds nothing. */
    public Optional<Grant> redeem(String token) {
        if (token == null) {
            return Optional.empty();
        }
        Grant grant = pending.remove(token);
        return grant == null || grant.expiresAt().isBefore(Instant.now(clock)) ? Optional.empty() : Optional.of(grant);
    }

    /** @return the connection this one replaces, for the caller to close. */
    public Optional<String> online(Grant grant, String connectionId) {
        Machine previous = machines.put(grant.projectId(),
                new Machine(connectionId, grant.accountId(), grant.label(), Instant.now(clock)));
        publish(grant.projectId(), grant.accountId(), grant.label());
        return Optional.ofNullable(previous).map(Machine::connectionId).filter(id -> !id.equals(connectionId));
    }

    /** Only the connection that is still the project's machine takes it offline: the one a newer
     *  connection replaced closes afterwards and must not unregister its successor. */
    public void offline(UUID projectId, String connectionId) {
        Machine current = machines.get(projectId);
        if (current != null && current.connectionId().equals(connectionId) && machines.remove(projectId, current)) {
            publish(projectId, current.accountId(), current.label());
        }
    }

    public MachineView machine(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        Machine machine = machines.get(projectId);
        return machine == null ? MachineView.OFFLINE : new MachineView(true, machine.label(), machine.connectedAt());
    }

    /** The live machine's connection, or {@code 409 machine_offline}. */
    public String requireConnection(UUID projectId) {
        Machine machine = machines.get(projectId);
        if (machine == null) {
            throw OfficiumException.conflict("machine_offline",
                    "No machine is hosting this project's files right now. Ask the project's agent to call "
                            + "files.connect.");
        }
        return machine.connectionId();
    }

    private void publish(UUID projectId, UUID accountId, String label) {
        activity.publish("project.machine", projectId, null, null, null, Actor.agent(accountId, label),
                Instant.now(clock));
    }

    public record Grant(UUID projectId, UUID accountId, String label, Instant expiresAt) {
    }

    public record ConnectGrant(String token, Instant expiresAt, String command, String instructions) {
    }

    public record MachineView(boolean connected, String label, Instant connectedAt) {
        static final MachineView OFFLINE = new MachineView(false, null, null);
    }

    private record Machine(String connectionId, UUID accountId, String label, Instant connectedAt) {
    }
}
