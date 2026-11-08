package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The part of each category's contract ({@link CategoryGuide}) the board can enforce (JAVA-393): one
 * gate for every category, which {@code CardService} calls on create, move and update. Routine is its
 * first rule set, the held scope of feature, bug, hotfix and regression its second (JAVA-381),
 * technicalDebt's entry its third (JAVA-388), userStory shipping whole its fourth (JAVA-382),
 * regression's entry and exit its fifth (JAVA-386), enhancement's stated public contracts its sixth
 * (JAVA-383), refactor's entry and stated public contracts its seventh (JAVA-387), and bug's named cause
 * and reproducing test its eighth (JAVA-384), infrastructure's topology, cost and rollback to enter and its
 * proving run and signal to leave its ninth (JAVA-389), hotfix's express entry and linked follow-up card its
 * tenth (JAVA-385), and spike's question, time box and success criterion to enter, and the deadline its time box
 * sets, its eleventh (JAVA-878), testing's coverage and what it leaves out to enter, and its gate run to leave,
 * its twelfth (JAVA-392), and documentation's audience and purpose to enter, and the code it was verified against
 * to leave, its thirteenth (JAVA-394); a sibling category adds its rules here rather than a mechanism of its own.
 *
 * <p>The gate applies to an AGENT writing an {@code ai} card. A person is never refused -- they own
 * the board, and their edits already reach agents as human edits -- and a wall ({@code human} card)
 * never is either: its steps are its runbook. A refusal is {@code 409 contract_unmet}, naming the
 * category, the contract item and the fix.
 */
public final class CategoryContracts {

    public static final String CONTRACT_UNMET = "contract_unmet";

    /** The line an agent's routine card names its runbook with: a tree path, a URL or a card key. */
    public static final String RUNBOOK_LINE = "Runbook:";

    private static final Pattern RUNBOOK = labeledLine("Runbook");

    /** The comment line an agent's regression card names the change that caused it with. */
    public static final String CAUSED_BY_LINE = "Caused by:";

    private static final Pattern CAUSED_BY = Pattern.compile(
            "(?m)^\\s*(?:[-*]\\s+)?\\**Caused by\\**:\\**[ \\t]*(.*)$");

    /**
     * A reference to a change: a commit hash (7 to 40 hex characters with at least one digit, so a word like
     * {@code deadbeef} is not one), a pull request number ({@code #94}), or a commit or pull URL.
     */
    private static final Pattern CHANGE_REF = Pattern.compile(
            "(?<![0-9A-Za-z])(?=[0-9a-fA-F]*[0-9])[0-9a-fA-F]{7,40}(?![0-9A-Za-z])"
                    + "|(?<![\\w&])#\\d+(?!\\w)"
                    + "|https?://\\S+/(?:commit|commits|pull)/\\S+");

    /** The comment line an agent's enhancement card states the public contracts its change touched with. */
    public static final String PUBLIC_CONTRACTS_LINE = "Public contracts:";

    private static final Pattern PUBLIC_CONTRACTS = labeledLine("Public contracts");

    private static final String PUBLIC_CONTRACTS_KEPT = "Existing public contracts are not broken: an API, a wire "
            + "field, a URL or a stored format keeps its shape.";

    private static final String REFACTOR_WHY_AND_WHERE = "Why it is restructured, and the structure it ends in.";

    private static final String REFACTOR_CONTRACTS_KEPT = "No public contract changed: the API, the wire formats "
            + "and the exported types are the same.";

    private static final String REGRESSION_VERSIONS = "The good version and the bad version are identified: the "
            + "last one where it worked, the first one where it doesn't.";

    /** The comment line an agent's bug card names what was wrong with (JAVA-384); not regression's {@code Caused by:}. */
    public static final String CAUSE_LINE = "Cause:";

    /** The comment line an agent's bug card names the test that reproduces the failure with (JAVA-384). */
    public static final String REPRODUCED_BY_LINE = "Reproduced by:";

    private static final Pattern CAUSE = labeledLine("Cause");

    private static final Pattern REPRODUCED_BY = labeledLine("Reproduced by");

    private static final String BUG_REPRODUCED = "A test that reproduces the failure, seen red before the fix and "
            + "green after it.";

    private static final String BUG_CAUSE_FIXED = "The cause is fixed, not the symptom.";

    /** The comment line an agent's infrastructure card names the run that proved it with (JAVA-389). */
    public static final String PROVEN_BY_LINE = "Proven by:";

    /** The comment line an agent's infrastructure card names the signal that shows it working with (JAVA-389). */
    public static final String OBSERVED_BY_LINE = "Observed by:";

    private static final String INFRASTRUCTURE_PROVEN = "The infrastructure is applied as code, and proven by "
            + "running it (a runnable probe comes before any design), not only by reading it.";

    private static final String INFRASTRUCTURE_OBSERVED = "The change's observability is active: a metric, a log or "
            + "an alert shows it working.";

