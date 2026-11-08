package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.AnsweredQuestion;
import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardForm;
import com.javadaba.contexts.officium.domain.CardFormAnswer;
import com.javadaba.contexts.officium.domain.CardFormRules;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardFormRepository;
import com.javadaba.contexts.officium.domain.ports.CardForms;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * A human card answered with a Quaestio form (JAVA-894). The card keeps its definition (why, steps,
 * done when); its goal becomes completing the form, and the assignee completing it moves the card to
 * Ready with the answers on it, attributed to that person, so the card leaves "Needs you" on its own.
 *
 * <p>Only the assignee's completion counts, and the account is the one forms resolved from the
 * session, never what a client sent. An answer on a card already in Ready or beyond changes nothing.
 * The form stays published, so a card an agent sends back to To do takes a new answer, and the old
 * ones stay in its history.
 */
@ApplicationScoped
public class CardFormService {

    private static final Logger LOG = Logger.getLogger(CardFormService.class.getName());

    private final CardFormRepository links;
    private final CardForms forms;
    private final CardRepository cards;
    private final CardService cardService;
    private final CardCommentService comments;
    private final ProjectAccessGuard guard;
    private final Clock clock;

    @Inject
    public CardFormService(CardFormRepository links, CardForms forms, CardRepository cards, CardService cardService,
            CardCommentService comments, ProjectAccessGuard guard) {
        this(links, forms, cards, cardService, comments, guard, Clock.systemUTC());
    }

    CardFormService(CardFormRepository links, CardForms forms, CardRepository cards, CardService cardService,
            CardCommentService comments, ProjectAccessGuard guard, Clock clock) {
        this.links = links;
        this.forms = forms;
        this.cards = cards;
        this.cardService = cardService;
        this.comments = comments;
        this.guard = guard;
        this.clock = clock;
    }

    /**
     * @param title what the person sees on the form; the card's title when left out
     */
    /**
     * @param languages the languages the form is written in, the default first (JAVA-1082); the
     *        project's form languages when left out
     */
    public record FormSpec(String title, List<CardForms.QuestionDraft> questions, List<String> languages) {
        public FormSpec(String title, List<CardForms.QuestionDraft> questions) {
            this(title, questions, null);
        }
    }

    /**
     * Gives a human card its form, or replaces the questions of the one it has while nobody has
     * answered it: an answered form is the record of what was said, and is not rewritten.
     */
    public CardFormView attach(UUID accountId, UUID projectId, String keyOrId, FormSpec spec) {
        Project project = guard.requireAtLeast(projectId, accountId, Role.EDITOR).project();
        Card card = requireCard(accountId, projectId, keyOrId);
        CardFormRules.requireHumanCard(card);
        List<CardForms.QuestionDraft> questions = questions(spec);
        List<String> languages = languages(project, spec);
        requireValid(questions, languages);
        String title = spec.title() == null || spec.title().isBlank() ? card.title() : spec.title().strip();
        int count = (int) questions.stream().filter(CardForms.QuestionDraft::isQuestion).count();
        Optional<CardForm> existing = links.findByCard(card.id());
        if (existing.isPresent()) {
            CardForm current = existing.get();
            if (!links.answers(current.id()).isEmpty()) {
                throw OfficiumException.conflict("card_form_answered",
                        "The form of " + card.key() + " was answered: its answers are the record of what was said");
            }
            forms.replace(current.formId(), title, languages, questions);
            links.setQuestionCount(current.id(), count);
            return view(card, new CardForm(current.id(), projectId, card.id(), current.formId(), current.slug(),
                    count, current.createdAt()));
        }
        CardForms.Published published = forms.publish(title, languages, questions);
        CardForm link = new CardForm(UUID.randomUUID(), projectId, card.id(), published.formId(), published.slug(),
                count, Instant.now(clock));
        if (!links.insert(link)) {
            throw OfficiumException.conflict("card_form_exists", card.key() + " already has a form: ask again");
        }
        return view(card, link);
    }

    /**
     * Quaestio's rules over a spec, before a card or a form is saved (JAVA-891): at least one
     * question, then the structure validator and the authoring lint, whose problems come back in words.
     */
    private void requireValid(List<CardForms.QuestionDraft> questions, List<String> languages) {
        if (questions.stream().noneMatch(CardForms.QuestionDraft::isQuestion)) {
            throw OfficiumException.badRequest("form_needs_questions", "A form needs at least one question");
        }
        forms.check(questions, languages);
    }

    /**
     * The form's languages (JAVA-1082): the spec's, else the project's, else none (Quaestio's
     * default). A project that sets form languages requires every one of them: a spec naming fewer
     * is refused here, and the lint then names each question missing its text in one.
     */
    static List<String> languages(Project project, FormSpec spec) {
        List<String> required = project.formLanguages();
        List<String> given = spec == null || spec.languages() == null || spec.languages().isEmpty()
                ? null
                : FormLanguageCodes.valid(spec.languages());
        if (given == null) {
            return required.isEmpty() ? null : required;
        }
        List<String> missing = required.stream().filter(l -> !given.contains(l)).toList();
        if (!missing.isEmpty()) {
            throw OfficiumException.badRequest("form_invalid", "This project writes its card forms in "
                    + String.join(", ", required) + ": the form also needs " + String.join(", ", missing));
        }
        return given;
    }

