package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * The autoloops working a project (card://JAVA-1528): each supervisor beats every poll with its machine's
 * heartbeat token, saying whether its slots work cards ({@code running}) or it waits in standby for an order
 * ({@code idle}); the board shows the caller's loops as OFFLINE, IDLE or RUNNING and queues a {@code start} or a
 * {@code stop}, which the loop's next beat takes. Kept in memory, like the agent windows: a restart forgets the
 * loops until they beat again, a few seconds later, and an order queued just before it is lost (the button asks
 * again). Orders reach only the caller's own loops.
 */
@ApplicationScoped
public class AutoloopService {

    private static final Logger LOG = Logger.getLogger(AutoloopService.class);

    /** No beat for this long and a loop is offline: three missed beats at the supervisor's 20 s. */
    static final Duration OFFLINE_AFTER = Duration.ofSeconds(90);
    static final int MAX_LOOPS = 20;
    /** A loop silent this long is forgotten, so machine names that changed never fill the cap. */
    static final Duration FORGET_AFTER = Duration.ofHours(1);
    private static final int MAX_TARGET = 200;
    private static final int MAX_SLOTS = 64;
    private static final Pattern MACHINE = Pattern.compile("[A-Za-z0-9._-]{1,128}");

    /** What the board shows: the most active of the caller's loops on the project. */
    public enum State {
        OFFLINE, IDLE, RUNNING;

        public String wire() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    private record Key(UUID accountId, UUID projectId, String machine) {
    }

    private record Loop(State state, Instant lastBeatAt, Integer slots, String target, String pending) {
    }

    /** One loop as the board sees it; {@code pending} is the order its next beat takes, null when none. */
    public record LoopView(String machine, String state, Instant lastBeatAt, Integer slots, String target,
            String pending) {
    }

    /** {@code gate}: the project's integration gate (JAVA-1820), null when it saved no rules. */
    public record StatusView(UUID projectId, String state, String pending, List<LoopView> loops,
            IntegrationGateService.GateView gate) {
    }

    /**
     * What a beat answers: the order to apply now, null when none. {@code reason} and {@code gate} are set only when
     * the integration gate stopped the loop (JAVA-1820).
     */
    public record Order(String command, String reason, IntegrationGateService.GateView gate) {

        public Order(String command) {
            this(command, null, null);
        }
    }

    private final Map<Key, Loop> loops = new ConcurrentHashMap<>();
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final IntegrationGateService gates;
    private final Clock clock;

    @Inject
    public AutoloopService(ProjectAccessGuard guard, ActivityPublisher activity, IntegrationGateService gates) {
        this(guard, activity, gates, Clock.systemUTC());
    }

    AutoloopService(ProjectAccessGuard guard, ActivityPublisher activity, Clock clock) {
        this(guard, activity, null, clock);
    }

    AutoloopService(ProjectAccessGuard guard, ActivityPublisher activity, IntegrationGateService gates,
            Clock clock) {
        this.guard = guard;
        this.activity = activity;
        this.gates = gates;
        this.clock = clock;
    }

    /** The integration gate (JAVA-1820), whose rules the MCP and REST surfaces set. */
    public IntegrationGateService gate() {
        return gates;
    }

    /** A supervisor's beat: its state, how many slots and which control branch; answers the order waiting for it. */
    public Order heartbeat(UUID accountId, UUID projectId, String machine, String state, Integer slots,
            String target, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAccess(projectId, accountId);
        Beat beat = record(accountId, projectId, machine, state, slots, target, actor);
        // The gate runs after the lock is released (it reads the database and may write a card). Only an editor's
        // beat may write a wall; a viewer's still gets the gate in its order.
        IntegrationGateService.GateView gate = gateOnBeat(projectId, beat.branch(),
                access.role().atLeast(Role.EDITOR));
        if (gate == null || !gate.open()) {
            return new Order(beat.order());
        }
        // An open gate: a running loop stops, and a waiting one is not started (JAVA-1820).
        return beat.reported() == State.RUNNING
                ? new Order("stop", "integration gate: " + gate.firstMessage(), gate)
                : new Order(null, null, gate);
    }

    private record Beat(String order, String branch, State reported) {
    }

    /** The beat's effect on the loops, under the lock: the order it takes and the branch it names. */
    private synchronized Beat record(UUID accountId, UUID projectId, String machine, String state, Integer slots,
            String target, Actor actor) {
        Key key = new Key(accountId, projectId, requireMachine(machine));
        State reported = parse(state);
        Instant now = Instant.now(clock);
        if (slots != null && (slots < 0 || slots > MAX_SLOTS)) {
            throw OfficiumException.badRequest("invalid_autoloop_slots", "A loop has 0 to " + MAX_SLOTS + " slots");
        }
        if (target != null && target.strip().length() > MAX_TARGET) {
            throw OfficiumException.badRequest("invalid_autoloop_target",
                    "A control branch is at most " + MAX_TARGET + " characters");
        }
        loops.entrySet().removeIf(e -> e.getValue().lastBeatAt().plus(FORGET_AFTER).isBefore(now));
        Loop before = loops.get(key);
        if (before == null && countOf(accountId) >= MAX_LOOPS) {
            throw OfficiumException.conflict("too_many_autoloops",
                    "An account keeps at most " + MAX_LOOPS + " autoloops beating");
        }
        String pending = before == null ? null : before.pending();
        String order = deliverable(pending, reported) ? pending : null;
        String branch = target == null || target.isBlank() ? null : target.strip();
        loops.put(key, new Loop(reported, now, slots, branch, null));
        if (before == null || live(before, now) != reported || pending != null) {
            activity.publish("autoloop.changed", projectId, null, null, null, actor, now);
        }
        return new Beat(order, branch, reported);
    }

    public synchronized StatusView status(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return view(accountId, projectId, Instant.now(clock));
    }

    /**
     * Queues {@code start} for the caller's loops waiting in standby; refused when none waits, and while the
     * integration gate is open (JAVA-1820): the merge it asks for comes first.
     */
    public synchronized StatusView start(UUID accountId, UUID projectId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        IntegrationGateService.GateView gate = gateOf(projectId, branchOf(accountId, projectId, Instant.now(clock)));
        if (gate != null && gate.open()) {
            throw OfficiumException.conflict("integration_gate_open", "The integration gate is open"
                    + (gate.branch() == null ? "" : " on " + gate.branch()) + ": " + gate.firstMessage()
                    + (gate.wallCard() == null ? "" : " Merge it first (" + gate.wallCard() + ")."));
        }
        return order(accountId, projectId, actor, "start", State.IDLE, "no_idle_autoloop",
                "No autoloop of yours is waiting on this project: start one in standby (/autoloop standby)");
    }

    /** Queues {@code stop} for the caller's running loops; each stops its sessions and waits in standby. */
    public synchronized StatusView stop(UUID accountId, UUID projectId, Actor actor) {
        return order(accountId, projectId, actor, "stop", State.RUNNING, "no_running_autoloop",
                "No autoloop of yours is running on this project");
    }

    private StatusView order(UUID accountId, UUID projectId, Actor actor, String command, State from, String code,
            String message) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Instant now = Instant.now(clock);
        List<Map.Entry<Key, Loop>> targets = loops.entrySet().stream()
                .filter(e -> e.getKey().accountId().equals(accountId) && e.getKey().projectId().equals(projectId))
                .filter(e -> live(e.getValue(), now) == from).toList();
        if (targets.isEmpty()) {
            throw OfficiumException.conflict(code, message);
        }
        targets.forEach(e -> loops.put(e.getKey(), new Loop(e.getValue().state(), e.getValue().lastBeatAt(),
                e.getValue().slots(), e.getValue().target(), command)));
        activity.publish("autoloop.changed", projectId, null, null, null, actor, now);
        return view(accountId, projectId, now);
    }

    private StatusView view(UUID accountId, UUID projectId, Instant now) {
        List<Map.Entry<Key, Loop>> mine = loops.entrySet().stream()
                .filter(e -> e.getKey().accountId().equals(accountId) && e.getKey().projectId().equals(projectId))
                .sorted(Comparator.comparing(e -> e.getKey().machine())).toList();
        State state = mine.stream().map(e -> live(e.getValue(), now)).max(Comparator.naturalOrder())
                .orElse(State.OFFLINE);
        String pending = mine.stream().map(e -> e.getValue().pending()).filter(p -> p != null).findFirst()
                .orElse(null);
        return new StatusView(projectId, state.wire(), pending, mine.stream()
                .map(e -> new LoopView(e.getKey().machine(), live(e.getValue(), now).wire(),
                        e.getValue().lastBeatAt(), e.getValue().slots(), e.getValue().target(),
                        e.getValue().pending()))
                .toList(), gateOf(projectId, branchOf(accountId, projectId, now)));
    }

    /** The control branch of the caller's most recent live loop that names one. */
    private String branchOf(UUID accountId, UUID projectId, Instant now) {
        return loops.entrySet().stream()
                .filter(e -> e.getKey().accountId().equals(accountId) && e.getKey().projectId().equals(projectId))
                .filter(e -> live(e.getValue(), now) != State.OFFLINE && e.getValue().target() != null)
                .max(Comparator.comparing(e -> e.getValue().lastBeatAt())).map(e -> e.getValue().target())
                .orElse(null);
    }

    private IntegrationGateService.GateView gateOf(UUID projectId, String branch) {
        return gates == null ? null : gates.view(projectId, branch);
    }

    /** The gate on a beat, wall included; a gate that fails to answer never fails the beat. */
    private IntegrationGateService.GateView gateOnBeat(UUID projectId, String branch, boolean mayWrite) {
        try {
            return gates == null ? null : gates.onBeat(projectId, branch, mayWrite);
        } catch (RuntimeException ex) {
            LOG.warnf("The integration gate of %s did not answer a beat: %s", projectId, ex.getMessage());
            return null;
        }
    }

    /** A loop's state now: offline once its beats stopped, whatever it said last. */
    private static State live(Loop loop, Instant now) {
        return loop.lastBeatAt().plus(OFFLINE_AFTER).isBefore(now) ? State.OFFLINE : loop.state();
    }

    /** An order a loop takes: start while it waits, stop while it runs; one it already obeys is spent. */
    private static boolean deliverable(String pending, State reported) {
        return "start".equals(pending) && reported == State.IDLE || "stop".equals(pending) && reported == State.RUNNING;
    }

    private long countOf(UUID accountId) {
        return loops.keySet().stream().filter(key -> key.accountId().equals(accountId)).count();
    }

    private static String requireMachine(String machine) {
        String value = machine == null ? "" : machine.strip();
        if (!MACHINE.matcher(value).matches()) {
            throw OfficiumException.badRequest("machine_required",
                    "Say which machine beats: letters, digits, dots, dashes or underscores");
        }
        return value;
    }

    private static State parse(String state) {
        if ("running".equals(state)) {
            return State.RUNNING;
        }
        if ("idle".equals(state)) {
            return State.IDLE;
        }
        throw OfficiumException.badRequest("invalid_autoloop_state", "An autoloop beats `running` or `idle`");
    }
}
