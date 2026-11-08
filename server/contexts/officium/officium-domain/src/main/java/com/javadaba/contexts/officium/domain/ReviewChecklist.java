package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The rule checklist an agent's approval carries (JAVA-1563): a review's verdict on each engineering rule, written
 * as a table, one row per rule. An approval of an {@code ai} card (Review to Deploy or Done) is refused unless a
 * comment posted since the card last entered Review has a {@code Rules checked:} line and a table with a verdict on
 * a row, and none of its rows says {@code violated}: a violated rule is a send-back, not an approval. On a card with
 * the {@code touches-ui} signal the same comment names its captures with a {@code Screens:} line. The reviewer's
 * evidence is checked by the reviewer; the board checks the lines are there. A person is never refused.
 */
public final class ReviewChecklist {

    static final String RULES_CHECKED_LINE = "Rules checked:";

    /** The label on its own line or with the table after it, optionally a list item and optionally bold. */
    private static final Pattern RULES_CHECKED = Pattern.compile(
            "(?m)^\\s*(?:[-*]\\s+)?\\**Rules checked\\**:\\**.*$");
    private static final Pattern SCREENS = CategoryContracts.labeledLine("Screens");
    private static final Set<String> VERDICTS = Set.of("pass", "violated", "not verified", "not applicable");
    private static final String VIOLATED = "violated";

    /** One row of the table: the rule as written, and its verdict normalized (no bold, no code, lower case). */
    record Row(String rule, String verdict) {
    }

    private ReviewChecklist() {
    }

    /**
     * Refuses an agent's approval of an {@code ai} card unless its checklist is there. {@code commentsSinceReview} is
     * read only when the gate applies, since reading it costs the card's comments.
     */
    public static void require(ActorKind actor, Card card, Status to,
            Supplier<List<CardComment>> commentsSinceReview) {
        if (!ReviewQuality.isApproval(card.status(), to) || card.category() == Category.EPIC
                || !CategoryContracts.gated(actor, card.executor())) {
            return;
        }
        String checked = null;
        for (CardComment comment : commentsSinceReview.get()) {
            if (CategoryContracts.hasLine(RULES_CHECKED, comment.text())) {
                checked = comment.text();
            }
        }
        List<Row> rows = checked == null ? List.of() : rows(checked);
        if (rows.isEmpty()) {
            throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET, "review contract, exit: an approval "
                    + "records the rules checked. Comment on the card (cards.comment) a line `" + RULES_CHECKED_LINE
                    + "` then a table `| rule | pass / violated / not verified / not applicable | evidence |`, one row per "
                    + "rule, then move it to " + to.wire() + " again: no comment posted since it last entered Review "
                    + "has it. The board checks the lines are there; the reviewer checks the evidence is true.");
        }
        rows.stream().filter(row -> row.verdict().equals(VIOLATED)).findFirst().ifPresent(row -> {
            throw OfficiumException.conflict("review_rule_violated",
                    "a violated rule is a send-back: move it back with "
                            + "`reviewReturn` and `ruleViolations`, not an approval with a note. Violated: "
                            + row.rule());
        });
        boolean ui = card.signals() != null && card.signals().contains(Signal.TOUCHES_UI);
        if (ui && !CategoryContracts.hasLine(SCREENS, checked)) {
            throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET, "review contract, exit: a card that "
                    + "touches the UI needs the line `Screens:` in the same comment as `" + RULES_CHECKED_LINE + "`, "
                    + "naming the captures at a laptop and a phone viewport. Comment them, then move it to "
                    + to.wire() + " again.");
        }
    }

    /** When the review being closed started: the card's last move into Review, or its creation. */
    public static Instant reviewStart(Instant createdAt, List<DeliveryFlow.Move> moves) {
        Instant start = createdAt;
        for (DeliveryFlow.Move move : moves) {
            if (move.to() == Status.REVIEW && move.at().isAfter(start)) {
                start = move.at();
            }
        }
        return start;
    }

    /**
     * The table after the {@code Rules checked:} line: the blank lines before it skipped, then the consecutive lines
     * that start with a pipe. A row counts when its second cell is one of the verdicts, so the header and the
     * separator fall out by themselves.
     */
    static List<Row> rows(String comment) {
        List<Row> rows = new ArrayList<>();
        Matcher label = RULES_CHECKED.matcher(comment);
        if (!label.find()) {
            return rows;
        }
        List<String> lines = comment.substring(label.end()).lines().dropWhile(String::isBlank)
                .takeWhile(line -> line.trim().startsWith("|")).toList();
        for (String line : lines) {
            String[] cells = line.trim().split("\\|", -1);
            if (cells.length < 3) {
                continue;
            }
            String verdict = cells[2].replace("*", "").replace("`", "").trim().toLowerCase(Locale.ROOT);
            if (VERDICTS.contains(verdict)) {
                rows.add(new Row(cells[1].trim(), verdict));
            }
        }
        return rows;
    }
}