    private static final String TESTING_COVERAGE = "What gets covered, and why, and what is left out.";

    /** The comment line an agent's testing card names the gate run that shows its tests green with (JAVA-392). */
    public static final String GATE_LINE = "Gate:";

    private static final String TESTING_GREEN = "The tests are green and deterministic, the same result on every run, "
            + "in the project's gate: CI, or the local attestation where CI does not run the tests.";

    private static final String DOCUMENTATION_AUDIENCE = "Who it is for, and what it is for.";

    /** The comment line an agent's documentation card names the code it was checked against with (JAVA-394). */
    public static final String VERIFIED_AGAINST_LINE = "Verified against:";

    private static final String DOCUMENTATION_VERIFIED = "The content is verified against the real code, never against "
            + "another document.";

    /** The description line an agent's spike states how long its research may run with (JAVA-878). */
    public static final String TIME_BOX_LINE = "Time box:";

    /** A {@code Time box:} line's value, or a {@code ## Time box} section's first line: group 1 or 2. */
    private static final Pattern TIME_BOX = Pattern.compile("(?m)^\\s*(?:[-*]\\s+)?\\**Time box\\**:\\**[ \\t]*(\\S.*)$"
            + "|^[ \\t]*#{1,6}[ \\t]+Time box:?[ \\t]*#*[ \\t]*\\R(?:[ \\t]*\\R)*[ \\t]*(?!#{1,6}(?:[ \\t]|$))(\\S.*)$");

    /** A whole number of hours or days, at the start of the value: {@code 4h}, {@code 2 days}, {@code `1d`}. */
    private static final Pattern DURATION = Pattern.compile("[`*_]*(\\d{1,4})[ \\t]*(h|hours?|d|days?)(?![A-Za-z])",
            Pattern.CASE_INSENSITIVE);

    /** A comment line an exit asks for: its label, and the line to write when none of the run's comments has it. */
    private record ExitLine(Pattern label, String line) {
    }

    private static final List<ExitLine> BUG_EXIT = List.of(
            new ExitLine(CAUSE, "`" + CAUSE_LINE + " <what was wrong, in the code or the data, not the symptom>`"),
            new ExitLine(REPRODUCED_BY, "`" + REPRODUCED_BY_LINE + " <the test seen red before the fix and green "
                    + "after it>`"));

    private static final List<ExitLine> INFRASTRUCTURE_EXIT = List.of(
            new ExitLine(labeledLine("Proven by"), "`" + PROVEN_BY_LINE + " <the command or run that applied it, and "
                    + "what it showed>`"),
            new ExitLine(labeledLine("Observed by"), "`" + OBSERVED_BY_LINE + " <the metric, log or alert that shows "
                    + "it working>`"));

    private static final List<ExitLine> TESTING_EXIT = List.of(
            new ExitLine(labeledLine("Gate"), "`" + GATE_LINE + " <the run of the project's gate that shows the tests "
                    + "green, and its result>`"));

    private static final List<ExitLine> DOCUMENTATION_EXIT = List.of(
            new ExitLine(labeledLine("Verified against"), "`" + VERIFIED_AGAINST_LINE + " <the code it was checked "
                    + "against: files, commands run, commits>`"));

    /**
     * One item of a category's entry contract the board reads: the contract line as {@link CategoryGuide}
     * words it, what to write when it is missing, and the labeled description line that satisfies it. An
     * item whose value the board reads (spike's time box, JAVA-878) also says when the value is usable, and
     * what to write when it is not.
     */
    private record EntryItem(String line, String fix, Pattern label, Predicate<String> usable, String unusable) {

        EntryItem(String line, String fix, Pattern label) {
            this(line, fix, label, description -> true, null);
        }

        /** What to write for this item, or empty when the description meets it. */
        Optional<String> unmet(String description) {
            if (!hasLine(label, description)) {
                return Optional.of(fix);
            }
            return usable.test(description) ? Optional.empty() : Optional.of(unusable);
        }
    }

    /** A category's gated entry items, and the sentence the refusal closes with. */
    private record Entry(List<EntryItem> items, String closing) {
    }

