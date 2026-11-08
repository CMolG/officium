package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.PrecedenceInvalidException;
import com.javadaba.contexts.officium.domain.PrecedenceRefusal;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.PrecedenceRules;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.VersionConflict;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.PrecedenceRepository;
import com.javadaba.contexts.officium.domain.ports.PrecedenceTemplateCatalog;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiConsumer;

/**
 * A project's precedence list (ADR 0032, JAVA-1686): the rules that rank which cards {@code cards.next}
 * hands out first. Any member reads it; only the owner writes it, under the list's version, like the
 * role matrix. A rule's open matches are counted in one pass over the project's cards.
 */
@ApplicationScoped
public class PrecedenceService {

    /** How many matching keys a preview names: enough to see what a rule catches, not a list to scroll. */
    static final int SAMPLE_KEYS = 5;

    private final PrecedenceRepository precedence;
    private final CardRepository cards;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final PrecedenceTemplateCatalog templates;
    private final PrecedenceBackfill backfill;
    private final Clock clock;

    @Inject
    public PrecedenceService(PrecedenceRepository precedence, CardRepository cards, SprintRepository sprints,
            CardService cardService, ProjectAccessGuard guard, ActivityPublisher activity,
            PrecedenceTemplateCatalog templates) {
        this(precedence, cards, sprints, cardService::reindexAll, guard, activity, templates, Clock.systemUTC());
    }

    PrecedenceService(PrecedenceRepository precedence, CardRepository cards, SprintRepository sprints,
            BiConsumer<UUID, List<UUID>> reindex, ProjectAccessGuard guard, ActivityPublisher activity,
            PrecedenceTemplateCatalog templates, Clock clock) {
        this.precedence = precedence;
        this.cards = cards;
        this.guard = guard;
        this.activity = activity;
        this.templates = templates;
        this.backfill = new PrecedenceBackfill(precedence, cards, sprints, activity, reindex, clock);
        this.clock = clock;
    }

    public PrecedenceView get(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return view(projectId);
    }

    /** Replaces the whole list under {@code expectedVersion}; a rule sent without an id gets a new one. */
    public PrecedenceView set(UUID accountId, UUID projectId, List<PrecedenceRule> rules, int expectedVersion,
            Actor actor) {
        return write(accountId, projectId, rules, expectedVersion, actor, "Precedence rules changed");
    }

    /** The market's templates, whole: any member may read what an import would add. */
    public List<PrecedenceTemplateCatalog.Template> templates(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return templates.templates();
    }

