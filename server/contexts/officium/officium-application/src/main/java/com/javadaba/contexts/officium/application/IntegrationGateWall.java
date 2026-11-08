package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.application.IntegrationGateService.ReasonView;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Sprint;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.IntegrationGateFacts;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The card an open integration gate asks the owner to answer (JAVA-1820): one human wall per project and branch,
 * "Merge &lt;branch&gt; into main" (at most one open per project), in the active sprint, blocking the cards the gate holds. It is a {@code routine}
 * card: a human card is not entered through a category contract, and the merge is a routine act. Closed by the
 * gate itself when no rule is open any more.
 */
@ApplicationScoped
public class IntegrationGateWall {

    /** The name the gate acts under, for the owner. */
    public static final String AGENT_NAME = "Officium integration gate";
    static final String KEY_PREFIX = "integration-gate:";

    private static final Logger LOG = Logger.getLogger(IntegrationGateWall.class);
    private static final int MAX_ROUNDS = 100;

    private final CardService cardService;
    private final CardCommentService comments;
    private final CardRepository cards;
    private final SprintRepository sprints;
    private final IntegrationGateFacts facts;

    @Inject
    public IntegrationGateWall(CardService cardService, CardCommentService comments, CardRepository cards,
            SprintRepository sprints, IntegrationGateFacts facts) {
        this.cardService = cardService;
        this.comments = comments;
        this.cards = cards;
        this.sprints = sprints;
        this.facts = facts;
    }

    /** The key of the project's open wall, for whatever branch: there is at most one. */
    Optional<String> anyOpen(UUID projectId) {
        return facts.openWalls(projectId).stream().map(IntegrationGateFacts.OpenWall::key).findFirst();
    }

    /**
     * The project's one open wall, created once: a second call finds it. A wall already open for ANOTHER branch is
     * kept and returned as is: the gate asks for one merge at a time, and the next beat after it closes asks for the
     * next. Null when it cannot be created.
     */
    String ensure(Project project, String branch, List<ReasonView> reasons, String compareUrl) {
        Optional<String> open = anyOpen(project.id());
        if (open.isPresent()) {
            return open.get();
        }
        try {
            UUID sprintId = sprints.findActive(project.id()).map(Sprint::id).orElse(null);
            List<String> held = reasons.stream().filter(r -> "heldByDeploy".equals(r.rule()))
                    .flatMap(r -> r.cards().stream()).distinct().toList();
            CardService.NewCard wall = new CardService.NewCard("Merge " + branch + " into main",
                    description(branch, reasons, compareUrl), null, Status.TODO, Priority.SUPER_HIGH, Executor.HUMAN,
                    Category.ROUTINE, 0.0, null, List.of(), List.of(), List.of(), held,
                    freeClientKey(project.id(), branch),
                    sprintId);
            return cardService.create(project.ownerAccountId(), project.id(), wall, actor(project)).key();
        } catch (OfficiumException ex) {
            LOG.warnf("The integration gate wall for %s of %s was not created: %s", branch, project.id(),
                    ex.getMessage());
            return null;
        }
    }

    /** Every open wall of the project is done, with the reason it is. */
    void closeAll(Project project, String why) {
        for (IntegrationGateFacts.OpenWall open : facts.openWalls(project.id())) {
            try {
                close(project, open.id(), open.key(), why);
            } catch (OfficiumException ex) {
                LOG.warnf("The integration gate wall %s was not closed: %s", open.key(), ex.getMessage());
            }
        }
    }

    private void close(Project project, UUID cardId, String key, String why) {
        Actor actor = actor(project);
        for (int attempt = 0; attempt < 2; attempt++) {
            Card card = cards.findById(project.id(), cardId).orElse(null);
            if (card == null || card.status().closed()) {
                return;
            }
            if (attempt == 0) {
                comments.add(project.ownerAccountId(), project.id(), key, "Integration gate cleared: " + why, actor);
                card = cards.findById(project.id(), cardId).orElse(card);
            }
            try {
                cardService.move(project.ownerAccountId(), project.id(), cardId, card.version(), Status.DONE, 0,
                        actor);
                return;
            } catch (CardVersionConflictException ex) {
                // The comment (or a person) touched the card: read it again.
            }
        }
    }

    /** The client key of a wall for {@code branch} that has none yet: a branch merged and reopened gets a new one. */
    private String freeClientKey(UUID projectId, String branch) {
        String base = KEY_PREFIX + branch;
        String candidate = base;
        for (int round = 2; round <= MAX_ROUNDS && cards.findByClientKey(projectId, candidate).isPresent(); round++) {
            candidate = base + "#" + round;
        }
        return candidate;
    }

    private static Actor actor(Project project) {
        return Actor.agent(project.ownerAccountId(), AGENT_NAME);
    }

    private static String description(String branch, List<ReasonView> reasons, String compareUrl) {
        List<String> lines = new ArrayList<>();
        lines.add("The integration gate is open, so the autoloop stopped. Why:");
        for (ReasonView reason : reasons) {
            lines.add("- " + reason.message() + (reason.cards().isEmpty()
                    ? ""
                    : " (" + String.join(", ", reason.cards()) + ")"));
        }
        lines.add("");
        lines.add(compareUrl == null
                ? "Branch: `" + branch + "`."
                : "Branch: `" + branch + "`. Review and merge it: " + compareUrl);
        lines.add("");
        lines.add("No form: the merge is the answer.");
        lines.add("");
        lines.add("What clears it: merge `" + branch + "` into main. The cards in Deploy move to done, no rule of the "
                + "gate is open any more, and this card closes itself on the next check.");
        return String.join("\n", lines);
    }
}