    /**
     * The categories whose entry contract is gated, each with its items. Another category joins by adding
     * its items here. Labeled lines, never a heuristic over free text, which would pass almost any
     * description.
     */
    private static final Map<Category, Entry> ENTRY = Map.of(
            Category.ROUTINE, new Entry(List.of(new EntryItem("The runbook it follows, referenced.",
                    "An agent's routine card enters To do or In progress naming its runbook: add a description line `"
                            + RUNBOOK_LINE + " <tree path | URL | card key>`.",
                    RUNBOOK)),
                    "With no runbook yet it is not routine: write the runbook first, as a documentation card, or "
                            + "leave this card in refine."),
            Category.TECHNICAL_DEBT, new Entry(List.of(
                    new EntryItem("What it slows down, or the risk it carries.",
                            "Add a description line `Slows down: <what it slows down>` or `Risk: <the risk it "
                                    + "carries>`.",
                            labeledLine("Slows down|Risk")),
                    new EntryItem("The cost of not paying it.",
                            "Add a description line `Cost of not paying: <what leaving it costs>`.",
                            labeledLine("Cost of not paying"))),
                    "An agent's technicalDebt card enters To do or In progress with both; until then it stays in "
                            + "refine."),
            Category.REGRESSION, new Entry(List.of(
                    new EntryItem(REGRESSION_VERSIONS,
                            "Add a description line `Last good: <commit | tag | release>`, the last version where it "
                                    + "worked.",
                            labeledLine("Last good")),
                    new EntryItem(REGRESSION_VERSIONS,
                            "Add a description line `First bad: <commit | tag | release>`, the first version where it "
                                    + "does not.",
                            labeledLine("First bad"))),
                    "An agent's regression card enters To do or In progress with both; until then it stays in "
                            + "refine."),
            Category.REFACTOR, new Entry(List.of(
                    new EntryItem(REFACTOR_WHY_AND_WHERE,
                            "Add a description line `Restructured because: <why it is restructured>`.",
                            labeledLine("Restructured because")),
                    new EntryItem(REFACTOR_WHY_AND_WHERE,
                            "Add a description line `Ends in: <the structure it ends in>`.",
                            labeledLine("Ends in"))),
                    "An agent's refactor card enters To do or In progress with both; until then it stays in "
                            + "refine."),
            Category.INFRASTRUCTURE, new Entry(List.of(
                    new EntryItem("The target topology: what runs where once it is done.",
                            "Add a description line `Topology: <what runs where once it is done>`.",
                            labeledLine("Topology|Target topology")),
                    new EntryItem("Its impact on cost and capacity.",
                            "Add a description line `Cost and capacity: <its impact on cost and capacity>`.",
                            labeledLine("Cost and capacity|Capacity and cost")),
                    new EntryItem("The rollback plan: how the change is undone.",
                            "Add a description line `Rollback: <how the change is undone>`.",
                            labeledLine("Rollback|Rollback plan"))),
                    "A section works too: a heading with the label (`## Rollback`) followed by its text. An agent's "
                            + "infrastructure card enters To do or In progress with all three; until then it stays "
                            + "in refine."),
            Category.HOTFIX, new Entry(List.of(
                    new EntryItem("Its impact in production is confirmed, not assumed.",
                            "Add a description line `Impact: <the confirmed impact in production>`.",
                            labeledLine("Impact")),
                    new EntryItem("The affected version: what production runs.",
                            "Add a description line `Affected version: <the commit, tag or release production runs>`.",
                            labeledLine("Affected version")),
                    new EntryItem("A minimal reproduction.",
                            "Add a description line `Reproduction: <the minimal steps that show it>` (or `Repro:`, "
                                    + "`Steps to reproduce:`).",
                            labeledLine("Reproduction|Repro|Steps to reproduce"))),
                    "A section works too: a heading with the label (`## Reproduction`) followed by its text. Its "
                            + "refine is express: an agent's hotfix enters To do or In progress with all three, and "
                            + "one created with them and no status lands in To do."),
            Category.SPIKE, new Entry(List.of(
                    new EntryItem("A concrete question.",
                            "Add a description line `Question: <the concrete question it answers>`.",
                            labeledLine("Question")),
                    new EntryItem("A time box.",
                            "Add a description line `" + TIME_BOX_LINE + " <n>h` or `" + TIME_BOX_LINE + " <n>d` "
                                    + "(also `hours`, `days`): how long it may run, counted from its last move into "
                                    + "In progress.",
                            labeledLine("Time box"), description -> timeBox(description).isPresent(),
                            "The `" + TIME_BOX_LINE + "` value is not a duration: write a whole number of hours or "
                                    + "days, at least 1, as `<n>h` or `<n>d` (also `hours`, `days`), e.g. `"
                                    + TIME_BOX_LINE + " 4h`."),
                    new EntryItem("A success criterion: the answer that closes the question.",
                            "Add a description line `Success criterion: <the answer that closes the question>` (or "
                                    + "`Answer that closes it:`).",
                            labeledLine("Success criterion|Answer that closes it"))),
                    "A section works too: a heading with the label (`## Question`) followed by its text. An agent's "
                            + "spike enters To do or In progress with all three; until then it stays in refine. Once "
                            + "In progress, when its time box runs out the board moves it to ready with what "
                            + "exists."),
            Category.TESTING, new Entry(List.of(
                    new EntryItem(TESTING_COVERAGE,
                            "Add a description line `Covers: <what gets covered, and why>` (or `What gets covered:`).",
                            labeledLine("Covers|What gets covered(?:, and why)?")),
                    new EntryItem(TESTING_COVERAGE,
                            "Add a description line `Left out: <what is not covered>`.",
                            labeledLine("Left out"))),
                    "A section works too: a heading with the label (`## What gets covered, and why`) followed by its "
                            + "text. An agent's testing card enters To do or In progress with both; until then it "
                            + "stays in refine."),
            Category.DOCUMENTATION, new Entry(List.of(
                    new EntryItem(DOCUMENTATION_AUDIENCE,
                            "Add a description line `Audience: <who it is for>` (or `Who it is for:`).",
                            labeledLine("Audience|Who it is for")),
                    new EntryItem(DOCUMENTATION_AUDIENCE,
                            "Add a description line `Purpose: <what it is for>` (or `What it is for:`).",
                            labeledLine("Purpose|What it is for"))),
                    "A section works too: a heading with the label (`## Audience`) followed by its text. An agent's "
                            + "documentation card enters To do or In progress with both; until then it stays in "
                            + "refine."));

