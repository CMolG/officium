package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.IntegrationGate;
import com.javadaba.contexts.officium.domain.IntegrationGateEvaluation;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.github.GithubRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.GithubRepositoryRepository;
import com.javadaba.contexts.officium.domain.ports.IntegrationGateFacts;
import com.javadaba.contexts.officium.domain.ports.IntegrationGateRepository;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The integration gate of a project (JAVA-1820): whether the autoloop should stop because work waits on a branch
 * nobody merged, why, and the wall card that asks the owner for the merge. A project with no saved rules has no gate,
 * and every method answers as if it did not exist.
 */
@ApplicationScoped
public class IntegrationGateService {

    private static final Logger LOG = Logger.getLogger(IntegrationGateService.class);
    private static final String CLEARED = "none of the gate's rules is open: the control branch was merged.";

    private final IntegrationGateRepository gates;
    private final IntegrationGateFacts facts;
    private final CardRepository cards;
    private final ProjectRepository projects;
    private final GithubRepositoryRepository repositories;
    private final IntegrationGateWall wall;
    private final IntegrationGateSettings settings;

    @Inject
    public IntegrationGateService(IntegrationGateRepository gates, IntegrationGateFacts facts, CardRepository cards,
            ProjectRepository projects, GithubRepositoryRepository repositories, IntegrationGateWall wall,
            IntegrationGateSettings settings) {
        this.gates = gates;
        this.facts = facts;
        this.cards = cards;
        this.projects = projects;
        this.repositories = repositories;
        this.wall = wall;
        this.settings = settings;
    }

    public IntegrationGateSettings settings() {
        return settings;
    }

    public record ReasonView(String rule, String message, List<String> cards) {
    }

    /** What the board and the autoloop read: whether the gate is open and why, the branch and the card asking for it. */
    public record GateView(boolean open, List<ReasonView> reasons, String branch, String compareUrl,
            String wallCard) {

        /** The first reason, as a sentence for a person. */
        public String firstMessage() {
            return reasons.isEmpty() ? "" : reasons.get(0).message();
        }
    }

    /** The gate as it stands, touching nothing; null when the project saved no rules. */
    public GateView view(UUID projectId, String branch) {
        return evaluate(projectId, branch).map(Evaluated::view).orElse(null);
    }

    /**
     * A supervisor's beat: the gate, and its wall kept in step. An open gate on a beat that names a valid branch has
     * one open wall (never more than one per project, see {@link IntegrationGateWall#ensure}); a closed gate has
     * none. Only a caller who may write ({@code mayWrite}: editor or better) creates or closes a wall; anyone else
     * gets the gate as {@link #view} shows it. Null when the project saved no rules. Synchronized so two editors'
     * beats never both find no wall and create two (the lock covers this instance; the card's client key is the
     * database's own guard per branch).
     */
    public synchronized GateView onBeat(UUID projectId, String branch, boolean mayWrite) {
        if (!mayWrite) {
            return view(projectId, branch);
        }
        Optional<Evaluated> evaluated = evaluate(projectId, branch);
        if (evaluated.isEmpty()) {
            return null;
        }
        Evaluated gate = evaluated.get();
        Project project = projects.findById(projectId).orElse(null);
        if (project == null) {
            return gate.view();
        }
        if (!gate.view().open()) {
            wall.closeAll(project, CLEARED);
            return gate.view();
        }
        String branchName = gate.view().branch();
        if (branchName == null) {
            return gate.view();
        }
        GateView view = gate.view();
        String key = wall.ensure(project, branchName, view.reasons(), view.compareUrl());
        return new GateView(true, view.reasons(), branchName, view.compareUrl(), key);
    }

    /** A card moved: if the gate closed behind it, the walls it left open are done. */
    void recheck(UUID projectId) {
        if (gates.find(projectId).isEmpty() || facts.openWalls(projectId).isEmpty()) {
            return;
        }
        evaluate(projectId, null).filter(gate -> !gate.view().open()).ifPresent(gate -> projects.findById(projectId)
                .ifPresent(project -> wall.closeAll(project, CLEARED)));
    }

    private record Evaluated(GateView view) {
    }

    /**
     * A control branch a loop reports is typed by whoever runs it, and ends in a card title, a markdown body and a
     * link: only a conservative git branch name passes (no spaces, quotes, backticks, newlines, {@code ?}, {@code #},
     * {@code ..}, a leading or trailing slash, a {@code .lock} end). Anything else is no branch.
     */
    private static final Pattern BRANCH = Pattern
            .compile("(?!-)(?!\\.)(?!.*\\.\\.)(?!/)(?!.*//)[A-Za-z0-9._/-]{1,200}(?<!/)(?<!\\.lock)");

    static String validBranch(String branch) {
        return branch != null && BRANCH.matcher(branch).matches() ? branch : null;
    }

    private Optional<Evaluated> evaluate(UUID projectId, String requested) {
        String branch = validBranch(requested);
        Optional<IntegrationGateRepository.Stored> stored = gates.find(projectId);
        if (stored.isEmpty()) {
            return Optional.empty();
        }
        IntegrationGate.Rules rules = stored.get().rules();
        List<IntegrationGateEvaluation.Reason> reasons = rules.anyEnabled()
                ? IntegrationGateEvaluation.evaluate(rules, factsOf(projectId, rules))
                : List.of();
        boolean open = !reasons.isEmpty();
        String compare = open ? compareUrl(projectId, branch) : null;
        String wallCard = open ? wall.anyOpen(projectId).orElse(null) : null;
        return Optional.of(new Evaluated(new GateView(open,
                reasons.stream().map(r -> new ReasonView(r.rule(), r.message(), r.cards())).toList(), branch, compare,
                wallCard)));
    }

    private IntegrationGateEvaluation.Facts factsOf(UUID projectId, IntegrationGate.Rules rules) {
        List<IntegrationGateEvaluation.Held> held = rules.heldByDeploy().enabled() ? facts.held(projectId) : List.of();
        boolean needsDeploy = rules.deployQueue().enabled() || rules.nothingElse().enabled();
        List<String> deploy = needsDeploy ? facts.deployKeys(projectId) : List.of();
        boolean next = !rules.nothingElse().enabled() || deploy.isEmpty()
                || cards.nextEligible(projectId, Set.of(), false).isPresent();
        return new IntegrationGateEvaluation.Facts(held, deploy, next);
    }

    /**
     * The compare page of the project's repository, when exactly one is connected and a branch is named. The branch
     * already passed {@link #validBranch}: its characters are all URL-safe, so it needs no percent-encoding.
     */
    private String compareUrl(UUID projectId, String branch) {
        if (branch == null) {
            return null;
        }
        try {
            List<GithubRepository> connected = repositories.listInstalled().stream()
                    .filter(repo -> projectId.equals(repo.projectId())).toList();
            return connected.size() == 1
                    ? "https://github.com/" + connected.get(0).repo() + "/compare/main..." + branch
                    : null;
        } catch (RuntimeException ex) {
            LOG.warnf("The repositories of %s are unreadable: %s", projectId, ex.getMessage());
            return null;
        }
    }
}
