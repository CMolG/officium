package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.IntegrationGate;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.VersionConflict;
import com.javadaba.contexts.officium.domain.ports.IntegrationGateRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * A project's integration gate rules (JAVA-1820): any member reads them, only the owner writes them, under their
 * version like the precedence list. No row reads as every rule off, version 0.
 */
@ApplicationScoped
public class IntegrationGateSettings {

    private final IntegrationGateRepository gates;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final Clock clock;

    @Inject
    public IntegrationGateSettings(IntegrationGateRepository gates, ProjectAccessGuard guard,
            ActivityPublisher activity) {
        this(gates, guard, activity, Clock.systemUTC());
    }

    IntegrationGateSettings(IntegrationGateRepository gates, ProjectAccessGuard guard, ActivityPublisher activity,
            Clock clock) {
        this.gates = gates;
        this.guard = guard;
        this.activity = activity;
        this.clock = clock;
    }

    public SettingsView get(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return view(projectId);
    }

    /** Replaces the rules under {@code expectedVersion}; the owner only. */
    public SettingsView set(UUID accountId, UUID projectId, IntegrationGate.Input input, int expectedVersion,
            Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.OWNER);
        SettingsView current = view(projectId);
        if (current.version() != expectedVersion) {
            throw new GateVersionConflictException(current);
        }
        IntegrationGate.Rules rules = IntegrationGate.rules(input);
        Instant now = Instant.now(clock);
        if (!gates.saveIfVersion(projectId, rules, actor, expectedVersion, now)) {
            throw new GateVersionConflictException(view(projectId));
        }
        activity.record(projectId, null, null, actor, "project.integrationGate", "Integration gate rules changed",
                now);
        activity.publish("project.integrationGate", projectId, null, null, expectedVersion + 1, actor, now);
        return view(projectId);
    }

    private SettingsView view(UUID projectId) {
        return gates.find(projectId)
                .map(stored -> new SettingsView(RulesView.of(stored.rules()), stored.version(), stored.updatedAt()))
                .orElse(new SettingsView(RulesView.of(IntegrationGate.Rules.OFF), 0, null));
    }

    /** {@code {rules, version, updatedAt}}: the rules in their wire spelling. */
    public record SettingsView(RulesView rules, int version, Instant updatedAt) {
    }

    public record RulesView(HeldView heldByDeploy, QueueView deployQueue, NothingElseView nothingElse) {

        static RulesView of(IntegrationGate.Rules rules) {
            return new RulesView(
                    new HeldView(rules.heldByDeploy().enabled(), rules.heldByDeploy().minPriority().wire()),
                    new QueueView(rules.deployQueue().enabled(), rules.deployQueue().max()),
                    new NothingElseView(rules.nothingElse().enabled()));
        }
    }

    public record HeldView(boolean enabled, String minPriority) {
    }

    public record QueueView(boolean enabled, int max) {
    }

    public record NothingElseView(boolean enabled) {
    }

    /** {@code 409 {error:"version_conflict", message, current:<SettingsView>}}. */
    public static class GateVersionConflictException extends OfficiumException implements VersionConflict {

        private final SettingsView current;

        GateVersionConflictException(SettingsView current) {
            super("version_conflict", "The project's integration gate changed since you last read it", 409);
            this.current = current;
        }

        @Override
        public SettingsView current() {
            return current;
        }
    }
}