    /**
     * A category's gated exit: whether this run's comments meet it, and the refusal for a target status and
     * those comments, so a refusal can name only what they lack.
     */
    private record Exit(Predicate<List<CardComment>> met, BiFunction<Status, List<CardComment>, String> refusal) {

        Exit(Predicate<List<CardComment>> met, Function<Status, String> refusal) {
            this(met, (to, comments) -> refusal.apply(to));
        }
    }

    /**
     * The categories whose exit contract is gated when a run ends, each with what this run's comments must
     * carry. Another category joins by adding itself here.
     */
    private static final Map<Category, Exit> EXIT = Map.of(
            Category.ROUTINE, new Exit(comments -> !comments.isEmpty(),
                    to -> "routine contract, exit: \"Evidence of the execution: the output, the log or the check "
                            + "that shows it ran.\" Comment that evidence on the card (cards.comment), then move it "
                            + "to " + to.wire() + " again: no comment was posted since it last entered In progress."),
            Category.REGRESSION, new Exit(comments -> comments.stream().anyMatch(c -> namesCause(c.text())),
                    to -> "regression contract, exit: \"The change that caused it is located: its commit or its "
                            + "PR.\" Comment it on the card (cards.comment) with a line `" + CAUSED_BY_LINE
                            + " <commit hash | #PR | commit or pull URL>`, then move it to " + to.wire() + " again: "
                            + "no comment posted since it last entered In progress names one."),
            Category.ENHANCEMENT, new Exit(CategoryContracts::statesPublicContracts,
                    to -> "enhancement contract, behavior: \"" + PUBLIC_CONTRACTS_KEPT + "\" Comment on the card "
                            + "(cards.comment) a line `" + PUBLIC_CONTRACTS_LINE + " <each public surface the change "
                            + "touched and how it keeps its shape, or none>`, then move it to " + to.wire() + " again: "
                            + "no comment posted since it last entered In progress states them. The board checks the "
                            + "line is there; whether it is true is the reviewer's."),
            Category.REFACTOR, new Exit(CategoryContracts::statesPublicContracts,
                    to -> "refactor contract, exit: \"" + REFACTOR_CONTRACTS_KEPT + "\" Comment on the card "
                            + "(cards.comment) a line `" + PUBLIC_CONTRACTS_LINE + " <each public surface the change "
                            + "touched and how it kept its shape, or none>`, then move it to " + to.wire() + " again: "
                            + "no comment posted since it last entered In progress states them. The board checks the "
                            + "line is there; whether it is true, and that no existing test was modified, is the "
                            + "reviewer's."),
            Category.BUG, labeledLinesExit(BUG_EXIT, "bug contract, exit: \"" + BUG_REPRODUCED + "\" Behavior: \""
                    + BUG_CAUSE_FIXED + "\"", "whether they are true is the reviewer's."),
            Category.INFRASTRUCTURE, labeledLinesExit(INFRASTRUCTURE_EXIT, "infrastructure contract, exit: \""
                    + INFRASTRUCTURE_PROVEN + "\" \"" + INFRASTRUCTURE_OBSERVED + "\"",
                    "whether they are true, and that the change is applied as code in the diff, is the reviewer's."),
            Category.TESTING, labeledLinesExit(TESTING_EXIT, "testing contract, exit: \"" + TESTING_GREEN + "\"",
                    "whether the run is real, its tests green and deterministic, and every red it found fixed in the "
                            + "test or carded, is the reviewer's."),
            Category.DOCUMENTATION, labeledLinesExit(DOCUMENTATION_EXIT, "documentation contract, exit: \""
                    + DOCUMENTATION_VERIFIED + "\"",
                    "whether it is true, and names the code rather than another "
                            + "document, is the reviewer's, as is the behavior: the content documents what the code does, not "
                            + "what it was meant to do, and what no longer exists is deleted, not only added to."));