    /**
     * Appends a template's rules, tokens filled from {@code values}, after the saved ones: the same owner check,
     * version, limits and validation as {@link #set}, so an unknown epic or a 21st rule is refused alike (JAVA-1692).
     */
    public PrecedenceView importTemplate(UUID accountId, UUID projectId, String presetKey, String templateId,
            Map<String, String> values, int expectedVersion, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.OWNER);
        PrecedenceTemplateCatalog.Template template = templates.find(presetKey, templateId)
                .orElseThrow(() -> OfficiumException.notFound("precedence_template_not_found",
                        "No template " + templateId + " in preset " + presetKey));
        List<PrecedenceRule> merged = new ArrayList<>(view(projectId).rules().stream().map(RuleView::rule).toList());
        merged.addAll(PrecedenceTemplates.fill(template, values));
        return write(accountId, projectId, merged, expectedVersion, actor, "Precedence rules imported from template \""
                + template.title() + "\" (" + presetKey + "@" + template.presetVersion() + ")");
    }

    private PrecedenceView write(UUID accountId, UUID projectId, List<PrecedenceRule> rules, int expectedVersion,
            Actor actor, String message) {
        guard.requireAtLeast(projectId, accountId, Role.OWNER);
        PrecedenceView current = view(projectId);
        if (current.version() != expectedVersion) {
            throw new PrecedenceVersionConflictException(current);
        }
        List<PrecedenceRefusal> refusals = PrecedenceRules.validate(rules,
                knownEpics(cards.findAllByProject(projectId)));
        if (!refusals.isEmpty()) {
            throw new PrecedenceInvalidException(refusals.get(0));
        }
        List<PrecedenceRule> written = rules.stream().map(r -> r.id() == null ? withId(r) : r).toList();
        Instant now = Instant.now(clock);
        if (!precedence.saveIfVersion(projectId, written, actor, expectedVersion, now)) {
            throw new PrecedenceVersionConflictException(view(projectId));
        }
        activity.record(projectId, null, null, actor, "project.precedence", message, now);
        activity.publish("project.precedence", projectId, null, null, expectedVersion + 1, actor, now);
        return view(projectId);
    }

    /** What an unsaved rule would catch: its open matches, a few of their keys, and why it would be refused. */
    public PreviewView preview(UUID accountId, UUID projectId, PrecedenceRule rule) {
        guard.requireAccess(projectId, accountId);
        List<Card> all = cards.findAllByProject(projectId);
        List<PrecedenceRefusal> refusals = PrecedenceRules.validate(List.of(rule), knownEpics(all));
        List<Card> matching = openMatches(all, rule);
        return new PreviewView(matching.size(),
                matching.stream().limit(SAMPLE_KEYS).map(Card::key).toList(), refusals);
    }

    /** The cards {@link #backfillApply} would move into the active sprint for a saved rule. Saves nothing. */
    public BackfillPreview backfillPreview(UUID accountId, UUID projectId, UUID ruleId) {
        guard.requireAccess(projectId, accountId);
        PrecedenceBackfill.Plan plan = backfill.plan(projectId, ruleId);
        List<BackfillCard> listed = plan.cards().stream()
                .map(c -> new BackfillCard(c.key(), c.title(), c.status().wire(), c.priority().wire(),
                        plan.sprintNameOf(c)))
                .toList();
        return new BackfillPreview(ruleId, plan.rule().name(), view(projectId).version(),
                new SprintRef(plan.active().id(), plan.active().name()), listed.size(), listed);
    }

    /** Moves the rule's open cards into the active sprint; the owner only, under the list's version. */
    public BackfillApplied backfillApply(UUID accountId, UUID projectId, UUID ruleId, int expectedVersion,
            Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.OWNER);
        PrecedenceView current = view(projectId);
        if (current.version() != expectedVersion) {
            throw new PrecedenceVersionConflictException(current);
        }
        PrecedenceBackfill.Applied applied = backfill.apply(projectId, ruleId, actor);
        return new BackfillApplied(ruleId, applied.rule().name(), current.version(),
                new SprintRef(applied.active().id(), applied.active().name()), applied.moved());
    }

    private PrecedenceView view(UUID projectId) {
        List<Card> all = cards.findAllByProject(projectId);
        Optional<PrecedenceRepository.Stored> stored = precedence.find(projectId);
        List<PrecedenceRule> rules = stored.map(PrecedenceRepository.Stored::rules).orElse(List.of());
        List<RuleView> views = new ArrayList<>();
        for (PrecedenceRule rule : rules) {
            views.add(new RuleView(rule, openMatches(all, rule).size(),
                    PrecedenceRules.dormant(rule.match(), all)));
        }
        return new PrecedenceView(projectId, views, stored.map(PrecedenceRepository.Stored::version).orElse(0),
                stored.map(PrecedenceRepository.Stored::updatedAt).orElse(null),
                stored.map(PrecedenceRepository.Stored::updatedBy).orElse(null), unknown(rules));
    }

    /** The values a rule holds that the project removed since (ADR 0032): listed, never refused, never matched. */
    private static List<UnknownValue> unknown(List<PrecedenceRule> rules) {
        List<UnknownValue> unknown = new ArrayList<>();
        for (PrecedenceRule rule : rules) {
            for (String entry : rule.match().unknown()) {
                int colon = entry.indexOf(':');
                unknown.add(new UnknownValue(rule.id(), entry.substring(0, colon), entry.substring(colon + 1)));
            }
        }
        return unknown;
    }

    /** The open cards a rule matches: not done, not rejected, not deleted, not an epic. */
    private static List<Card> openMatches(List<Card> all, PrecedenceRule rule) {
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule), all);
        return all.stream()
                .filter(c -> !c.deleted() && !c.status().closed() && c.category() != Category.EPIC)
                .filter(c -> PrecedenceRules.matches(c, resolved.get(0)))
                .toList();
    }

    /** The keys and labels the project's epics carry: what a rule may name (precedence_epic_unknown). */
    private static List<String> knownEpics(List<Card> all) {
        List<String> names = new ArrayList<>();
        all.stream().filter(c -> c.category() == Category.EPIC).forEach(c -> {
            names.add(c.key());
            if (c.epic() != null && !c.epic().isBlank()) {
                names.add(c.epic());
            }
        });
        return names;
    }

    private static PrecedenceRule withId(PrecedenceRule rule) {
        return new PrecedenceRule(UUID.randomUUID(), rule.name(), rule.reason(), rule.match(), rule.defaults());
    }

    /** A rule with its open matches and whether it is dormant (its epics are closed). */
    public record RuleView(PrecedenceRule rule, int openMatches, boolean dormant) {
    }

    /** A value a rule holds that the project no longer knows, by its facet ({@code categories} or {@code signals}). */
    public record UnknownValue(UUID ruleId, String facet, String value) {
    }

    /** The list as it is stored: the version a write expects, who saved it last, and the values it no longer knows. */
    public record PrecedenceView(UUID projectId, List<RuleView> rules, int version, Instant updatedAt,
            Actor updatedBy, List<UnknownValue> unknown) {
    }

    /** What a preview answers: the open matches of an unsaved rule, a few of their keys, and its refusals. */
    public record PreviewView(int openMatches, List<String> sampleKeys, List<PrecedenceRefusal> refusals) {
    }

    /** A sprint as a backfill names it. */
    public record SprintRef(UUID id, String name) {
    }

    /** One card a backfill would move: its key, title, status and priority, and the sprint it sits in now. */
    public record BackfillCard(String key, String title, String status, String priority, String sprint) {
    }

    /** What a backfill preview answers: the rule, the list's version, the sprint, and the cards it would move. */
    public record BackfillPreview(UUID ruleId, String ruleName, int version, SprintRef sprint, int count,
            List<BackfillCard> cards) {
    }

    /** What a backfill apply answers: the keys it moved, under the list's version. */
    public record BackfillApplied(UUID ruleId, String ruleName, int version, SprintRef sprint, List<String> moved) {
    }

    /** {@code 409 {error:"version_conflict", message, current:<PrecedenceView>}} (contract §1.3). */
    public static class PrecedenceVersionConflictException extends OfficiumException implements VersionConflict {

        private final PrecedenceView current;

        PrecedenceVersionConflictException(PrecedenceView current) {
            super("version_conflict", "The project's precedence rules changed since you last read them", 409);
            this.current = current;
        }

        @Override
        public PrecedenceView current() {
            return current;
        }
    }
}