    /**
     * A human card born with its form: the spec is checked first, so an invalid one saves no card.
     * The spec is the card's only way to be answered, so a card that is not for a person is refused.
     */
    public CardView create(UUID accountId, UUID projectId, CardService.NewCard card, FormSpec spec, Actor actor) {
        if (card.executor() != Executor.HUMAN) {
            throw OfficiumException.badRequest("card_form_human_only", "Only a human card carries a form");
        }
        requireValid(questions(spec),
                languages(guard.requireAtLeast(projectId, accountId, Role.EDITOR).project(), spec));
        CardView created = cardService.create(accountId, projectId, card, actor);
        attach(accountId, projectId, created.key(), spec);
        return created;
    }

    /** A wall (cards.requestHuman) born with its form; same order as {@link #create}. */
    public CardView requestHuman(UUID accountId, UUID projectId, CardService.RequestHuman wall, FormSpec spec,
            Actor actor) {
        requireValid(questions(spec),
                languages(guard.requireAtLeast(projectId, accountId, Role.EDITOR).project(), spec));
        CardView created = cardService.requestHuman(accountId, projectId, wall, actor);
        attach(accountId, projectId, created.key(), spec);
        return created;
    }

    private static List<CardForms.QuestionDraft> questions(FormSpec spec) {
        return spec == null || spec.questions() == null ? List.of() : spec.questions();
    }

    /** The card's form as it stands now; empty when the card has none. */
    public Optional<CardFormView> find(UUID accountId, UUID projectId, String keyOrId) {
        Card card = requireCard(accountId, projectId, keyOrId);
        return links.findByCard(card.id()).map(link -> view(card, link));
    }

    /** Who may fill a form, as asked by the form's own fill surface. */
    public enum FillAccess {
        /** Not a card's form: forms decides. */
        NOT_A_CARD_FORM,
        /** A card's form, and the respondent is an editor of its project. */
        ALLOWED,
        /** A card's form, and nobody is signed in. */
        NEEDS_ACCOUNT,
        /** A card's form, and the respondent is not an editor of its project. */
        DENIED
    }

    public FillAccess fillAccess(UUID formId, UUID respondentAccountId) {
        Optional<CardForm> link = links.findByFormId(formId);
        if (link.isEmpty()) {
            return FillAccess.NOT_A_CARD_FORM;
        }
        if (respondentAccountId == null) {
            return FillAccess.NEEDS_ACCOUNT;
        }
        try {
            guard.requireAtLeast(link.get().projectId(), respondentAccountId, Role.EDITOR);
            return FillAccess.ALLOWED;
        } catch (OfficiumException notAnEditor) {
            return FillAccess.DENIED;
        }
    }

    /**
     * @param respondentAccountId the account forms resolved from the session; null when anonymous
     * @param answers in the form's order
     * @param lang the language the form was filled in
     */
    public record Completion(UUID formId, UUID responseId, UUID respondentAccountId, Instant completedAt,
            List<AnsweredQuestion> answers, String lang) {
    }

    /**
     * A response to some form was completed. Nothing happens unless the form is a card's, the
     * respondent is the card's assignee and the card still waits on its person; then the answer is
     * kept, the card moves to Ready as that person, and a comment by them carries the answers.
     */
    public void completed(Completion completion) {
        Optional<CardForm> found = links.findByFormId(completion.formId());
        if (found.isEmpty()) {
            return;
        }
        CardForm link = found.get();
        Optional<Card> card = cards.findById(link.projectId(), link.cardId()).filter(c -> !c.deleted());
        Optional<Assignee> person = card
                .flatMap(c -> CardFormRules.answeringAssignee(c, completion.respondentAccountId()));
        if (person.isEmpty()) {
            return;
        }
        UUID accountId = completion.respondentAccountId();
        Actor actor = Actor.person(accountId, person.get().name());
        CardFormAnswer answer = new CardFormAnswer(UUID.randomUUID(), link.id(), completion.responseId(), accountId,
                person.get().name(), completion.answers(), completion.completedAt(), completion.lang());
        if (!links.insertAnswer(answer)) {
            return;
        }
        moveToReady(accountId, link, actor);
        try {
            comments.add(accountId, link.projectId(), card.get().key(), CardFormRules.comment(completion.answers()),
                    actor);
        } catch (RuntimeException ex) {
            // The answers are kept on the card and the card has moved: a comment that cannot be
            // written (the project's storage quota, say) must not undo either.
            LOG.log(Level.WARNING, "The answers to " + card.get().key() + " are kept but the comment was not", ex);
        }
    }

    /** Twice, for someone else's write in between: the answer is already kept. */
    private void moveToReady(UUID accountId, CardForm link, Actor actor) {
        for (int attempt = 0;; attempt++) {
            Card current = cards.findById(link.projectId(), link.cardId()).orElseThrow();
            if (!current.status().needsPerson()) {
                return;
            }
            try {
                cardService.move(accountId, link.projectId(), current.id(), current.version(), Status.READY, 0, actor);
                return;
            } catch (CardVersionConflictException conflict) {
                if (attempt > 0) {
                    throw conflict;
                }
            }
        }
    }

    private Card requireCard(UUID accountId, UUID projectId, String keyOrId) {
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        return cards.findById(projectId, cardId)
                .orElseThrow(() -> OfficiumException.notFound("card_not_found", "No such card"));
    }

    private CardFormView view(Card card, CardForm link) {
        return CardFormView.of(link, card.status(), links.answers(link.id()));
    }
}