    private static final Set<Status> WORK_STARTED = Set.of(Status.TODO, Status.DOING);

    static final Set<Status> RUN_ENDED = Set.of(Status.REVIEW, Status.DEPLOY, Status.DONE);

    /** Hotfix's exit line the board checks (JAVA-385), as {@link CategoryGuide} words it. */
    private static final String HOTFIX_FOLLOW_UP = "A follow-up card exists, as a bug or a regression, for the root "
            + "cause and the test that pins it.";

    /** The categories a hotfix's follow-up card may have. */
    private static final Set<Category> FOLLOW_UP = Set.of(Category.BUG, Category.REGRESSION);

    /**
     * The categories whose Behavior holds their scope ({@link CategoryGuide}), each with that line as
     * written. Another category joins by adding itself here.
     */
    private static final Map<Category, String> SCOPE_HELD = Map.of(
            Category.FEATURE, "Its scope does not grow without going back to Refine.",
            Category.BUG, "Its scope does not grow: anything else found on the way is a card of its own.",
            Category.HOTFIX, "No refactoring and no scope growth: the full repair is the follow-up card.",
            Category.REGRESSION, "Its scope does not grow: anything else found on the way is a card of its own.");

    /**
     * The categories whose Behavior has them ship whole ({@link CategoryGuide}), each with that line as
     * written (JAVA-382). Another category joins by adding itself here.
     */
    private static final Map<Category, String> SHIPS_WHOLE = Map.of(
            Category.USER_STORY, "It is delivered end to end, not layer by layer: the user can walk the story "
                    + "when it ships.");

    /** A card blocking the one being moved: its key and where it sits on the board. */
    public record Blocker(String key, Status status) {
    }

    private static final Pattern CHECKED_BOX = Pattern.compile("(?m)^(\\s*(?:[-*+]|\\d+[.)])\\s+)\\[[xX]\\]");

    private CategoryContracts() {
    }

    /**
     * Where a card created with no status lands, whoever creates it. R1, "it skips Refine": a routine card
     * lands in To do. Hotfix's "its refine is express" (JAVA-385): a hotfix whose description already meets
     * its entry contract lands in To do, one that does not in Refine. Every other category is born in Refine.
     */
    public static Status defaultStatus(Category category, String description) {
        if (category == Category.ROUTINE) {
            return Status.TODO;
        }
        if (category == Category.HOTFIX
                && ENTRY.get(Category.HOTFIX).items().stream().allMatch(item -> hasLine(item.label(), description))) {
            return Status.TODO;
        }
        return Status.REFINE;
    }

    /**
     * Hotfix's exit "a follow-up card exists, as a bug or a regression" (JAVA-385), checked when a run ends,
     * gated like {@link #requireExit}: an agent's {@code ai} hotfix leaving the work phase for Review, Deploy or
     * Done is linked ({@code related} or {@code blocks}, either way) to a live {@code bug} or {@code regression}
     * card. That card's status does not matter: the contract asks that it exist. The rest of the exit, a branch
     * cut from what production runs and a minimal diff deployed and verified, is in the git history and the
     * deploy, not on the card: the reviewer's and the release's. {@code linked} is the categories of the live
     * cards linked to this one, only read when the gate applies.
     */
    public static void requireFollowUp(ActorKind actor, Executor executor, Category category, Status from, Status to,
            Supplier<List<Category>> linked) {
        if (category != Category.HOTFIX || !gated(actor, executor) || RUN_ENDED.contains(from)
                || !RUN_ENDED.contains(to)) {
            return;
        }
        if (linked.get().stream().anyMatch(c -> c != null && FOLLOW_UP.contains(c))) {
            return;
        }
        throw OfficiumException.conflict(CONTRACT_UNMET, "hotfix contract, exit: \"" + HOTFIX_FOLLOW_UP + "\" Create "
                + "it (cards.create with category bug or regression and related: [<this hotfix's key>]) or link the "
                + "one that exists (cards.link), then move it to " + to.wire() + " again: no bug or regression card is "
                + "linked to it.");
    }

    /**
     * R2, entry: a card of a gated category ({@link #ENTRY}) entering To do or In progress (created
     * there, {@code from == null}, or moved out of Refine) carries every item's labeled line. Routine's
     * is "the runbook it follows, referenced" ({@code Runbook:}); technicalDebt's (JAVA-388) are "what it
     * slows down, or the risk it carries" ({@code Slows down:} or {@code Risk:}) and "the cost of not
     * paying it" ({@code Cost of not paying:}); regression's (JAVA-386) is "the good version and the bad
     * version are identified" ({@code Last good:} and {@code First bad:}); refactor's (JAVA-387) is "why it
     * is restructured, and the structure it ends in" ({@code Restructured because:} and {@code Ends in:});
     * infrastructure's (JAVA-389) are its target topology ({@code Topology:} or {@code Target topology:}), its
     * impact on cost and capacity ({@code Cost and capacity:} or {@code Capacity and cost:}) and its rollback
     * plan ({@code Rollback:} or {@code Rollback plan:}); hotfix's (JAVA-385) are its confirmed impact in
     * production ({@code Impact:}), the affected version ({@code Affected version:}) and a minimal reproduction
     * ({@code Reproduction:}, {@code Repro:} or {@code Steps to reproduce:}); spike's (JAVA-878) are a concrete
     * question ({@code Question:}), a time box ({@code Time box:}, whose value must be a duration, {@link #timeBox})
     * and a success criterion ({@code Success criterion:} or {@code Answer that closes it:}); testing's (JAVA-392) is
     * "what gets covered, and why, and what is left out" ({@code Covers:}, {@code What gets covered:} or
     * {@code What gets covered, and why:}, and {@code Left out:}); documentation's (JAVA-394) is "who it is for, and
     * what it is for" ({@code Audience:} or {@code Who it is for:}, and {@code Purpose:} or {@code What it is for:}).
     * Any label is also met
     * by a section, a heading with the label followed by its text. The refusal names only the
     * missing items, quoting a contract line once when two of its labels are missing.
     * Re-categorizing a card already past Refine is not gated.
     */
    public static void requireEntry(ActorKind actor, Executor executor, Category category, Status from, Status to,
            String description) {
        Entry entry = category == null ? null : ENTRY.get(category);
        if (entry == null || !gated(actor, executor) || !WORK_STARTED.contains(to)
                || (from != null && from != Status.REFINE)) {
            return;
        }
        StringBuilder message = new StringBuilder(category.wire()).append(" contract, entry:");
        String quoted = null;
        for (EntryItem item : entry.items()) {
            Optional<String> fix = item.unmet(description);
            if (fix.isEmpty()) {
                continue;
            }
            if (!item.line().equals(quoted)) {
                message.append(" \"").append(item.line()).append('"');
                quoted = item.line();
            }
            message.append(' ').append(fix.get());
        }
        if (quoted == null) {
            return;
        }
        throw OfficiumException.conflict(CONTRACT_UNMET, message.append(' ').append(entry.closing()).toString());
    }

    /**
     * Exit, checked when a run ends: a card of a gated category ({@link #EXIT}) leaving the work phase for
     * Review, Deploy or Done carries its exit in a comment posted since its run started ({@link #runStart}).
     * R3, routine's "evidence of the execution", is any such comment: the board cannot judge the evidence,
     * only that it was written; the reviewer reads it. Regression's "the change that caused it is located"
     * (JAVA-386) is a comment with a {@code Caused by:} line naming a commit hash, a PR number or a commit
     * or pull URL; whether it names the RIGHT change is the reviewer's. Enhancement's Behavior "existing
     * public contracts are not broken" (JAVA-383) is a comment with a {@code Public contracts:} line stating
     * the public surface the change touched and how it keeps its shape, or that none was; whether that
     * statement matches the diff is the reviewer's. Refactor's exit "no public contract changed" (JAVA-387)
     * is the same line; "none of the existing tests was modified" is read from the diff, not from the
     * board (JAVA-848). Bug's exit "a test that reproduces the failure, seen red before the fix and green after
     * it" and its Behavior "the cause is fixed, not the symptom" (JAVA-384) are a {@code Cause:} and a
     * {@code Reproduced by:} line, in one comment or two; neither is in the diff, so the board asks for them
     * and the reviewer checks them against it, running that test without the fix. Infrastructure's exit (JAVA-389),
     * "proven by running it" and "its observability is active", is a {@code Proven by:} and an {@code Observed
     * by:} line, for the same reason; "applied as code" IS in the diff, so it is the reviewer's alone, as is
     * whether the run and the signal are real. Testing's exit (JAVA-392), "the tests are green and deterministic
     * in the project's gate", is a {@code Gate:} line naming that run and its result; whether the run is real, green
     * and deterministic, and production code untouched (a harness check, JAVA-880), is not the board's. Documentation's
     * exit (JAVA-394), "verified against the real code, never against another document", is a {@code Verified
     * against:} line: the diff shows the page that changed, not what it was checked against, and an Officium page
     * has no diff at all; whether the line is true and names code rather than a document is the reviewer's. A card
     * already past its run (Review
     * on to Deploy, Deploy on to Done) is not gated: that is the reviewer's approval or the merge closing
     * it (GitHub's push, an agent that cannot comment), not the end of a run. {@code commentsThisRun} is
     * only read when the gate applies, since reading it costs the card's moves and comments.
     */
    public static void requireExit(ActorKind actor, Executor executor, Category category, Status from, Status to,
            Supplier<List<CardComment>> commentsThisRun) {
        Exit exit = category == null ? null : EXIT.get(category);
        if (exit == null || !gated(actor, executor) || RUN_ENDED.contains(from) || !RUN_ENDED.contains(to)) {
            return;
        }
        List<CardComment> comments = commentsThisRun.get();
        if (!exit.met().test(comments)) {
            throw OfficiumException.conflict(CONTRACT_UNMET, exit.refusal().apply(to, comments));
        }
    }

    /** Whether one of this run's comments has a {@code Public contracts:} line with a value. */
    private static boolean statesPublicContracts(List<CardComment> comments) {
        return comments.stream().anyMatch(c -> hasLine(PUBLIC_CONTRACTS, c.text()));
    }

    private static boolean anyHasLine(Pattern label, List<CardComment> comments) {
        return comments.stream().anyMatch(c -> hasLine(label, c.text()));
    }

    /** The exit's lines that none of this run's comments carries, each as the line to write. */
    private static List<String> missingLines(List<ExitLine> lines, List<CardComment> comments) {
        return lines.stream().filter(line -> !anyHasLine(line.label(), comments)).map(ExitLine::line).toList();
    }

    /**
     * An exit met by labeled lines in this run's comments, one comment or several: bug's (JAVA-384) and
     * infrastructure's (JAVA-389). The refusal quotes the contract, then names only the missing lines and
     * says whose the rest ({@code whose}) is.
     */
    private static Exit labeledLinesExit(List<ExitLine> lines, String quoted, String whose) {
        return new Exit(comments -> missingLines(lines, comments).isEmpty(), (to, comments) -> {
            List<String> missing = missingLines(lines, comments);
            boolean one = missing.size() == 1;
            return quoted + " Comment on the card (cards.comment) " + (one ? "a line " : "the lines ")
                    + String.join(" and ", missing) + ", then move it to " + to.wire() + " again: no comment posted "
                    + "since it last entered In progress " + (one ? "has it" : "has them") + ". The board checks the "
                    + "lines are there; " + whose;
        });
    }

    /** Whether a comment has a {@code Caused by:} line whose value names a change: a hash, a PR or a URL. */
    static boolean namesCause(String comment) {
        if (comment == null) {
            return false;
        }
        Matcher lines = CAUSED_BY.matcher(comment);
        while (lines.find()) {
            if (CHANGE_REF.matcher(lines.group(1)).find()) {
                return true;
            }
        }
        return false;
    }

    /**
     * JAVA-381, Behavior "its scope does not grow": an agent edits the title or description of a
     * card in one of {@link #SCOPE_HELD}'s categories only while it is in Refine. The category is read
     * before the edit and after it, so re-categorizing in the same call does not step around the gate.
     * Ticking or unticking checklist boxes is progress, not scope, and passes. Everything else on the
     * card (action plan, priority, tags...) is not scope either; growth written there is the
     * reviewer's to catch.
     */
    public static void requireScopeHeld(ActorKind actor, Card current, Card edited) {
        Category category = holdsScope(current.category()) ? current.category() : edited.category();
        if (!gated(actor, current.executor()) || !holdsScope(category)
                || current.status() == Status.REFINE
                || (current.title().equals(edited.title())
                        && uncheckedBoxes(current.description()).equals(uncheckedBoxes(edited.description())))) {
            return;
        }
        throw OfficiumException.conflict(CONTRACT_UNMET, category.wire() + " contract, behavior: \""
                + SCOPE_HELD.get(category) + "\" An agent changes a " + category.wire() + " card's title or "
                + "description only in refine: move it there (cards.move), edit it, then move it on. Or leave the "
                + "card as it is and put what you found in a comment (cards.comment) or a card of its own "
                + "(cards.create). Ticking checklist boxes and editing the action plan are not gated.");
    }

    /**
     * JAVA-382, Behavior "delivered end to end, not layer by layer": an agent's card in one of
     * {@link #SHIPS_WHOLE}'s categories does not ship (enter Deploy or Done) while a card blocking it
     * has not -- the board's own open blocker, {@link CardRules#isBlocked}. A story split into layers is
     * visible only through the {@code blocks} link between them, so that link is what is checked.
     * Moving to Review is not gated (the story waits there for its blocker), and neither is Deploy on to
     * Done: that is the merge closing what review approved, checked on its way into Deploy.
     * {@code blockers} is only read when the gate applies.
     */
    public static void requireBlockersShipped(ActorKind actor, Executor executor, Category category, Status from,
            Status to, Supplier<List<Blocker>> blockers) {
        if (!gated(actor, executor) || category == null || !SHIPS_WHOLE.containsKey(category) || from.finished()
                || !to.finished()) {
            return;
        }
        List<String> open = blockers.get().stream().filter(b -> !b.status().finished())
                .map(b -> b.key() + " (" + b.status().wire() + ")").toList();
        if (open.isEmpty()) {
            return;
        }
        throw OfficiumException.conflict(CONTRACT_UNMET, category.wire() + " contract, behavior: \""
                + SHIPS_WHOLE.get(category) + "\" It cannot move to " + to.wire() + " while a card blocking it has "
                + "not shipped: " + String.join(", ", open) + ". Ship those first (deploy or done), or, if the "
                + "story no longer depends on one, remove the link (cards.unlink) and say why in a comment "
                + "(cards.comment).");
    }

    private static boolean holdsScope(Category category) {
        return category != null && SCOPE_HELD.containsKey(category);
    }

    /** The text with every checklist box unticked, so ticking one is not read as a change of scope. */
    static String uncheckedBoxes(String text) {
        return text == null ? "" : CHECKED_BOX.matcher(text).replaceAll("$1[ ]");
    }

    public static boolean namesRunbook(String description) {
        return hasLine(RUNBOOK, description);
    }

    static boolean hasLine(Pattern label, String description) {
        return description != null && label.matcher(description).find();
    }

    /**
     * A description line {@code <label>: <text>}, optionally a list item and optionally bold, with the bold
     * closed after the colon ({@code **Label:**}) or before it ({@code **Label**:}). Or a section: a Markdown
     * heading with the label ({@code ## Rollback}) whose next non-blank line is text, not another heading
     * (JAVA-389 Decision 3, where cards already state these as sections).
     */
    static Pattern labeledLine(String labels) {
        return Pattern.compile("(?m)^\\s*(?:[-*]\\s+)?\\**(?:" + labels + ")\\**:\\**[ \\t]*\\S"
                + "|^[ \\t]*#{1,6}[ \\t]+(?:" + labels + "):?[ \\t]*#*[ \\t]*\\R(?:[ \\t]*\\R)*[ \\t]*"
                + "(?!#{1,6}(?:[ \\t]|$))\\S");
    }

    /** When the run being closed started: the card's last move into In progress, or its creation. */
    public static Instant runStart(Instant createdAt, List<DeliveryFlow.Move> moves) {
        Instant start = createdAt;
        for (DeliveryFlow.Move move : moves) {
            if (move.to() == Status.DOING && move.at().isAfter(start)) {
                start = move.at();
            }
        }
        return start;
    }

    /**
     * A spike's time box (JAVA-878): the value of its first {@code Time box:} line or section, when that value
     * starts with a whole number of hours or days, at least 1. A duration and not a date, so a spike nobody
     * started has no box running out.
     */
    public static Optional<Duration> timeBox(String description) {
        if (description == null) {
            return Optional.empty();
        }
        Matcher line = TIME_BOX.matcher(description);
        if (!line.find()) {
            return Optional.empty();
        }
        Matcher value = DURATION.matcher(line.group(1) != null ? line.group(1) : line.group(2));
        if (!value.lookingAt()) {
            return Optional.empty();
        }
        long amount = Long.parseLong(value.group(1));
        if (amount < 1) {
            return Optional.empty();
        }
        return Optional.of(Character.toLowerCase(value.group(2).charAt(0)) == 'd'
                ? Duration.ofDays(amount)
                : Duration.ofHours(amount));
    }

    /**
     * When an agent's spike in progress delivers (JAVA-878, Behavior "when the time box runs out, whatever exists
     * is delivered"): its time box after its run's start ({@link #runStart}), so a spike sent back and started
     * again gets a new box. Empty for any other card, a spike out of In progress, a {@code human} spike (a person's
     * work is never moved for them), and one whose time box does not parse. {@code moves} is only read when the
     * card has a box running.
     */
    public static Optional<Instant> timeBoxEndsAt(Card card, Supplier<List<DeliveryFlow.Move>> moves) {
        if (card.category() != Category.SPIKE || card.status() != Status.DOING || card.executor() == Executor.HUMAN) {
            return Optional.empty();
        }
        return timeBox(card.description()).map(box -> runStart(card.createdAt(), moves.get()).plus(box));
    }

    /** The comment a spike delivered by its time box gets: when the box started, its length and when it ended. */
    public static String timeBoxDelivered(Instant endsAt, Duration box) {
        long days = box.toDays();
        String length = box.equals(Duration.ofDays(days)) ? plural(days, "day") : plural(box.toHours(), "hour");
        return "Time box ended: " + length + " from " + endsAt.minus(box) + " (its last move into In progress) to "
                + endsAt + ". Moved to ready: delivered with what exists: the delivery analyst checks it against the "
                + "exit contract.";
    }

    private static String plural(long amount, String unit) {
        return amount + " " + unit + (amount == 1 ? "" : "s");
    }

    /** The comments posted at or after {@code since}: the ones this run wrote. */
    public static List<CardComment> commentsSince(Instant since, List<CardComment> comments) {
        return comments.stream().filter(c -> !c.createdAt().isBefore(since)).toList();
    }

    static boolean gated(ActorKind actor, Executor executor) {
        return actor == ActorKind.AGENT && executor != Executor.HUMAN;
    }
}
